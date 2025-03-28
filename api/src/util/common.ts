import { DataContext, IBase, IObject, ISystem, IZone } from "fl-node-orm";
import { convertXmlToHtml } from "./rdl";

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
  };
};
