import { Task } from "@lit/task";
import { LitElement, TemplateResult, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { ISystemRes } from "../../../../api/src/types";
import Panzoom from "@panzoom/panzoom";
import { IGNORED_ARCHETYPES } from "./common";
import { GALAXY, PIN } from "../icons";

@customElement("nav-map")
export class NavigationMap extends LitElement {
  protected createRenderRoot() {
    return this;
  }

  constructor() {
    super();
    const mutationObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "childList") {
          for (const node of mutation.addedNodes) {
            if (node instanceof HTMLElement && node.id === "navmap-root") {
              this.#enablePanning(node);
            }
          }
        }
      }
    });
    mutationObserver.observe(this, { childList: true, subtree: true });
  }

  #enablePanning(el: HTMLElement) {
    const panzoom = Panzoom(el, {
      maxScale: 4,
      minScale: 1,
      roundPixels: true,
      contain: "outside",
      panOnlyWhenZoomed: true,
      handleStartEvent: (e: MouseEvent) => {
        e.preventDefault();
        this._startMouseClick = [e.clientX, e.clientY];
        this._selected = false;
      },
    });
    this.addEventListener("wheel", (e) => {
      panzoom.zoomWithWheel(e, { maxScale: 3, minScale: 1 });
      this._scale = panzoom.getScale();
    });
    this.addEventListener("mousemove", (e) => {
      if (e.buttons === 1) {
        panzoom.pan(e.movementX, e.movementY);
      }
    });
    this._scale = panzoom.getScale();
    el.dataset.panzoomed = "true";
  }

  // Declare reactive properties
  @property()
  system?: string | null = null;
  @property()
  object?: string | null = null;

  @property()
  theme = "simple";

  @property()
  private _scale = 1;

  private _startMouseClick = [0, 0];
  private _selected = false;
  private _positionsMap: Record<string, [number, number]> = {};

  #createSystemScene(system: ISystemRes) {
    const elements: TemplateResult[] = [];

    const size = system.size;

    const toRelSize = <T extends number[]>(pos: T) =>
      pos.map((v) => (v / size) * 100) as T;
    const toRelPos = <T extends number[]>(pos: T) =>
      toRelSize(pos).map((v) => 50 + v) as T;

    for (let x = 0; x <= 8; x++) {
      const gridline = html`<div
        class="gridline vertical"
        style="left: ${Math.min((100 / 8) * x, 99.9)}%"
      ></div>`;
      elements.push(gridline);
    }
    for (let y = 0; y <= 8; y++) {
      const gridline = html`<div
        class="gridline horizontal"
        style="top: ${Math.min((100 / 8) * y, 99.9)}%"
      ></div>`;
      elements.push(gridline);
    }

    for (const base of system.bases) {
      if (!base.nickname) {
        continue;
      }

      const [relX, , relY] = toRelPos(base.position);
      this._positionsMap[base.nickname] = [relX, relY];
      const element = html`<button
        class="node"
        data-nickname="${base.nickname}"
        data-type="base"
        data-archetype="${base.archetype}"
        title="${base.name} (${base.nickname})"
        style="left: ${relX}%; top: ${relY}%; transform: scale(${1 /
        this._scale})"
        @pointerup="${this.#objectClicked}"
      >
        <i class="icon"></i>
        <span class="label">${base.name}</span>
      </button>`;
      elements.push(element);
    }

    for (const object of system.objects) {
      if (
        !object.nickname ||
        !object.name ||
        !!object.parent ||
        IGNORED_ARCHETYPES.some((a) => !!object.archetype?.match(a))
      ) {
        continue;
      }
      const [relX, , relY] = toRelPos(object.position);
      this._positionsMap[object.nickname] = [relX, relY];
      const element = html`<button
        class="node"
        data-type="object"
        data-archetype="${object.archetype}"
        title="${object.name} (${object.nickname})"
        data-nickname="${object.nickname}"
        data-type="object"
        style="left: ${relX}%; top: ${relY}%; transform: scale(${1 /
        this._scale})"
        @pointerup="${this.#objectClicked}"
      >
        <i class="icon"></i>
        <span class="label">${object.name}</span>
      </button>`;
      elements.push(element);
    }

    for (const tradelane of system.tradelanes) {
      const [ox, oz, oy] = toRelPos(tradelane.startPosition);
      const [tx, tz, ty] = toRelPos(tradelane.endPosition);
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

    for (const zone of system.zones) {
      if (
        !zone.nickname ||
        zone.vignetteType ||
        (!zone?.properties?.length && !zone.name && !zone.infocard) ||
        // zone.properties.includes("EXCLUSION2") ||
        (!zone.properties?.includes("EXCLUSION1") &&
          zone.visit?.includes("ALWAYS_HIDDEN"))
      ) {
        continue;
      }
      const [relX, , relY] = toRelPos(zone.position);
      this._positionsMap[zone.nickname] = [relX, relY];
      let width = 0;
      let height = 0;
      if (zone.shape === "sphere") {
        width = height = (zone.size as number) * 2;
      } else if (zone.shape === "cylinder") {
        width = (zone.size as number[])[1];
        height = (zone.size as number[])[0];
      } else if (zone.shape === "box") {
        width = (zone.size as number[])[0];
        height = (zone.size as number[])[2];
      } else {
        width = (zone.size as number[])[0] * 2;
        height = (zone.size as number[])[2] * 2;
      }
      const [relW, relH] = toRelSize([width, height]);
      const rotation = zone.rotate?.[1] ? -zone.rotate[1] : 0;
      let zIndex = relW >= 90 ? 2 : 3;
      let borderColor = zone.fogColor ?? "#888";
      if (zone.damage) {
        borderColor = "#f00";
      }
      const styles = [
        `left: ${relX}%`,
        `top: ${relY}%`,
        `transform: translate(-50%, -50%) rotate(${rotation}deg)`,
        `width: ${relW}%`,
        `height: ${relH}%`,
      ];
      if (
        zone.fogColor &&
        !zone.properties?.includes("EXCLUSION1") &&
        !zone.properties?.includes("EXCLUSION2")
      ) {
        styles.push(`background-color: ${zone.fogColor + "66"}`);
        styles.push(`border-color: ${borderColor}`);
      }
      if (zone.shape === "box") {
        styles.push(`border-radius: 0`);
        zIndex = 4;
      }
      if (relW >= 90) {
        styles.push(`opacity: 0.4`);
      }
      styles.push(`z-index: ${zIndex}`);

      const element = html`<div
        class="zone"
        style="${styles.join("; ")}"
        data-nickname="${zone.nickname}"
        data-type="zone"
        data-properties="${zone.properties?.join(",")}${zone.loot
          ? ",LOOTABLE"
          : ""}"
        title="${zone.name} (${zone.nickname})"
        @pointerup="${this.#objectClicked}"
      ></div>`;
      elements.push(element);
    }

    return elements;
  }

  #createUniverseScene(systems: ISystemRes[]) {
    const elements: TemplateResult[] = [];

    // const scale = 50;
    const toRel = <T extends number[]>(pos: T) =>
      pos.map((v) => (v / 18) * 90 + 15) as T;

    const systemsMap = systems.reduce((map, s) => {
      map.set(s.nickname as string, s);
      return map;
    }, new Map<string, ISystemRes>());

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
        data-nickname="${s.nickname}"
        data-type="system"
        @pointerup="${this.#selectSystem.bind(this)}"
        style="left: ${x}%; top: ${y}%; transform: scale(${1 / this._scale})"
      >
        <i class="icon"></i>
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
        type === "both" ? "#f0f" : type === "jumpgate" ? "#08f" : "#f00";
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

  #objectClicked = (e: MouseEvent) => {
    if (
      Math.abs(e.clientX - this._startMouseClick[0]) > 2 ||
      Math.abs(e.clientY - this._startMouseClick[1]) > 2
    ) {
      return;
    }
    if (this._selected) {
      return;
    }

    const type = (e.currentTarget as HTMLElement).dataset.type;
    const nickname = (e.currentTarget as HTMLElement).dataset.nickname;
    this.dispatchEvent(
      new CustomEvent("mapnavigate", {
        detail: {
          system: this.system,
          nickname,
        },
        bubbles: true,
        composed: true,
      })
    );
    this.dispatchEvent(
      new CustomEvent("objectselect", {
        detail: {
          type,
          nickname,
        },
        bubbles: true,
        composed: true,
      })
    );
    this._selected = true;
  };

  #goHome = () => {
    this.dispatchEvent(
      new CustomEvent("mapnavigate", {
        detail: {
          system: null,
          nickname: null,
        },
        bubbles: true,
        composed: true,
      })
    );
  };

  #universeTask = new Task(this, {
    task: async ([system], { signal }) => {
      const response = await fetch(
        `http://localhost:3000/system/${system ?? ""}`,
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

  #selectSystem(e: MouseEvent) {
    const system = (e.currentTarget as HTMLElement).dataset.nickname;
    if (system) {
      this.system = system;
      this.#objectClicked(e);
    }
  }

  updated() {
    const navmapRoot = this.renderRoot.firstElementChild
      ?.firstElementChild as HTMLElement;
    if (navmapRoot && !navmapRoot.dataset.panzoomed) {
      this.#enablePanning(navmapRoot);
      if (this.system) {
        navmapRoot.addEventListener("pointerup", this.#objectClicked);
      } else {
        navmapRoot.removeEventListener("pointerup", this.#objectClicked);
      }
    }
    // this.#enablePanning(this.renderRoot.childNodes[1]);
  }

  render() {
    return this.#universeTask.render({
      complete: (result) => {
        let elements: TemplateResult[];
        if (this.system) {
          elements = this.#createSystemScene(result);
        } else {
          elements = this.#createUniverseScene(result);
        }
        const [pinX, pinY] = this._positionsMap[this.object ?? ""] ?? [0, 0];
        return html`<div id="navmap-container">
          <section
            id="navmap-root"
            class="navmap-root ${this.system ? "system-map" : "universe-map"}"
            data-theme="${this.theme}"
            data-type="system"
            data-nickname="${this.system ?? ""}"
          >
            ${elements}
            ${this.object
              ? html`<i
                  class="pin"
                  style="left: ${pinX}%; top: ${pinY}%; transform: translate(calc(-50% + ${1 *
                  (this._scale - 1)}px), calc(-50% - ${16 /
                  this._scale}px)) scale(${1 / this._scale})"
                  >${PIN}</i
                >`
              : ""}
            ${this.system
              ? html`<button
                  class="home"
                  title="Sector map"
                  @click="${this.#goHome}"
                >
                  ${GALAXY}
                </button>`
              : ""}
          </section>
        </div>`;
      },
    });
  }
}
