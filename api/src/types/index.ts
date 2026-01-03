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

export type IZoneKind =
  | "zone"
  | "zone_nebula"
  | "zone_mines"
  | "zone_rocky"
  | "zone_icy"
  | "zone_crystal"
  | "zone_debris"
  | "zone_gas"
  | "zone_lava";

export type IObjectKind =
  | "jump_gate"
  | "jump_hole"
  | "lootable_wreck"
  | "lootable_depot"
  | "planet"
  | "station"
  | "star"
  | "mineable"
  | "generic";

export type IBaseKind = "planet" | "station" | "generic";

export type IZoneRes = Omit<IZone, "visit" | "properties" | "system"> & {
  visit?: BitmaskJSON<IZone["visit"]>;
  properties?: BitmaskJSON<IZone["properties"]>;
  system?: { nickname: string; name: string };
  kind: IZoneKind;
};

export type IObjectRes = Omit<
  IObject,
  "visit" | "properties" | "system" | "faction"
> & {
  visit?: BitmaskJSON<IZone["visit"]>;
  properties?: BitmaskJSON<IZone["properties"]>;
  system?: { nickname: string; name: string };
  faction?: { nickname: string; name: string };
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
  kind: IObjectKind;
};

export type IBaseRes = Omit<IBase, "visit" | "system" | "faction"> & {
  visit?: BitmaskJSON<IZone["visit"]>;
  system?: { nickname: string; name: string };
  faction?: { nickname: string; name: string };
  kind: IBaseKind;
};

export type ISystemRes = Omit<
  ISystem,
  "visit" | "zones" | "objects" | "bases" | "tradelanes" | "system" | "faction"
> & {
  visit?: BitmaskJSON<IZone["visit"]>;
  zones: IZoneRes[];
  objects: IObjectRes[];
  bases: IBaseRes[];
  kind: "system";
  tradelanes: Array<{
    startPosition: [number, number, number];
    endPosition: [number, number, number];
    rings: Array<{ nickname: string; position: [number, number, number] }>;
    faction?: string;
  }>;
};

export type IBarData = {
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
};

export type ISearchResult<
  T = IZoneRes | IObjectRes | (IBaseRes & IBarData) | ISystemRes,
> = T & {
  objectNickname: string;
  system: {
    nickname: string;
    name: string;
  };
  sector: string;
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

export type INpcRes = {
  level: number;
  rank: string;
  faction: IFaction;
  ship: IShip;
  loadout: {
    equipment: {
      equipment: IEquipment;
      hardpoint: string;
    }[];
    cargo: {
      equipment: IEquipment;
      count: number;
    }[];
  };
  pilot: string;
};

export type IShipRes = IShip & {
  loadout: Record<string, IEquipment>;
};
