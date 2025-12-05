import { Router } from "express";
import { DataContext } from "fl-node-orm";
import { keyBy } from "lodash";
import { convertXmlToHtml } from "../util/rdl";

const router = Router();

const spec = `# Freelancer World Specification

This document describes the game world of Freelancer. Freelancer is a space trading and combat simulator.

## Factions

Ships and stations in the world are owned by factions, which include government bodies, corporate entities and independent groups.

{{factions}}

## Systems

The world consists of star systems connected by Jump Gates and Jump Holes. Star systems are agglomerated into territories, which may be national groupings or arbitrary categorizations of systems.

Each system contains bases or planets, which players may dock at to trade or accept missions, as well as other objects of interest, like asteroid fields, wrecks, etc.

{{systems}}
`;

router.get("/world", async (req, res) => {
  let result = spec;

  let factions = "";
  const factionMap = keyBy(
    DataContext.INSTANCE.entity("faction").findAll(),
    "nickname"
  );
  for (const faction of Object.values(factionMap)) {
    factions += `### ${faction.name}

${convertXmlToHtml(faction.infocard).replace(/<br>/g, "\n\n")}

#### Relations

| Name | Reputation | Empathy |
|------|------------|---------|
${Object.entries(factionMap)
  .filter(([nickname]) => nickname !== faction.nickname)
  .map(
    ([nickname, f]) =>
      `| ${f.name || f.nickname} | ${faction.reputation[nickname]} | ${faction.empathy[nickname] ?? "N/A"} |`
  )
  .join("\n")}

`;
  }
  result = result.replace("{{factions}}", factions);

  let systems = "";
  for (const system of DataContext.INSTANCE.entity("system").findAll()) {
    systems += `### ${system.name}

${convertXmlToHtml(system.infocard).replace(/<br>/g, "\n\n")}

`;
  }
  res.contentType("text/markdown").send(result);
});

export default router;
