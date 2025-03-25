import { Task } from "@lit/task";
import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import * as THREE from "three";
import {
  CSS3DObject,
  CSS3DRenderer,
  CSS3DSprite,
  OrbitControls,
} from "three/examples/jsm/Addons.js";
import type { ISystem, IObject, IBase, IZone } from "fl-node-orm";

@customElement("nav-map")
export class NavigationMap extends LitElement {
  static styles = css`
    :host {
      .navmap-root {
        position: relative;
        width: 1200px;
        height: 1200px;
        background-color: black;

        &.universe-map {
          background-image: url("http://localhost:3000/texture/navmap");
          background-size: contain;
        }

        &.system-map {
          cursor: move;
        }

        .gridline {
          background-color: #0055ff77;

          &.vertical {
            height: 100%;
            width: 2px;
          }

          &.horizontal {
            width: 100%;
            height: 2px;
          }
        }

        .system {
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: pointer;
          background: none;
          border: none;
          font-size: 18px;
          padding-top: 15px;
          margin-top: -7.5px;
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
            margin-top: -15px;
          }

          &:hover {
            &::before {
              border-color: #f00;
            }
          }
        }

        .connection {
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

        .object {
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: pointer;
          background: none;
          border: none;
          font-size: 14px;
          padding-top: 15px;
          margin-top: -7.5px;
          z-index: 2;
          font-family: "Agency FB", sans-serif;

          &::before {
            position: absolute;
            content: "";
            background-color: white;
            border: 1px solid black;
            border-radius: 100%;
            width: 15px;
            height: 15px;
            margin-top: -15px;
          }

          &:hover {
            &::before {
              border-color: #f00;
            }
          }
        }
      }
    }
  `;

  // Declare reactive properties
  @property()
  system?: string | null = null;

  #renderer: any = null;
  #scene: THREE.Scene | null = null;
  #camera: THREE.Camera | null = null;
  #controls: OrbitControls | null = null;

  firstUpdated() {
    this.#scene = new THREE.Scene();

    const axesHelper = new THREE.AxesHelper(5);
    this.#scene.add(axesHelper);

    const renderer = new CSS3DRenderer();
    renderer.setSize(1200, 1200);
    this.shadowRoot!.getElementById("navmap-root")!.appendChild(
      renderer.domElement
    );
    this.#renderer = renderer;

    requestAnimationFrame(this.#renderThree);
  }

  #renderThree = () => {
    if (this.#renderer && this.#scene && this.#camera) {
      for (const child of this.#scene.children) {
        if (child instanceof CSS3DObject) {
          let logged = false;
          if (
            child.element.className.includes("connection") &&
            !child.element.className.includes("directional")
          ) {
            // child.rotation.set(0, 0, 0);
            // child.rotateOnAxis(new THREE.Vector3(1, 0, 0), Math.PI / 2);
            // child.lookAt(this.#camera.position);
            if (!logged) {
              // console.log(child.quaternion);
              // console.log(child.rotation);
              logged = true;
            }
          }
        }
      }
      this.#renderer.render(this.#scene, this.#camera);
      if (this.#controls) {
        this.#controls.update();
      }
    }
    requestAnimationFrame(this.#renderThree);
  };

  #createSystemScene(system: ISystem) {
    this.#scene?.clear();

    const scale = 0.01;
    const sectorSize = 33000;

    for (let x = -4; x <= 4; x++) {
      const gridline = document.createElement("div");
      gridline.className = "gridline vertical";
      gridline.style.height = `${sectorSize * scale * 8}px`;
      const obj = new CSS3DObject(gridline);
      obj.position.set(x * sectorSize * scale, 0, 0);
      this.#scene?.add(obj);
    }
    for (let y = -4; y <= 4; y++) {
      const gridline = document.createElement("div");
      gridline.className = "gridline horizontal";
      gridline.style.width = `${sectorSize * scale * 8}px`;
      const obj = new CSS3DObject(gridline);
      obj.position.set(0, -y * sectorSize * scale, 0);
      this.#scene?.add(obj);
    }

    for (const base of system.bases) {
      const root = document.createElement("button");
      root.className = "object base";
      root.dataset.type = "base";
      root.textContent = base.name;
      root.title = `${base.name} (${base.nickname})`;
      root.dataset.base = base.nickname;

      const obj = new CSS3DSprite(root);
      const [x, z, y] = base.position.map((v) => v * scale);
      obj.position.set(x, -y, z);
      this.#scene?.add(obj);
    }

    // for (const object of system.objects) {
    // if (object.)
    // }

    for (const tradelane of system.tradelanes) {
      const [ox, oz, oy] = tradelane.startPosition.map((v) => v * scale);
      const [tx, tz, ty] = tradelane.endPosition.map((v) => v * scale);
      const connectionDom = document.createElement("div");
      connectionDom.className = "connection";
      connectionDom.style.borderColor = "#08f";
      connectionDom.style.color = connectionDom.style.borderColor;
      connectionDom.style.width = `${Math.sqrt((ox - tx) ** 2 + (oy - ty) ** 2 + (oz - tz) ** 2)}px`;
      const obj = new CSS3DObject(connectionDom);
      obj.position.set(
        ox - (ox - tx) / 2,
        -oy + (oy - ty) / 2,
        oz - (oz - tz) / 2
      );
      obj.rotateOnWorldAxis(
        new THREE.Vector3(0, 0, 1),
        -Math.atan2(ty - oy, tx - ox)
      );
      this.#scene?.add(obj);
    }

    const camera = new THREE.PerspectiveCamera();
    camera.position.set(0, 0, 150000 * scale);
    camera.lookAt(0, 0, 0);
    this.#camera = camera;
    // const camera = new THREE.OrthographicCamera(
    //   -1000,
    //   1000,
    //   1000,
    //   -1000,
    //   0.1,
    //   2000
    // );
    // camera.position.set(scale * 7, -scale * 7, 1);
    // this.#camera = camera;

    this.#controls = new OrbitControls(camera, this.#renderer.domElement);

    this.#scene?.add(new THREE.AxesHelper(5));
  }

  #createUniverseScene(systems: ISystem[]) {
    this.#scene?.clear();

    const scale = 50;

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
      const systemDom = document.createElement("button");
      systemDom.className = "system";
      systemDom.textContent = s.name;
      systemDom.title = `${s.name} (${s.nickname})`;
      systemDom.dataset.system = s.nickname;
      systemDom.addEventListener("click", this.#selectSystem.bind(this));
      const obj = new CSS3DObject(systemDom);
      const [x, y] = s.position.map((v) => Math.round(v * scale));
      obj.position.set(x, -y, 0);
      this.#scene?.add(obj);
    }

    for (const [conn, type] of connectionsMap.entries()) {
      const [src, dst] = conn.split(">").map((s) => systemsMap.get(s));
      if (!src || !dst) {
        continue;
      }
      // if (src.nickname !== "li01" || dst.nickname !== "li05") {
      //   continue;
      // }

      const [ox, oy] = src.position.map((v) => Math.round(v * scale));
      const [tx, ty] = dst.position.map((v) => Math.round(v * scale));
      const connectionDom = document.createElement("div");
      connectionDom.className = "connection directional";
      connectionDom.style.borderColor =
        type === "both" ? "#f0f" : type === "jumpgate" ? "#00f" : "#f00";
      connectionDom.style.color = connectionDom.style.borderColor;
      connectionDom.dataset.from = src.nickname;
      connectionDom.dataset.to = dst.nickname;
      connectionDom.style.width = `${Math.sqrt((ox - tx) ** 2 + (oy - ty) ** 2)}px`;
      const obj = new CSS3DObject(connectionDom);
      obj.position.set(ox - (ox - tx) / 2, -oy + (oy - ty) / 2, 0);
      obj.rotateOnWorldAxis(
        new THREE.Vector3(0, 0, 1),
        -Math.atan2(ty - oy, tx - ox)
      );
      this.#scene?.add(obj);
    }

    const camera = new THREE.OrthographicCamera(
      -scale * 10,
      scale * 10,
      scale * 10,
      -scale * 10,
      0.1,
      2000
    );
    camera.position.set(scale * 7, -scale * 7, 1);
    this.#camera = camera;
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
    onComplete: (result) => {
      try {
        if (this.system) {
          this.#createSystemScene(result as ISystem);
        } else {
          this.#createUniverseScene(result as ISystem[]);
        }
      } catch (e) {
        console.error(e);
      }
    },
  });

  #selectSystem(e: Event) {
    const system = (e.currentTarget as HTMLElement).dataset.system;
    console.log(system);
    if (system) {
      this.system = system;
      this.#scene?.clear();
    }
  }

  render() {
    return html`<section
      id="navmap-root"
      class="navmap-root ${this.system ? "system-map" : "universe-map"}"
    ></section>`;
  }
}
