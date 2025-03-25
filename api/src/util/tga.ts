// import TGA from "tga";
// import { PNG } from "pngjs";
import { spawn, spawnSync } from "child_process";
import { createHash } from "crypto";
import { existsSync } from "fs";
import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";

export async function tgaToPng(
  id: string,
  data: ArrayBuffer,
  opts: { vFlip?: boolean } = {}
): Promise<Buffer> {
  const srcPath = path.join(tmpdir(), "flwe", `${id}.tga`);
  const hash = createHash("shake256", { outputLength: 16 })
    .update(Buffer.from(data))
    .digest()
    .toString("hex");
  const dstPath = path.join(tmpdir(), "flwe", `${hash}.png`);
  await mkdir(path.dirname(dstPath), { recursive: true });
  if (existsSync(dstPath)) {
    return readFile(dstPath);
  }
  if (!existsSync(srcPath)) {
    await writeFile(srcPath, Buffer.from(data));
  }

  return new Promise((resolve, reject) => {
    spawn(`magick ${srcPath} -flip ${dstPath}`, { shell: true }).on(
      "exit",
      (code) => {
        if (code !== 0) {
          reject(new Error(`Magick exited with code ${code}`));
        }
        readFile(dstPath).then(resolve);
      }
    );
  });
}
