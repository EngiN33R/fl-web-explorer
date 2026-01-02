import { Router } from "express";
import { DataContext } from "fl-node-orm";

const market = DataContext.INSTANCE.market;

const router = Router();

router.get("/offers/:baseId", async (req, res) => {
  const baseId = req.params.baseId;
  const offers = market.getGoods(baseId);
  res.json(
    offers.map((o) => ({
      ...o,
      equipment:
        DataContext.INSTANCE.entity("equipment").findByNickname(o.equipment) ||
        DataContext.INSTANCE.entity("ship").findByNickname(o.equipment),
      nickname: o.equipment,
    }))
  );
});

router.get("/sold-at/:equipmentId", async (req, res) => {
  const equipmentId = req.params.equipmentId;
  const offers = market.getSoldAt(equipmentId);
  res.json(offers);
});

export default router;
