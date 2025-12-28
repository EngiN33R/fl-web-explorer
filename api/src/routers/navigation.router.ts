import { Router } from "express";
import { DataContext, IBase, IObject, ISystem, IZone } from "fl-node-orm";
import {
  calculateSector,
  fetchBarData,
  serializeObject,
  serializeSystem,
} from "../util/common";
import { convertXmlToHtml } from "../util/rdl";

const IGNORED_ARCHETYPES = [
  "trade_lane_ring",
  "nav_buoy",
  "wplatform",
  "small_wplatform",
  "dock_ring",
  "docking_fixture",
  "track_ring",
];

const router = Router();

router.get("/system", async (req, res) => {
  const systems = DataContext.INSTANCE.entity("system").findAll();

  const result = systems
    .filter((s) => s.nickname !== "fp7_system" && !!s.position)
    .map((s) => serializeSystem(s));
  res.json(result);
});

router.get("/system/:nickname", async (req, res) => {
  const { nickname } = req.params;
  const system = DataContext.INSTANCE.entity("system").findByNickname(nickname);
  if (!system) {
    res.status(404).send("Not found");
    return;
  }
  res.json(serializeSystem(system));
});

router.get("/search", async (req, res) => {
  const objects = DataContext.INSTANCE.entity("object").findAll();
  const bases = DataContext.INSTANCE.entity("base").findAll();
  const zones = DataContext.INSTANCE.entity("zone").findAll();

  const search = (req.query.q as string).toLowerCase();

  const eligible = [
    ...objects.filter(
      (o) => !IGNORED_ARCHETYPES.some((a) => !!o.archetype?.match(a))
    ),
    ...bases,
    ...zones,
  ].map((e) => serializeObject(e));

  let exact: ISystem | IObject | IBase | IZone | undefined;
  exact = DataContext.INSTANCE.findByNickname("system", search);
  if (exact) {
    res.json([
      {
        ...serializeSystem(exact),
        relevance: 1000,
      },
    ]);
    return;
  }
  exact =
    DataContext.INSTANCE.findByNickname("base", search) ||
    DataContext.INSTANCE.findByNickname("object", search) ||
    DataContext.INSTANCE.findByNickname("zone", search);
  if (exact) {
    res.json([
      {
        ...serializeObject(exact),
        ...fetchBarData(exact as IBase),
        relevance: 1000,
      },
    ]);
    return;
  }

  const relevance: [index: number, relevance: number][] = eligible.map(
    (e, idx) => [
      idx,
      [
        e.type === "base" ? 1 : 0,
        e.name.toLowerCase().replace("the", "").trim().startsWith(search)
          ? 3
          : 0,
        e.name.toLowerCase().includes(search) ? 2 : 1,
        typeof e.nickname === "string" &&
        e.nickname?.toLowerCase().includes(search)
          ? 0.5
          : 0,
        e.infocard.toLowerCase().includes(search) ? 0.5 : 0,
        e.system?.name.toLowerCase().includes(search) ? 0.5 : 0,
        e.system?.nickname?.startsWith("st") ? -10 : 0,
        "archetype" in e && e.archetype?.includes("jump") ? -1 : 0,
      ]
        .map(Number)
        .reduce((a, b) => a + b, 0),
    ]
  );

  res.json(
    relevance
      .filter((r) => r[1] && r[1] > 2)
      .sort((a, b) => b[1] - a[1])
      .map((r) => {
        const body = eligible[r[0]];
        return {
          ...body,
          objectNickname:
            "objectNickname" in body
              ? (body.objectNickname ?? body.nickname)
              : body.nickname,
          relevance: r[1],
        };
      })
      .slice(0, 50)
  );
});

router.get("/path", async (req, res) => {
  const { from, to } = req.query as { from: string; to: string };
  const fromLocation =
    DataContext.INSTANCE.findByNickname("object", from) ||
    DataContext.INSTANCE.findByNickname("base", from);
  const toLocation =
    DataContext.INSTANCE.findByNickname("object", to) ||
    DataContext.INSTANCE.entity("base").findFirst(
      (e) => e.objectNickname === to
    );
  if (!fromLocation || !toLocation) {
    res.status(404).send("Not found");
    return;
  }
  const path = DataContext.INSTANCE.pathfinder.findPath(
    {
      position: fromLocation.position,
      system: fromLocation.system,
      object: fromLocation.nickname,
      faction: fromLocation.faction,
    },
    {
      position: toLocation.position,
      system: toLocation.system,
      object: toLocation.nickname,
      faction: toLocation.faction,
    }
  );
  res.json({
    waypoints: path.map((w) => ({
      ...w,
      from: {
        ...w.from,
        sector: calculateSector(w.from),
      },
      to: {
        ...w.to,
        sector: calculateSector(w.to),
      },
    })),
  });
});

export default router;
