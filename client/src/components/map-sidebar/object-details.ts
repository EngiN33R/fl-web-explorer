import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import "./search-box";
import "../tabs";
import { Task } from "@lit/task";
import {
  LOOTABLE,
  JUMP,
  PLANET,
  SHOP,
  STAR,
  UNKNOWN,
  SYSTEM,
  ASTEROID,
  NEBULA,
  MINING,
  UP_RIGHT_ARROW,
} from "../icons";
import { unsafeHTML } from "lit/directives/unsafe-html.js";

@customElement("object-details")
export class ObjectDetailsPane extends LitElement {
  constructor() {
    super();
  }

  protected createRenderRoot() {
    return this;
  }

  @property()
  object?: string;

  @property()
  tab: string = "general";

  #detailsTask = new Task(this, {
    task: async ([object], { signal }) => {
      if (!object) {
        return undefined;
      }

      const response = await fetch(
        `http://localhost:3000/search?q=${object ?? ""}`,
        {
          signal,
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const result = await response.json();
      if (result[0].relevance !== 1000) {
        return undefined;
      }
      return result[0];
    },
    args: () => [this.object],
    autoRun: true,
  });

  #navigateTo = (e: Event) => {
    const target = e.currentTarget as HTMLElement;
    this.dispatchEvent(
      new CustomEvent("mapnavigate", {
        detail: {
          nickname: target.dataset.nickname,
          system: target.dataset.system,
        },
        bubbles: true,
        composed: true,
      })
    );
  };

  getObjectType() {
    const result = this.#detailsTask.value;
    if (result.type === "system") {
      return "system";
    }
    if (result.type === "zone") {
      return "zone";
    }
    if (!result) {
      return "object";
    }

    if (
      result.archetype.includes("jump") ||
      result.archetype.includes("nomad_gate")
    ) {
      return "jump";
    } else if (
      result.archetype.includes("surprise") ||
      result.archetype.includes("suprise")
    ) {
      return "wreck";
    } else if (result.type === "base") {
      return "base";
    }
    return "object";
  }

  renderTabs() {
    const type = this.getObjectType();
    const object = this.#detailsTask.value;
    if (type === "base") {
      return html`<tab-host>
        <tab data-tab="general">General</tab>
        <tab data-tab="markets">Markets</tab>
        <pane data-tab="general">
          <p>${unsafeHTML(object.infocard)}</p>
        </pane>
        <pane data-tab="markets">
          <p>Markets</p>
        </pane>
      </tab-host>`;
    } else {
      return unsafeHTML(
        `<div class="dynamic-container"><p>${object.infocard}</p></div>`
      );
    }
  }

  render() {
    return this.#detailsTask.render({
      complete: (result) => {
        if (!this.object) {
          return html`<div id="details-root"></div>`;
        }
        if (this.object && !result) {
          return html`<div id="details-root">
            <span class="status">Error: Object not found</span>
          </div>`;
        }

        const type = this.getObjectType();
        let icon = UNKNOWN;
        let summary = `Unknown (${result.archetype})`;
        let faction = result.faction?.name ?? "";
        if (type === "system") {
          icon = SYSTEM;
          summary = `System`;
        } else if (type === "zone") {
          icon = result.properties.includes("NEBULA") ? NEBULA : ASTEROID;
          summary = result.properties?.join(", ");
          if (result.properties.includes("NEBULA")) {
            summary = "Nebula";
          } else if (result.properties.includes("MINE")) {
            summary = "Minefield";
          } else if (
            result.properties.includes("ROCK") ||
            result.properties.includes("BADLANDS") ||
            result.properties.includes("NOMAD")
          ) {
            summary = "Rocky Asteroid Field";
          } else if (result.properties.includes("ICE")) {
            summary = "Icy Asteroid Field";
          } else if (result.properties.includes("CRYSTAL")) {
            summary = "Ice Crystal Field";
          } else if (result.properties.includes("DEBRIS")) {
            summary = "Debris Field";
          } else if (result.properties.includes("GAS_POCKETS")) {
            summary = "Explosive Gas Field";
          }
        } else if (type === "jump") {
          icon = JUMP;
          if (result.archetype.includes("gate")) {
            summary = `Jump Gate`;
          } else {
            summary = "Jump Hole";
          }
        } else if (type === "wreck") {
          icon = LOOTABLE;
          summary = "Wreck";
        } else if (result.archetype.includes("planet")) {
          icon = PLANET;
          summary = `Planet`;
        } else if (type === "base") {
          icon = SHOP;
          summary = `Station`;
        } else if (result.archetype.includes("sun")) {
          icon = STAR;
          summary = "Star";
        } else if (result.archetype.includes("mineable")) {
          icon = MINING;
          summary = "Mineable Resource";
        }

        const isGas = result.properties?.includes("GAS_POCKETS");
        const isMine = result.properties?.includes("MINES");
        const isMedDanger = result.properties?.includes("DANGER_MEDIUM");
        const isHighDanger = result.properties?.includes("DANGER_HIGH");

        return html`<div id="details-root">
          <div class="static-summary">
            <div class="preview">
              <div class="icon-placeholder">${icon}</div>
            </div>
            <div class="title">
              <h1 class="name">${result.name || "Unnamed"}</h1>
              ${result.goto
                ? html`<button
                    class="jump"
                    data-nickname="${result.goto?.system}"
                    data-system="${result.goto?.system}"
                    @click="${this.#navigateTo}"
                  >
                    ${UP_RIGHT_ARROW}
                  </button>`
                : ""}
            </div>
            <div class="summary">${summary}</div>
            ${faction ? html`<div class="faction">${faction}</div>` : ""}
            <div class="location">
              ${type === "system"
                ? result.territory
                : `${result.system?.name ?? "Unknown"}, Sector A1`}
            </div>
            ${result.damage
              ? html`<div
                  class="banner ${result.damage > 20 ? "critical" : "warning"}"
                >
                  This area deals ${result.damage} damage
                </div>`
              : ""}
            ${result.loot
              ? html`<div class="banner success">
                  Mining in this area produces ${result.loot.count.join("-")}
                  ${result.loot.commodity} with a difficulty of
                  ${result.loot.difficulty}
                </div>`
              : ""}
            ${isGas
              ? html`<div
                  class="banner ${isHighDanger ? "critical" : "warning"}"
                >
                  This area deals ${isHighDanger ? "high damage" : "damage"}
                  from exploding gas pockets
                </div>`
              : ""}
            ${isMine
              ? html`<div
                  class="banner ${isHighDanger ? "critical" : "warning"}"
                >
                  This area deals ${isHighDanger ? "high damage" : "damage"}
                  from mines
                </div>`
              : ""}
            ${!isGas && !isMine && (isMedDanger || isHighDanger)
              ? html`<div
                  class="banner ${isHighDanger ? "critical" : "warning"}"
                >
                  This area is marked as
                  ${isHighDanger ? "highly dangerous" : "dangerous"}
                </div>`
              : ""}
          </div>
          ${this.renderTabs()}
        </div>`;
      },
    });
  }
}
