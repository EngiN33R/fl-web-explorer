import { Router } from "express";
import { DataContext } from "fl-node-orm";
import { serializeObject, serializeSystem } from "../util/common";
import { convertXmlToHtml } from "../util/rdl";

const IGNORED_ARCHETYPES = [
  "trade_lane_ring",
  "nav_buoy",
  "wplatform",
  "space_tank",
  "dock_ring",
  "docking_fixture",
  /depot_.+/,
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
  res.json({
    ...system,
    infocard: convertXmlToHtml(system.infocard),
  });
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

  let exact: any = DataContext.INSTANCE.findByNickname("system", search);
  if (exact) {
    res.json([
      {
        ...serializeSystem(exact),
        type: "system",
        relevance: 1000,
      },
    ]);
    return;
  }
  exact = eligible.find((e) => e.nickname === search);
  if (exact) {
    res.json([
      {
        ...exact,
        relevance: 1000,
      },
    ]);
    return;
  }

  const relevance = eligible.map((e, idx) => [
    idx,
    [
      e.type === "base" ? 1 : 0,
      e.name.toLowerCase().replace("the", "").trim().startsWith(search) ? 3 : 0,
      e.name.toLowerCase().includes(search) ? 2 : 1,
      typeof e.nickname === "string" &&
      e.nickname?.toLowerCase().includes(search)
        ? 0.5
        : 0,
      e.infocard.toLowerCase().includes(search) ? 0.5 : 0,
      e.system ? Number(e.system.name.toLowerCase().includes(search)) * 0.5 : 0,
      e.system?.nickname?.startsWith("st") ? -10 : 0,
      "archetype" in e && e.archetype?.includes("jump") ? -1 : 0,
    ]
      .map(Number)
      .reduce((a, b) => a + b, 0),
  ]);

  res.json(
    relevance
      .filter((r) => r[1])
      .sort((a, b) => b[1] - a[1])
      .map((r) => {
        const body = eligible[r[0]];
        return {
          ...body,
          relevance: r[1],
        };
      })
      .slice(0, 50)
  );
});

export default router;
