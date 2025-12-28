import {
  Asteroid,
  Jump,
  Lootable,
  Mining,
  Nebula,
  Planet,
  Shop,
  Star,
  System,
  Unknown,
  UpRightArrow,
} from "@/components/icons";
import sx from "./sidebar.module.css";
import { ObjectTabs } from "./tabs/object";
import { useMemo } from "react";
import { BaseTabs } from "./tabs/base";
import { Link } from "@tanstack/react-router";
import { LootableTabs } from "./tabs/lootable";
import { ZoneTabs } from "./tabs/zone";

export function ObjectDetails({ data }: { data: any }) {
  const type = useMemo(() => {
    if (!data) {
      return "object";
    }

    if (data.type === "system") {
      return "system";
    }
    if (data.type === "zone") {
      return "zone";
    }

    if (
      data.archetype?.includes("jump") ||
      data.archetype?.includes("nomad_gate")
    ) {
      return "jump";
    } else if (
      data.archetype?.includes("surprise") ||
      data.archetype?.includes("suprise") ||
      ((data.archetype?.includes("depot_") ||
        data.archetype?.includes("space_industrial")) &&
        data.loadout?.cargo.length)
    ) {
      return "wreck";
    } else if (data.type === "base") {
      return "base";
    }
    return "object";
  }, [data]);

  const details = useMemo(() => {
    if (!data) {
      return { icon: <Unknown />, summary: "Unknown", faction: "" };
    }

    let icon = <Unknown />;
    let summary = `Unknown (${data.archetype})`;
    let faction = data.faction?.name ?? "";
    if (type === "system") {
      icon = <System />;
      summary = `System`;
    } else if (type === "zone") {
      icon = data.properties.includes("NEBULA") ? <Nebula /> : <Asteroid />;
      summary = data.properties?.join(", ");
      if (data.properties.includes("NEBULA")) {
        summary = "Nebula";
      } else if (data.properties.includes("MINES")) {
        summary = "Minefield";
      } else if (
        data.properties.includes("ROCK") ||
        data.properties.includes("BADLANDS") ||
        data.properties.includes("NOMAD")
      ) {
        summary = "Rocky Asteroid Field";
      } else if (data.properties.includes("ICE")) {
        summary = "Icy Asteroid Field";
      } else if (data.properties.includes("CRYSTAL")) {
        summary = "Ice Crystal Field";
      } else if (data.properties.includes("DEBRIS")) {
        summary = "Debris Field";
      } else if (data.properties.includes("GAS_POCKETS")) {
        summary = "Explosive Gas Field";
      } else if (data.properties.includes("LAVA")) {
        summary = "Lava Asteroid Field";
      }
      if (data.loot) {
        summary += " (Mineable)";
      }
    } else if (type === "jump") {
      icon = <Jump />;
      if (data.archetype.includes("gate")) {
        summary = `Jump Gate`;
      } else {
        summary = "Jump Hole";
      }
    } else if (type === "wreck") {
      icon = <Lootable />;
      summary = "Wreck";
    } else if (data.archetype?.includes("planet")) {
      icon = <Planet />;
      summary = `Planet`;
    } else if (type === "base") {
      icon = <Shop />;
      summary = `Station`;
    } else if (data.archetype?.includes("sun")) {
      icon = <Star />;
      summary = "Star";
    } else if (
      data.archetype?.includes("mineable") &&
      !data.archetype?.includes("wplatform")
    ) {
      icon = <Mining />;
      summary = "Mineable Resource";
    }

    return {
      icon,
      summary,
      faction,
    };
  }, [data]);

  return (
    <div id="details-root" className={sx.detailsRoot}>
      <div className={sx.static}>
        <div className={sx.preview}>
          <div className={sx.placeholder}>{details?.icon}</div>
        </div>
        <div className={sx.title}>
          <h1 className={sx.name}>{data?.name || "Unnamed"}</h1>
          {data?.goto && (
            <Link
              className={sx.jump}
              to="/navmap/$system"
              params={{ system: data?.goto?.system }}
              search={{ nickname: data?.goto?.object }}
              data-nickname={data?.goto?.system}
              data-system={data?.goto?.system}
            >
              <UpRightArrow />
            </Link>
          )}
        </div>
        <div className={sx.summary}>{details?.summary}</div>
        {details?.faction && (
          <div className={sx.faction}>{details?.faction}</div>
        )}
        <div className={sx.location}>
          {type === "system"
            ? data?.territory
            : `${data?.system?.name ?? "Unknown"}, Sector ${data?.sector}`}
        </div>
      </div>
      {type === "base" ? (
        <BaseTabs data={data} />
      ) : type === "wreck" ? (
        <LootableTabs data={data} />
      ) : type === "zone" ? (
        <ZoneTabs data={data} />
      ) : (
        <ObjectTabs data={data} />
      )}
    </div>
  );
}
