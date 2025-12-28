import { DataContext, IBase, IObject, ISystem, IZone } from "fl-node-orm";
import { convertXmlToHtml } from "./rdl";
import { IniLoadout } from "fl-node-orm/dist/ini-types";
import { uniqBy } from "lodash";
import {
  IBaseKind,
  IBaseRes,
  IObjectKind,
  IObjectRes,
  ISystemRes,
  IZoneKind,
  IZoneRes,
} from "../types";

function getOptionalObject(nickname: string | undefined) {
  if (!nickname) {
    return undefined;
  }
  const exact =
    DataContext.INSTANCE.findByNickname("object", nickname) ||
    DataContext.INSTANCE.findByNickname("base", nickname) ||
    DataContext.INSTANCE.findByNickname("zone", nickname) ||
    DataContext.INSTANCE.entity("base").findFirst(
      (b) => b.objectNickname === nickname
    );
  return exact;
}

function getKnowledgeMapObjects(ids: number) {
  const map = DataContext.INSTANCE.ini("knowledgemap")
    ?.findAll("knowledgemaptable")
    ?.flatMap((t) => t.asArray("map")) as [number, string, number][];
  return uniqBy(
    map
      .filter(([id]) => id === ids)
      .map((r) => getOptionalObject(r[1]))
      .filter(Boolean)
      .map((o) => ({
        nickname: o!.nickname,
        name: o!.name,
        type: o!.type,
      })),
    "nickname"
  );
}

function getMissionRewardRange(min: number, max: number) {
  const diff2money = DataContext.INSTANCE.ini("diff2money")
    ?.findFirst("diff2money")
    ?.asArray("diff2money") as [diff: number, money: number][];
  const minMoney = diff2money.find(([diff]) => diff === min)?.[1];
  const maxMoney = diff2money.find(([diff]) => diff === max)?.[1];
  return [minMoney ?? 0, maxMoney ?? 0];
}

export const IGNORED_ARCHETYPES = [
  "trade_lane_ring",
  "nav_buoy",
  "wplatform",
  "small_wplatform",
  "space_tank",
  "dock_ring",
  "docking_fixture",
  /depot_.+/,
  "track_ring",
];

export const serializeSystem = (body: ISystem): ISystemRes => {
  return {
    type: "system",
    nickname: body.nickname,
    name: body.name,
    infocard: convertXmlToHtml(body.infocard),
    territory: body.territory,
    position: body.position,
    visit: body.visit.toJSON(),
    kind: "system",
    size: body.size,
    tradelanes: body.tradelanes.map((t) => ({
      startPosition: t.startPosition,
      endPosition: t.endPosition,
      rings: t.rings.map((r) => ({
        nickname: r.nickname,
        position: r.position,
      })),
      faction: t.faction,
    })),
    connections: Object.values(
      body.connections.reduce(
        (acc, c) => {
          if (c.system === body.nickname) {
            return acc;
          }

          if (acc[c.system] && acc[c.system].type !== c.type) {
            acc[c.system].type = "both";
          } else {
            acc[c.system] = {
              system: c.system,
              type: c.type,
            };
          }
          return acc;
        },
        {} as Record<
          string,
          { system: string; type: "jumpgate" | "jumphole" | "both" }
        >
      )
    ),
    zones: body.zones.map((z) => serializeObject(z)),
    objects: body.objects.map((o) => serializeObject(o)),
    bases: body.bases.map((b) => serializeObject(b)),
  };
};

export const fetchBarData = (body: IBase) => {
  const mbase = DataContext.INSTANCE.ini("mbases")?.findFirstWithChildren(
    "mbase",
    (e) => {
      return e.nickname === body.nickname;
    }
  );
  let bar: any;
  if (mbase && mbase[0]) {
    const factions = mbase[1].filter((s) => s.name === "basefaction");
    const totalMissionWeight = factions.reduce(
      (acc, s) => acc + ((s.raw.mission_type as any)?.[3] ?? 0),
      0
    );
    const missions = factions
      .filter((s) => s.raw.mission_type)
      .map((s) => ({
        faction: DataContext.INSTANCE.findByNickname(
          "faction",
          s.raw.faction as string
        ),
        difficulty: [
          (s.raw.mission_type as any)[1],
          (s.raw.mission_type as any)[2],
        ],
        probability: (s.raw.mission_type as any)[3] / totalMissionWeight,
        reward: getMissionRewardRange(
          (s.raw.mission_type as any)[1],
          (s.raw.mission_type as any)[2]
        ),
      }));
    const npcNicknames = factions.flatMap((s) => s.asArray("npc"));
    const npcs = mbase[1]
      .filter(
        (s) =>
          s.name === "gf_npc" &&
          npcNicknames.includes(s.nickname as string) &&
          s.raw.room === "bar"
      )
      .map((npc) => ({
        nickname: npc.nickname,
        name: DataContext.INSTANCE.ids(npc.raw.individual_name as number).split(
          "\n"
        )[1],
        faction: DataContext.INSTANCE.findByNickname(
          "faction",
          npc.raw.affiliation as string
        ),
        rumors: (
          (npc.asArray("rumor", true) ?? []) as [
            string,
            string,
            number,
            number,
          ][]
        ).map((r) => ({
          rumor: convertXmlToHtml(DataContext.INSTANCE.ids(r[3])),
          reputation:
            r[2] === 1 ? 0.2 : r[2] === 2 ? 0.4 : r[2] === 3 ? 0.6 : 0,
          objects: getKnowledgeMapObjects(r[3]).filter(
            (b) => b.nickname !== body.nickname
          ),
        })),
        knowledge: (
          (npc.asArray("know", true) ?? []) as [
            number,
            number,
            number,
            number,
          ][]
        ).map((k) => ({
          object: getKnowledgeMapObjects(k[1]).at(0),
          text: convertXmlToHtml(DataContext.INSTANCE.ids(k[0])),
          reputation:
            k[3] === 1 ? 0.2 : k[3] === 2 ? 0.4 : k[3] === 3 ? 0.6 : 0,
          price: k[2],
        })),
        missions: (
          (npc.asArray("misn", true) ?? []) as [string, number, number][]
        ).map((m) => ({
          faction: DataContext.INSTANCE.findByNickname(
            "faction",
            npc.raw.affiliation as string
          ),
          difficulty: [m[1], m[2]],
          reward: getMissionRewardRange(m[1], m[2]),
        })),
      }));

    bar = {
      missions,
      npcs,
    };
  }

  return bar;
};

export const calculateSector = (object: {
  position: [number, number, number];
  system: string;
}) => {
  const sectorsX = ["A", "B", "C", "D", "E", "F", "G", "H"];
  const sectorsZ = ["1", "2", "3", "4", "5", "6", "7", "8"];

  const [x, , z] = object.position;
  const system = DataContext.INSTANCE.entity("system").findByNickname(
    object.system
  );
  if (!system) {
    return "N/A";
  }
  const sectorSize = system.size / 8;
  const sectorX = x / sectorSize;
  const sectorZ = z / sectorSize;

  let horizontal: string;
  if (
    (sectorX % 1 < 0 && sectorX % 1 < -0.85) ||
    (sectorX % 1 >= 0 && sectorX % 1 < 0.15)
  ) {
    horizontal = `${sectorsX[3 + Math.floor(sectorX)]}/${sectorsX[4 + Math.floor(sectorX)]}`;
  } else if (
    (sectorX % 1 > 0 && sectorX % 1 > 0.85) ||
    (sectorX % 1 < 0 && sectorX % 1 > -0.15)
  ) {
    horizontal = `${sectorsX[4 + Math.floor(sectorX)]}/${sectorsX[5 + Math.floor(sectorX)]}`;
  } else {
    horizontal = sectorsX[4 + Math.floor(sectorX)];
  }
  let vertical: string;
  if (
    (sectorZ % 1 < 0 && sectorZ % 1 < -0.85) ||
    (sectorZ % 1 >= 0 && sectorZ % 1 < 0.15)
  ) {
    vertical = `${sectorsZ[3 + Math.floor(sectorZ)]}/${sectorsZ[4 + Math.floor(sectorZ)]}`;
  } else if (
    (sectorZ % 1 > 0 && sectorZ % 1 > 0.85) ||
    (sectorZ % 1 < 0 && sectorZ % 1 > -0.15)
  ) {
    vertical = `${sectorsZ[4 + Math.floor(sectorZ)]}/${sectorsZ[5 + Math.floor(sectorZ)]}`;
  } else {
    vertical = sectorsZ[4 + Math.floor(sectorZ)];
  }
  return `${horizontal}${vertical}`;
};

export const determineKind = (data: IObject | IBase | IZone) => {
  const loadoutCargo =
    "loadout" in data && data.loadout
      ? DataContext.INSTANCE.ini<{ loadout: IniLoadout }>("loadouts")
          ?.findByNickname("loadout", data.loadout)
          ?.asArray("cargo", true)
      : undefined;

  let kind = "generic";
  if (data.type === "zone") {
    kind = "zone";
    if (data.properties?.has("NEBULA")) {
      kind = "zone_nebula";
    } else if (data.properties?.has("MINES")) {
      kind = "zone_mines";
    } else if (
      data.properties?.has("ROCK") ||
      data.properties?.has("BADLANDS") ||
      data.properties?.has("NOMAD")
    ) {
      kind = "zone_rocky";
    } else if (data.properties?.has("ICE")) {
      kind = "zone_icy";
    } else if (data.properties?.has("CRYSTAL")) {
      kind = "zone_crystal";
    } else if (data.properties?.has("DEBRIS")) {
      kind = "zone_debris";
    } else if (data.properties?.has("GAS_POCKETS")) {
      kind = "zone_gas";
    } else if (data.properties?.has("LAVA")) {
      kind = "zone_lava";
    }
  } else if (
    data.archetype?.includes("jump") ||
    data.archetype?.includes("nomad_gate")
  ) {
    if (data.archetype.includes("gate")) {
      kind = `jump_gate`;
    } else {
      kind = "jump_hole";
    }
  } else if (
    data.archetype?.includes("surprise") ||
    data.archetype?.includes("suprise")
  ) {
    kind = "lootable_wreck";
  } else if (
    (data.archetype?.includes("depot_") ||
      data.archetype?.includes("space_industrial")) &&
    !!loadoutCargo?.length
  ) {
    kind = "lootable_depot";
  } else if (data.archetype?.includes("planet")) {
    kind = "planet";
  } else if (data.type === "base") {
    kind = "station";
  } else if (data.archetype?.includes("sun")) {
    kind = "star";
  } else if (
    data.archetype?.includes("mineable") &&
    !data.archetype?.includes("wplatform")
  ) {
    kind = "mineable";
  }

  return kind as IObjectKind | IBaseKind | IZoneKind;
};

export function serializeObject(body: IObject): IObjectRes;
export function serializeObject(body: IBase): IBaseRes;
export function serializeObject(body: IZone): IZoneRes;
export function serializeObject(
  body: IObject | IBase | IZone
): IObjectRes | IBaseRes | IZoneRes;
export function serializeObject(
  body: IObject | IBase | IZone
): IObjectRes | IBaseRes | IZoneRes {
  const system = DataContext.INSTANCE.findByNickname("system", body.system);
  const faction =
    "faction" in body && body.faction
      ? DataContext.INSTANCE.findByNickname("faction", body.faction)
      : undefined;

  let infocard = body.infocard;
  if ("infocards" in body) {
    infocard = body.infocards.map(convertXmlToHtml).join("<br>");
  } else if (body.infocard.includes("<RDL>")) {
    infocard = convertXmlToHtml(body.infocard);
  }
  let loadout;
  if ("loadout" in body && body.loadout) {
    const iniLoadout = DataContext.INSTANCE.ini<{ loadout: IniLoadout }>(
      "loadouts"
    )?.findByNickname("loadout", body.loadout);
    loadout = {
      equipment: iniLoadout
        ?.asArray("equip", true)
        .map(([nickname, hardpoint]) => ({
          equipment: DataContext.INSTANCE.findByNickname("equipment", nickname),
          hardpoint,
        })),
      cargo: iniLoadout?.asArray("cargo", true).map(([nickname, count]) => ({
        equipment: DataContext.INSTANCE.findByNickname("equipment", nickname),
        count,
      })),
    };
  }
  if ("archetype" in body && body.archetype?.includes("depot_")) {
    const loadoutKey = DataContext.INSTANCE.ini("solars")
      ?.findByNickname("solar", body.archetype)
      ?.get("loadout") as string;
    if (loadoutKey) {
      const iniLoadout = DataContext.INSTANCE.ini<{ loadout: IniLoadout }>(
        "loadouts"
      )?.findByNickname("loadout", loadoutKey);
      loadout = {
        equipment: iniLoadout
          ?.asArray("equip", true)
          .map(([nickname, hardpoint]) => ({
            equipment: DataContext.INSTANCE.findByNickname(
              "equipment",
              nickname
            ),
            hardpoint,
          })),
        cargo: iniLoadout?.asArray("cargo", true).map(([nickname, count]) => ({
          equipment: DataContext.INSTANCE.findByNickname("equipment", nickname),
          count,
        })),
      };
    }
  }

  return {
    ...body,
    infocard,
    system: system
      ? {
          nickname: system.nickname,
          name: system.name,
        }
      : undefined,
    ...("faction" in body && {
      faction: faction
        ? {
            nickname: faction.nickname,
            name: faction.name,
          }
        : undefined,
    }),
    ...("objectNickname" in body && { objectNickname: body.objectNickname }),
    ...("loadout" in body && { loadout }),
    ...(body.position &&
      body.system && {
        sector: calculateSector({
          position: body.position,
          system: body.system,
        }),
      }),
    kind: determineKind(body),
  } as IObjectRes | IBaseRes | IZoneRes;
}

export const deepParseInfocards = <T extends Record<string, any>>(
  obj: T
): T => {
  const result = { ...obj };
  for (const key in result) {
    if (typeof result[key] === "string" && result[key].includes("<RDL>")) {
      result[key] = convertXmlToHtml(obj[key]) as T[Extract<keyof T, string>];
    } else if (typeof obj[key] === "object") {
      if (Array.isArray(obj[key])) {
        result[key] = obj[key].map((item: any) =>
          typeof item === "string" && item.includes("<RDL>")
            ? convertXmlToHtml(item)
            : typeof item === "object"
              ? deepParseInfocards(item)
              : item
        );
      } else {
        result[key] = deepParseInfocards(obj[key]);
      }
    }
  }
  return result;
};
