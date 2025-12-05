import { DataContext, IBase, IObject, ISystem, IZone } from "fl-node-orm";
import { convertXmlToHtml } from "./rdl";
import { IniLoadout } from "fl-node-orm/dist/ini-types";
import { uniqBy } from "lodash";

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
  "space_tank",
  "dock_ring",
  "docking_fixture",
  /depot_.+/,
  "track_ring",
];

export const serializeSystem = (body: ISystem) => {
  return {
    nickname: body.nickname,
    name: body.name,
    infocard: convertXmlToHtml(body.infocard),
    territory: body.territory,
    position: body.position,
    visit: body.visit,
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

export const serializeObject = (body: IObject | IBase | IZone) => {
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

  return {
    ...body,
    infocard,
    system,
    faction: faction
      ? {
          nickname: faction.nickname,
          name: faction.name,
        }
      : undefined,
    loadout,
  };
};
