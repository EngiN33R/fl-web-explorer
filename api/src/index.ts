import express from "express";
import cors from "cors";
import { DataContext } from "fl-node-orm";
import navigation from "./routers/navigation.router";
import assets from "./routers/assets.router";
import equipment from "./routers/equipment.router";
import economy from "./routers/economy.router";
import loadoutRouter from "./routers/loadout.router";
import ai from "./routers/ai.router";
import { readFile } from "fs/promises";
import { initializeImageMagick } from "@imagemagick/magick-wasm";
import {
  IniNpcShip,
  IniLoadout,
  IniFactionProp,
} from "fl-node-orm/dist/ini-types";

const app = express();

app.use(cors());
app.set("query parser", "extended");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/ids/:label", async (req, res) => {
  const label = DataContext.INSTANCE.findLabel(req.params.label);
  res.json({ label });
});
app.get("/npc/:nickname", async (req, res) => {
  const npcshiparch = DataContext.INSTANCE.ini<{ npcshiparch: IniNpcShip }>(
    "npcships",
  )?.findByNickname("npcshiparch", req.params.nickname);
  const level = Number(npcshiparch?.get("level")?.replace("d", ""));
  const ship = DataContext.INSTANCE.entity("ship").findByNickname(
    npcshiparch?.get("ship_archetype") ?? "",
  );
  const loadout = DataContext.INSTANCE.ini<{ loadout: IniLoadout }>(
    "loadouts",
  )?.findByNickname("loadout", npcshiparch?.get("loadout") ?? "");
  const factionProps = DataContext.INSTANCE.ini<{
    factionprops: IniFactionProp;
  }>("faction_prop")?.findFirst("factionprops", (s) =>
    s.asArray("npc_ship").includes(req.params.nickname),
  );
  const faction = DataContext.INSTANCE.entity("faction").findByNickname(
    factionProps?.get("affiliation") ?? "",
  );
  const rankDesig = factionProps?.get("rank_desig");
  let rank: string | undefined;
  if (rankDesig) {
    if (level < rankDesig[3]) {
      rank = DataContext.INSTANCE.ids(rankDesig[0]);
    } else if (level < rankDesig[4]) {
      rank = DataContext.INSTANCE.ids(rankDesig[1]);
    } else {
      rank = DataContext.INSTANCE.ids(rankDesig[3]);
    }
  }

  res.json({
    level,
    rank,
    faction,
    ship,
    loadout: {
      nickname: loadout?.get("nickname"),
      equip:
        loadout?.asArray("equip", true).map(([equipment, hardpoint]) => ({
          equipment:
            DataContext.INSTANCE.entity("equipment").findByNickname(equipment),
          hardpoint,
        })) ?? [],
      cargo:
        loadout?.asArray("cargo", true).map(([cargo, count]) => ({
          cargo: DataContext.INSTANCE.entity("equipment").findByNickname(cargo),
          count,
        })) ?? [],
    },
    pilot: npcshiparch?.get("pilot"),
  });
});

app.use("/nav", navigation);
app.use("/equip", equipment);
app.use("/assets", assets);
app.use("/economy", economy);
app.use("/loadout", loadoutRouter);
app.use("/ai", ai);
async function bootstrap() {
  await DataContext.load(process.env.FL_ROOT as string);
  const imWasmBytes = await readFile(
    "node_modules/@imagemagick/magick-wasm/dist/magick.wasm",
  );
  await initializeImageMagick(imWasmBytes);
}

bootstrap().then(() => {
  const port = Number(process.env.PORT) || 3000;
  app.listen(port, () => {
    console.log(`Listening on port ${port}`);
  });
});

export * from "./types/index";
