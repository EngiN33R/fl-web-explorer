import { Task } from "@lit/task";
import { LitElement, TemplateResult, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { ISystem } from "fl-node-orm";

const IGNORED_ARCHETYPES = [
  "trade_lane_ring",
  "nav_buoy",
  "wplatform",
  "space_tank",
  "dock_ring",
  "docking_fixture",
  /depot_.+/,
];

@customElement("nav-map")
export class NavigationMap extends LitElement {
  static styles = css`
    :host {
      .navmap-root {
        position: relative;
        width: 1200px;
        height: 1200px;
        background-color: #111122;

        &.universe-map {
          background-image: url("http://localhost:3000/texture/navmap");
          background-size: contain;
        }

        &.system-map {
          cursor: move;
        }

        .gridline {
          background-color: #0055ff77;
          position: absolute;

          &.vertical {
            height: 100%;
            width: 2px;
          }

          &.horizontal {
            width: 100%;
            height: 2px;
          }
        }

        .node {
          position: absolute;
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: pointer;
          background: none;
          border: none;
          font-size: 18px;
          z-index: 2;
          font-family: "Agency FB", sans-serif;
          -webkit-font-smoothing: subpixel-antialiased;
          backface-visibility: hidden;

          &::before {
            position: absolute;
            content: "";
            background-color: white;
            border: 1px solid black;
            border-radius: 100%;
            width: 15px;
            height: 15px;
            margin-top: -7.5px;
            margin-left: -7.5px;
          }

          .label {
            position: absolute;
            width: max-content;
            max-width: 200px;
            margin-left: -7.5px;
            margin-top: 10px;
          }

          &:hover {
            &::before {
              border-color: #f00;
            }
          }
        }

        .connection {
          position: absolute;
          border-bottom: 1px solid;

          &.directional {
            border-radius: 100%;
            height: 5px;

            &::before {
              // content: "→";
              // content: ">";
              content: "⇁";
              font-size: 30px;
              position: absolute;
              left: calc(50% - 10px);
              top: -20px;
            }
          }
        }
      }
    }
  `;

  // Declare reactive properties
  @property()
  system?: string | null = null;

  #createSystemScene(system: ISystem) {
    const elements: TemplateResult[] = [];

    const size = system.size;

    const toRel = <T extends number[]>(pos: T) =>
      pos.map((v) => 50 + (v / size) * 100) as T;

    for (let x = 0; x <= 8; x++) {
      const gridline = html`<div
        class="gridline vertical"
        style="left: ${(100 / 8) * x}%"
      ></div>`;
      elements.push(gridline);
    }
    for (let y = 0; y <= 8; y++) {
      const gridline = html`<div
        class="gridline horizontal"
        style="top: ${(100 / 8) * y}%"
      ></div>`;
      elements.push(gridline);
    }

    for (const base of system.bases) {
      const [relX, , relY] = toRel(base.position);
      const element = html`<button
        class="node"
        data-type="base"
        title="${base.name} (${base.nickname})"
        data-base="${base.nickname}"
        style="left: ${relX}%; top: ${relY}%"
      >
        <span class="label">${base.name}</span>
      </button>`;
      elements.push(element);
    }

    for (const object of system.objects) {
      if (
        !object.name ||
        IGNORED_ARCHETYPES.some((a) => !!object.archetype.match(a)) ||
        !!object.parent
      ) {
        continue;
      }
      const [relX, , relY] = toRel(object.position);
      const element = html`<button
        class="node"
        data-type="${object.archetype}"
        title="${object.name} (${object.nickname})"
        data-base="${object.nickname}"
        style="left: ${relX}%; top: ${relY}%"
      >
        <span class="label">${object.name}</span>
      </button>`;
      elements.push(element);
    }

    for (const tradelane of system.tradelanes) {
      const [ox, oz, oy] = toRel(tradelane.startPosition);
      const [tx, tz, ty] = toRel(tradelane.endPosition);
      const length = Math.sqrt(
        (ox - tx) ** 2 + (oy - ty) ** 2 + (oz - tz) ** 2
      );
      const width = `${length}%`;
      const rotation = Math.round(
        (Math.atan2(ty - oy, tx - ox) * 180) / Math.PI
      );
      const [relX, relY] = [(tx + ox) / 2, (ty + oy) / 2];
      const connection = html`<div
        class="connection"
        style="border-color: #08f; color: #08f; width: ${width}; transform: translate(-50%, -50%) rotate(${rotation}deg); left: ${relX}%; top: ${relY}%"
      ></div>`;
      elements.push(connection);
    }

    return elements;
  }

  #createUniverseScene(systems: ISystem[]) {
    const elements: TemplateResult[] = [];

    // const scale = 50;
    const toRel = <T extends number[]>(pos: T) =>
      pos.map((v) => (v / 18) * 90 + 15) as T;

    const systemsMap = systems.reduce((map, s) => {
      map.set(s.nickname as string, s);
      return map;
    }, new Map<string, ISystem>());

    const connectionsMap = systems.reduce((map, s) => {
      for (const c of s.connections) {
        const key = `${s.nickname}-${c.system}`;
        let value = c.type as string;
        if (map.has(key) && map.get(key) !== value) {
          value = "both";
        }
        map.set(`${s.nickname}>${c.system}`, value);
      }
      return map;
    }, new Map<string, string>());

    for (const s of systems) {
      const [x, y] = toRel(s.position);
      const system = html`<button
        class="node"
        title="${s.name} (${s.nickname})"
        data-system="${s.nickname}"
        @click="${this.#selectSystem.bind(this)}"
        style="left: ${x}%; top: ${y}%"
      >
        <span class="label">${s.name}</span>
      </button>`;
      elements.push(system);
    }

    for (const [conn, type] of connectionsMap.entries()) {
      const [src, dst] = conn.split(">").map((s) => systemsMap.get(s));
      if (!src || !dst) {
        continue;
      }
      // if (src.nickname !== "li01" || dst.nickname !== "li05") {
      //   continue;
      // }

      const [ox, oy] = toRel(src.position);
      const [tx, ty] = toRel(dst.position);
      const rotation = Math.round(
        (Math.atan2(ty - oy, tx - ox) * 180) / Math.PI
      );
      const color =
        type === "both" ? "#f0f" : type === "jumpgate" ? "#00f" : "#f00";
      const length = Math.sqrt((ox - tx) ** 2 + (oy - ty) ** 2);
      const [relX, relY] = [(tx + ox) / 2, (ty + oy) / 2];
      const connection = html`<div
        class="connection directional"
        style="border-color: ${color}; color: ${color}; width: ${length}%; transform: translate(-50%, -50%) rotate(${rotation}deg); left: ${relX}%; top: ${relY}%"
        data-from="${src.nickname}"
        data-to="${dst.nickname}"
      ></div>`;
      elements.push(connection);
    }

    return elements;
  }

  #universeTask = new Task(this, {
    task: async (_, { signal }) => {
      const response = await fetch(
        `http://localhost:3000/system/${this.system ?? ""}`,
        {
          signal,
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      return response.json();
    },
    args: () => [this.system],
  });

  #selectSystem(e: Event) {
    const system = (e.currentTarget as HTMLElement).dataset.system;
    if (system) {
      this.system = system;
    }
  }

  render() {
    return this.#universeTask.render({
      complete: (result) => {
        let elements: TemplateResult[];
        if (this.system) {
          elements = this.#createSystemScene(result as ISystem);
        } else {
          elements = this.#createUniverseScene(result as ISystem[]);
        }
        return html`<section
          id="navmap-root"
          class="navmap-root ${this.system ? "system-map" : "universe-map"}"
        >
          ${elements}
        </section>`;
      },
    });
  }
}
