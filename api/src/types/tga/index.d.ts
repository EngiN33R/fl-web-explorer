declare module "tga" {
  export function createTgaBuffer(data: Buffer): Buffer;

  export class TGA {
    constructor(data: Buffer, opt?: { dontFixAlpha?: boolean });
    header: { width: number; height: number };
    width: number;
    height: number;
    pixels: Uint8Array;
  }

  export default TGA;
}
