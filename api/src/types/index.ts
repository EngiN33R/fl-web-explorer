import type { Bitmask, IBase, IObject, ISystem, IZone } from "fl-node-orm";

type BitmaskJSON<B extends Bitmask<string> | undefined> =
  NonNullable<B> extends Bitmask<infer T> ? Array<T> : Array<unknown>;

export type IZoneRes = Omit<IZone, "visit" | "properties"> & {
  visit?: BitmaskJSON<IZone["visit"]>;
  properties?: BitmaskJSON<IZone["properties"]>;
};

export type IObjectRes = Omit<IObject, "visit" | "properties"> & {
  visit?: BitmaskJSON<IZone["visit"]>;
  properties?: BitmaskJSON<IZone["properties"]>;
};

export type IBaseRes = Omit<IBase, "visit"> & {
  visit?: BitmaskJSON<IZone["visit"]>;
};

export type ISystemRes = Omit<
  ISystem,
  "visit" | "zones" | "objects" | "bases"
> & {
  visit?: BitmaskJSON<IZone["visit"]>;
  zones: IZoneRes[];
  objects: IObjectRes[];
  bases: IBaseRes[];
};

export type ISearchResult = (IZoneRes | IObjectRes | IBaseRes) & {
  system: ISystemRes;
  relevance: number;
};
