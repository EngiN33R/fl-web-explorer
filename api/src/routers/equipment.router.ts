import { Router } from "express";
import { DataContext } from "fl-node-orm";
import { deepParseInfocards } from "../util/common";

const equipment = DataContext.INSTANCE.entity("equipment");
const ship = DataContext.INSTANCE.entity("ship");

const router = Router();

router.get("/search", async (req, res) => {
  const search = (req.query.q as string)?.toLowerCase() ?? "";
  const { kind, hardpoint, soldBy, soldIn, soldAt, limit } =
    req.query as Record<string, string>;

  const exact = search ? equipment.findAll() : equipment.findByNickname(search);
  if (exact) {
    res.json([
      {
        ...exact,
        relevance: 1000,
      },
    ]);
    return;
  }

  const eligible = equipment.findAll((e) => {
    if (!e.nickname || e.nickname.includes("_rtc")) {
      return false;
    }
    if (kind && e.kind !== kind) {
      return false;
    }
    if (hardpoint && e.hardpoint !== hardpoint) {
      return false;
    }
    const sellingBases = DataContext.INSTANCE.market
      .getSoldAt(e.nickname)
      .map((base) => DataContext.INSTANCE.entity("base").findByNickname(base));
    if (soldBy && !sellingBases.some((b) => b?.faction === soldBy)) {
      return false;
    }
    if (soldIn && !sellingBases.some((b) => b?.system === soldIn)) {
      return false;
    }
    if (soldAt && !sellingBases.some((b) => b?.nickname === soldAt)) {
      return false;
    }
    return true;
  });
  const relevance = eligible.map((e, idx) => [
    idx,
    [
      e.name.toLowerCase().replace("the", "").trim().startsWith(search) ? 3 : 0,
      e.name.toLowerCase().includes(search) ? 2 : 1,
      typeof e.nickname === "string" &&
      e.nickname?.toLowerCase().includes(search)
        ? 0.5
        : 0,
      e.infocard.toLowerCase().includes(search) ? 0.5 : 0,
    ]
      .map(Number)
      .reduce((a, b) => a + b, 0),
  ]);

  let result = relevance
    .filter((r) => r[1])
    .sort((a, b) => b[1] - a[1])
    .map((r) => {
      const body = eligible[r[0]];
      return deepParseInfocards({
        ...body,
        relevance: r[1],
      });
    });
  if (limit !== "0") {
    result = result.slice(0, Number(limit || "50"));
  }
  res.json(result);
});

router.get("/ship", (req, res) => {
  const ships = ship.findAll();
  // console.log(ships.filter((s) => s.name.toLowerCase().includes("falcon")));
  const available = ships.filter(
    (s) => DataContext.INSTANCE.market.getSoldAt(s.nickname).length > 0
  );
  res.json(available);
});

router.get("/ship/:id", (req, res) => {
  res.json(ship.findByNickname(req.params.id));
});

router.get("/:id", (req, res) => {
  res.json(equipment.findByNickname(req.params.id));
});

export default router;
