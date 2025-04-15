// import TGA from "tga";
// import { PNG } from "pngjs";
import { spawn, spawnSync } from "child_process";
import { createHash } from "crypto";
import { existsSync } from "fs";
import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";

export type TgaOpts = {
  vFlip?: boolean;
  static?: boolean;
};

export async function tgaToPng(
  id: string,
  data: ArrayBuffer,
  opts: TgaOpts = {}
): Promise<Buffer | undefined> {
  const hash = createHash("shake256", { outputLength: 16 })
    .update(Buffer.from(data))
    .digest()
    .toString("hex");
  const dstPath = path.join(tmpdir(), "flwe", `${hash}.png`);
  await mkdir(path.dirname(dstPath), { recursive: true });
  if (existsSync(dstPath)) {
    return readFile(dstPath);
  }
  if (opts.static) {
    return Promise.resolve(undefined);
  }

  const srcPath = path.join(tmpdir(), "flwe", `${id}.tga`);
  if (!existsSync(srcPath)) {
    await writeFile(srcPath, Buffer.from(data));
  }

  return new Promise((resolve, reject) => {
    const result = spawnSync(`magick identify ${srcPath}`, { shell: true });
    const results = result.output?.toString()?.split(" ") ?? [];
    const format = results[1];
    let vFlip = false;
    if (opts.vFlip != null) {
      vFlip = opts.vFlip;
    } else {
      vFlip = format === "DDS";
    }

    spawn(`magick ${srcPath} ${opts.vFlip ? "-flip" : ""} ${dstPath}`, {
      shell: true,
    }).on("exit", (code) => {
      if (code !== 0) {
        reject(new Error(`Magick exited with code ${code}`));
      }
      readFile(dstPath).then(resolve);
    });
  });
}
