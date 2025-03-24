import express from "express";
import { DataContext } from "fl-node-orm";
import { tgaToPng } from "./util/tga.ts";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/system", async (req, res) => {
  const systems = DataContext.INSTANCE.entity("system").findAll();

  const result = systems
    .filter((s) => s.nickname !== "fp7_system" && !!s.position)
    .map((s) => ({
      nickname: s.nickname,
      name: s.name,
      infocard: s.infocard,
      position: s.position,
      visit: s.visit,
      connections: Object.values(
        s.connections.reduce(
          (acc, c) => {
            if (c.system === s.nickname) {
              return acc;
            }

            if (acc[c.system] && acc[c.system].type !== c.type) {
              acc[c.system].type = "both";
            } else {
              acc[c.system] = {
                system: c.system,
                type: c.type,
              };
            }
            return acc;
          },
          {} as Record<
            string,
            { system: string; type: "jumpgate" | "jumphole" | "both" }
          >
        )
      ),
    }));
  res.json(result);
});

app.get("/system/:nickname", async (req, res) => {
  const { nickname } = req.params;
  const system = DataContext.INSTANCE.entity("system").findByNickname(nickname);
  if (!system) {
    res.status(404).send("Not found");
    return;
  }
  res.json(system);
});

const textureCache: Record<string, Buffer> = {};
const textureOpts: Record<string, Record<string, unknown>> = {
  navmap: { vFlip: true },
};

app.get("/texture/:id", async (req, res) => {
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

DataContext.load(process.env.FL_ROOT as string).then(() => {
  const port = Number(process.env.PORT) || 3000;
  app.listen(port, () => {
    console.log(`Listening on port ${port}`);
  });
});
