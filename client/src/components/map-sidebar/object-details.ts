import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import "./search-box";
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

    if (result.archetype.includes("jump")) {
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
      return html`<ul class="tabs">
        <li><button data-tab="general">General</button></li>
        <li><button data-tab="faction">Markets</button></li>
      </ul>`;
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
        let summary = `Unknown object (${result.archetype})`;
        let faction = result.faction?.name ?? "";
        if (type === "system") {
          icon = SYSTEM;
          summary = `System`;
        } else if (type === "zone") {
          icon = result.properties.includes("NEBULA") ? NEBULA : ASTEROID;
          summary = result.properties?.join(", ");
          if (result.properties.includes("NEBULA")) {
            summary = "Nebula";
          } else if (
            result.properties.includes("ROCK") ||
            result.properties.includes("BADLANDS") ||
            result.properties.includes("NOMAD")
          ) {
            summary = "Rocky Asteroid Field";
          } else if (result.properties.includes("ICE")) {
            summary = "Icy Asteroid Field";
          }
        } else if (type === "jump") {
          icon = JUMP;
          if (result.archetype.includes("jumpgate")) {
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

        return html`<div id="details-root">
          <div class="static-summary">
            <div class="preview">
              <div class="icon-placeholder">${icon}</div>
            </div>
            <h1 class="name">${result.name}</h1>
            <div class="summary">${summary}</div>
            ${faction ? html`<div class="faction">${faction}</div>` : ""}
            <div class="location">
              ${result.system?.name ?? "Unknown"}, Sector A1
            </div>
          </div>
          ${this.renderTabs()}
        </div>`;
      },
    });
  }
}
