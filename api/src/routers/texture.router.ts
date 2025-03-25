import { Router } from "express";
import { DataContext } from "fl-node-orm";
import { tgaToPng } from "../util/tga.ts";

const router = Router();

const textureCache: Record<string, Buffer> = {};
const textureOpts: Record<string, Record<string, unknown>> = {
  navmap: { vFlip: true },
};

router.get("/:id", async (req, res) => {
  const { id } = req.params;
  const data = DataContext.INSTANCE.binary(id);
  if (!data) {
    res.status(404).send("Not found");
    return;
  }
  if (!textureCache[id]) {
    textureCache[id] = await tgaToPng(id, data, textureOpts[id]);
  }
  res.type("png").header("Content-Disposition", `inline; filename="${id}.png"`);
  res.send(textureCache[id]);
});

export default router;
