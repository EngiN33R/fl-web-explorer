import { createMemo, useContext } from "solid-js";
import { NavMapContext } from "../../../data/context";
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
} from "../../../components/icons";
import sx from "./sidebar.module.css";
import { ObjectTabs } from "./tabs/object";

export function ObjectDetails() {
  const ctx = useContext(NavMapContext);
  const result = ctx?.object;

  const type = createMemo(() => {
    if (!result()) {
      return "object";
    }

    if (result()?.type === "system") {
      return "system";
    }
    if (result()?.type === "zone") {
      return "zone";
    }

    if (
      result()?.archetype?.includes("jump") ||
      result()?.archetype?.includes("nomad_gate")
    ) {
      return "jump";
    } else if (
      result()?.archetype?.includes("surprise") ||
      result()?.archetype?.includes("suprise")
    ) {
      return "wreck";
    } else if (result()?.type === "base") {
      return "base";
    }
    return "object";
  });

  const details = createMemo(() => {
    const r = result();

    if (!r) {
      return { icon: <Unknown />, summary: "Unknown", faction: "" };
    }

    let icon = <Unknown />;
    let summary = `Unknown (${r.archetype})`;
    let faction = r.faction?.name ?? "";
    if (type() === "system") {
      icon = <System />;
      summary = `System`;
    } else if (type() === "zone") {
      icon = r.properties.includes("NEBULA") ? <Nebula /> : <Asteroid />;
      summary = r.properties?.join(", ");
      if (r.properties.includes("NEBULA")) {
        summary = "Nebula";
      } else if (r.properties.includes("MINE")) {
        summary = "Minefield";
      } else if (
        r.properties.includes("ROCK") ||
        r.properties.includes("BADLANDS") ||
        r.properties.includes("NOMAD")
      ) {
        summary = "Rocky Asteroid Field";
      } else if (r.properties.includes("ICE")) {
        summary = "Icy Asteroid Field";
      } else if (r.properties.includes("CRYSTAL")) {
        summary = "Ice Crystal Field";
      } else if (r.properties.includes("DEBRIS")) {
        summary = "Debris Field";
      } else if (r.properties.includes("GAS_POCKETS")) {
        summary = "Explosive Gas Field";
      }
    } else if (type() === "jump") {
      icon = <Jump />;
      if (r.archetype.includes("gate")) {
        summary = `Jump Gate`;
      } else {
        summary = "Jump Hole";
      }
    } else if (type() === "wreck") {
      icon = <Lootable />;
      summary = "Wreck";
    } else if (r.archetype?.includes("planet")) {
      icon = <Planet />;
      summary = `Planet`;
    } else if (type() === "base") {
      icon = <Shop />;
      summary = `Station`;
    } else if (r.archetype?.includes("sun")) {
      icon = <Star />;
      summary = "Star";
    } else if (r.archetype?.includes("mineable")) {
      icon = <Mining />;
      summary = "Mineable Resource";
    }

    const isGas = r.properties?.includes("GAS_POCKETS");
    const isMine = r.properties?.includes("MINES");
    const isMedDanger = r.properties?.includes("DANGER_MEDIUM");
    const isHighDanger = r.properties?.includes("DANGER_HIGH");

    return {
      icon,
      summary,
      faction,
      isGas,
      isMine,
      isMedDanger,
      isHighDanger,
    };
  });

  return (
    <div id="details-root" class={sx.detailsRoot}>
      <div class={sx.static}>
        <div class={sx.preview}>
          <div class={sx.placeholder}>{details()?.icon}</div>
        </div>
        <div class={sx.title}>
          <h1 class={sx.name}>{result()?.name || "Unnamed"}</h1>
          {result()?.goto && (
            <button
              class={sx.jump}
              data-nickname={result()?.goto?.system}
              data-system={result()?.goto?.system}
              on:click={() => {
                ctx?.navigate({ system: result()?.goto?.system });
              }}
            >
              <UpRightArrow />
            </button>
          )}
        </div>
        <div class={sx.summary}>{details()?.summary}</div>
        {details()?.faction && (
          <div class={sx.faction}>{details()?.faction}</div>
        )}
        <div class={sx.location}>
          {type() === "system"
            ? result()?.territory
            : `${result()?.system?.name ?? "Unknown"}, Sector A1`}
        </div>
        {result()?.damage && (
          <div
            class={`${sx.banner} ${
              result()?.damage > 20 ? sx.critical : sx.warning
            }`}
          >
            This area deals {result()?.damage} damage
          </div>
        )}
        {result()?.loot && (
          <div class={`${sx.banner} ${sx.success}`}>
            Mining in this area produces {result()?.loot.count.join("-")}{" "}
            {result()?.loot.commodity} with a difficulty of{" "}
            {result()?.loot.difficulty}
          </div>
        )}
        {details()?.isGas && (
          <div
            class={`${sx.banner} ${
              details()?.isHighDanger ? sx.critical : sx.warning
            }`}
          >
            This area deals {details()?.isHighDanger ? "high damage" : "damage"}{" "}
            from exploding gas pockets
          </div>
        )}
        {details()?.isMine && (
          <div
            class={`${sx.banner} ${
              details()?.isHighDanger ? sx.critical : sx.warning
            }`}
          >
            This area deals {details()?.isHighDanger ? "high damage" : "damage"}{" "}
            from mines
          </div>
        )}
        {!details()?.isGas &&
          !details()?.isMine &&
          (details()?.isMedDanger || details()?.isHighDanger) && (
            <div
              class={`${sx.banner} ${
                details()?.isHighDanger ? sx.critical : sx.warning
              }`}
            >
              This area is marked as{" "}
              {details()?.isHighDanger ? "highly dangerous" : "dangerous"}
            </div>
          )}
      </div>
      <ObjectTabs />
    </div>
  );
}
