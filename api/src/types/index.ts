import type {
  Bitmask,
  IBase,
  IEquipment,
  IFaction,
  IObject,
  IShip,
  ISystem,
  IZone,
  NavigationWaypoint,
} from "fl-node-orm";

type BitmaskJSON<B extends Bitmask<string> | undefined> =
  NonNullable<B> extends Bitmask<infer T> ? Array<T> : Array<unknown>;

export type IZoneRes = Omit<IZone, "visit" | "properties"> & {
  visit?: BitmaskJSON<IZone["visit"]>;
  properties?: BitmaskJSON<IZone["properties"]>;
};

export type IObjectRes = Omit<IObject, "visit" | "properties"> & {
  visit?: BitmaskJSON<IZone["visit"]>;
  properties?: BitmaskJSON<IZone["properties"]>;
  loadout?: {
    equipment: {
      equipment: IEquipment;
      hardpoint: string;
    }[];
    cargo: {
      equipment: IEquipment;
      count: number;
    }[];
  };
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
  objectNickname: string;
  system: {
    nickname: string;
    name: string;
  };
  sector: string;
  missions: Array<{
    faction: IFaction;
    difficulty: [number, number];
    reward: [number, number];
  }>;
  npcs: Array<{
    faction: IFaction;
    nickname: string;
    name: string;
    text: string;
    rumors: Array<{
      rumor: string;
      reputation: number;
      objects: (IZoneRes | IObjectRes | IBaseRes)[];
    }>;
    knowledge: Array<{
      object: IZoneRes | IObjectRes | IBaseRes;
      text: string;
      reputation: number;
      price: number;
    }>;
    missions: Array<{
      faction: IFaction;
      difficulty: [number, number];
      reward: [number, number];
    }>;
  }>;
  relevance: number;
};

export type IMarketOfferRes = {
  equipment: IEquipment | IShip;
  price: number;
  basePrice: number;
  sold: boolean;
  rep: number;
};

export type IWaypointRes = NavigationWaypoint & {
  from: NavigationWaypoint["from"] & {
    sector: string;
  };
  to: NavigationWaypoint["to"] & {
    sector: string;
  };
};
