import express from "express";
import cors from "cors";
import { DataContext } from "fl-node-orm";
import system from "./routers/system.router";
import texture from "./routers/texture.router";
import search from "./routers/search.router";
import { readFile } from "fs/promises";
import { initializeImageMagick } from "@imagemagick/magick-wasm";

const app = express();

app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/system", system);
app.use("/texture", texture);
app.use("/search", search);

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
