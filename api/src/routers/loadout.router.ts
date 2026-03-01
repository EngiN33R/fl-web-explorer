import { Router } from "express";
import { DataContext } from "fl-node-orm";
import { decompress } from "lz4-wasm-nodejs";
import { ILoadoutRes } from "../types";
import { calculateLoadoutStats } from "../util/loadout";
import { deepParseInfocards, serializeShip } from "../util/common";

const equipment = DataContext.INSTANCE.entity("equipment");
const ship = DataContext.INSTANCE.entity("ship");
const dec = new TextDecoder("utf-8");

const decode = (code: string) => {
  const lean = dec.decode(decompress(Buffer.from(code, "base64")));
  return JSON.parse(lean);
};

const router = Router();

router.post("/stats", async (req, res) => {
  const loadout = req.body as ILoadoutRes;
  res.json(calculateLoadoutStats(loadout));
});

router.post("/decode", async (req, res) => {
  const { code } = req.body as { code: string };
  const lean = decode(code as string) as {
    ship: string;
    equipment: Record<string, string>;
  };
  const ship = lean.ship
    ? DataContext.INSTANCE.entity("ship").findByNickname(lean.ship)
    : undefined;
  const enriched = {
    ship: ship ? serializeShip(ship) : undefined,
    equipment: Object.fromEntries(
      Object.entries(lean.equipment).map(([hp, nickname]) => {
        const equipment =
          DataContext.INSTANCE.entity("equipment").findByNickname(nickname);
        const procurement =
          DataContext.INSTANCE.procurer.getProcurementDetails(nickname);

        return [
          hp,
          deepParseInfocards({
            ...equipment,
            obtainable: procurement,
          }),
        ];
      }),
    ),
  };
  res.json(enriched);
});

export default router;
