import { Response, Router } from "express";
import { DataContext } from "fl-node-orm";
import { TgaOpts, tgaToPng } from "../util/tga";

const router = Router();

const textureCache: Record<string, Buffer> = {};
const textureOpts: Record<string, TgaOpts> = {
  navmap: { vFlip: true },
};

async function serveTexture(
  id: string | undefined,
  res: Response,
  opts?: TgaOpts
) {
  if (!id) {
    res.status(404).send("Not found");
    return;
  }
  const data = DataContext.INSTANCE.binary(id);
  if (!data) {
    res.status(404).send("Not found");
    return;
  }
  if (!textureCache[id]) {
    const tex = await tgaToPng(id, data, opts ?? textureOpts[id]);
    if (tex) {
      textureCache[id] = tex;
    } else {
      res.status(404).send("Not found");
      return;
    }
  }
  res.type("png").header("Content-Disposition", `inline; filename="${id}.png"`);
  res.send(textureCache[id]);
}

router.get("/texture/:id", async (req, res) => {
  const { id } = req.params;
  await serveTexture(id, res);
});

router.get("/icon/market/:id", async (req, res) => {
  const { id } = req.params;
  await serveTexture(`${id}_icon`, res, { vFlip: false });
});

export default router;
