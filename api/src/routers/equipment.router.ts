import { Router } from "express";
import { DataContext } from "fl-node-orm";
import { deepParseInfocards, serializeShip } from "../util/common";
import { IniShipGood, IniShipHullGood } from "fl-node-orm/dist/ini-types";
import { IEquipmentRes } from "../types";
import { sortBy } from "lodash";

const equipment = DataContext.INSTANCE.entity("equipment");
const ship = DataContext.INSTANCE.entity("ship");

const router = Router();

router.get("/search", async (req, res) => {
  const search = (req.query.q as string)?.toLowerCase() ?? "";
  const { kind, soldBy, soldIn, soldAt, limit, obtainable } =
    req.query as Record<string, string>;

  const hardpoints = req.query.hardpoint
    ? (req.query.hardpoint as string[])
    : undefined;
  const sources = req.query.sources
    ? (req.query.sources as string[])
    : undefined;

  const exact = search ? equipment.findAll() : equipment.findByNickname(search);
  if (exact) {
    res.json(Array.isArray(exact) ? exact : [exact]);
    return;
  }

  let result: IEquipmentRes[] = [];

  for (const e of equipment.findAll()) {
    if (!e.nickname || e.nickname.includes("_rtc")) {
      continue;
    }
    if (kind && e.kind !== kind) {
      continue;
    }
    if (hardpoints && (!e.hardpoint || !hardpoints.includes(e.hardpoint))) {
      continue;
    }
    const procurement = DataContext.INSTANCE.procurer.getProcurementDetails(
      e.nickname,
    );
    if (obtainable && !procurement.length) {
      continue;
    }
    if (
      sources &&
      !sources.some((s) => procurement.some((p) => p.type === s))
    ) {
      continue;
    }
    const sellingBases = DataContext.INSTANCE.market
      .getSoldAt(e.nickname)
      .map((base) => DataContext.INSTANCE.entity("base").findByNickname(base));
    if (soldBy && !sellingBases.some((b) => b?.faction === soldBy)) {
      continue;
    }
    if (soldIn && !sellingBases.some((b) => b?.system === soldIn)) {
      continue;
    }
    if (soldAt && !sellingBases.some((b) => b?.nickname === soldAt)) {
      continue;
    }
    let relevance = 0;
    if (search) {
      if (e.name.toLowerCase().replace("the", "").trim().startsWith(search)) {
        relevance += 3;
      }
      if (e.name.toLowerCase().includes(search)) {
        relevance += 2;
      }
      if (
        typeof e.nickname === "string" &&
        e.nickname?.toLowerCase().includes(search)
      ) {
        relevance += 0.5;
      }
      if (e.infocard.toLowerCase().includes(search)) {
        relevance += 0.5;
      }
      if (relevance === 0) {
        continue;
      }
    }
    result.push(
      deepParseInfocards({
        ...e,
        obtainable: procurement,
        relevance,
      }),
    );
  }

  result = sortBy(result, "relevance").reverse();
  if (limit !== "0") {
    result = result.slice(0, Number(limit || "50"));
  }
  res.json(result);
});

router.get("/ship", (req, res) => {
  const ships = ship.findAll();
  // console.log(ships.filter((s) => s.name.toLowerCase().includes("falcon")));
  const available = ships
    .filter((s) => DataContext.INSTANCE.market.getSoldAt(s.nickname).length > 0)
    .map((s) => serializeShip(s));
  res.json(available);
});

router.get("/ship/:id", (req, res) => {
  res.json(ship.findByNickname(req.params.id));
});

router.get("/:id", (req, res) => {
  const eq = equipment.findByNickname(req.params.id);
  if (!eq) {
    res.status(404).json({ error: `Equipment ${req.params.id} not found` });
    return;
  }
  res.json(
    deepParseInfocards({
      ...eq,
      obtainable: DataContext.INSTANCE.procurer.getProcurementDetails(
        eq.nickname,
      ),
    }),
  );
});

export default router;
