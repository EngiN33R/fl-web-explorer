import { Router } from "express";
import { DataContext } from "fl-node-orm";
import { serializeSystem } from "../util/common";
import { convertXmlToHtml } from "../util/rdl";

const router = Router();

router.get("/", async (req, res) => {
  const systems = DataContext.INSTANCE.entity("system").findAll();

  const result = systems
    .filter((s) => s.nickname !== "fp7_system" && !!s.position)
    .map((s) => serializeSystem(s));
  res.json(result);
});

router.get("/:nickname", async (req, res) => {
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

export default router;
