declare module "tga-js" {
  export class TgaLoader {
    constructor();
    load(data: Uint8Array): Promise<void>;
    getImageData(obj?: ImageData): ImageData;
  }

  export default TgaLoader;
}
