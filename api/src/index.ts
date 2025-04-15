import express from "express";
import cors from "cors";
import { DataContext } from "fl-node-orm";
import navigation from "./routers/navigation.router";
import assets from "./routers/assets.router";
import equipment from "./routers/equipment.router";
import economy from "./routers/economy.router";
import { readFile } from "fs/promises";
import { initializeImageMagick } from "@imagemagick/magick-wasm";

const app = express();

app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/nav", navigation);
app.use("/equip", equipment);
app.use("/assets", assets);
app.use("/economy", economy);

async function bootstrap() {
  await DataContext.load(process.env.FL_ROOT as string);
  const imWasmBytes = await readFile(
    "node_modules/@imagemagick/magick-wasm/dist/magick.wasm"
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
