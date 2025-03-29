import { createEffect, createResource, createSignal } from "solid-js";
import Panzoom from "@panzoom/panzoom";
import { useSearchParams } from "@solidjs/router";
import { ISystemRes } from "../../../../api/src/types";
import { NavMapContext } from "../../data/context";
import { SystemMap } from "./system";
import { UniverseMap } from "./universe";
import { Sidebar } from "./sidebar";
import sx from "./navmap.module.css";

export function NavMapView() {
  const [system, setSystem] = createSignal<string>("");
  const [object, setObject] = createSignal<string>("");
  const [scale, setScale] = createSignal(1);
  const [pan, setPan] = createSignal({ x: 0, y: 0 });
  const [rect, setRect] = createSignal<DOMRect | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  createEffect(() => {
    setSystem((searchParams.system as string) ?? "");
    setObject((searchParams.nickname as string) ?? "");
  });

  const [universeData] = createResource(() =>
    fetch(`http://localhost:3000/system`).then((r) => r.json())
  );
  const [systemData] = createResource(
    () => system(),
    (s) =>
      s
        ? fetch(`http://localhost:3000/system/${s}`)
            .then((r) => r.json())
            .then((r: ISystemRes) => ({ ...r, type: "system" }))
        : Promise.resolve(undefined)
  );
  const [objectData] = createResource(
    () => [object(), systemData()],
    ([o, sys]) => {
      return o
        ? fetch(`http://localhost:3000/search?q=${o}`)
            .then((r) => r.json())
            .then((r) => r[0])
        : sys;
    }
  );

  let moved = false;
  const enablePanzoom = (root: HTMLElement) => {
    setRect(root.getBoundingClientRect());
    const panzoom = Panzoom(root, {
      maxScale: 4,
      minScale: 1,
      roundPixels: true,
      contain: "outside",
      // panOnlyWhenZoomed: true,
      noBind: true,
      handleStartEvent: (e: MouseEvent) => {
        e.preventDefault();
      },
    });
    root.addEventListener("wheel", (e) => {
      panzoom.zoomWithWheel(e);
      setScale(panzoom.getScale());
      setPan({ ...panzoom.getPan() });
    });
    root.addEventListener("pointerdown", (e) => {
      panzoom.handleDown(e);
    });
    root.addEventListener("pointermove", (e) => {
      panzoom.handleMove(e);
      if (e.buttons === 1) {
        setPan({ ...panzoom.getPan() });
        if (Math.sqrt(e.movementX ** 2 + e.movementY ** 2) >= 5) {
          moved = true;
        }
      }
    });
    root.addEventListener("pointerup", (e) => {
      panzoom.handleUp(e);
      if (!moved && (e.target as HTMLElement).id === "navmap-root") {
        setObject("");
      }
    });
    window.addEventListener("resize", () => {
      panzoom.zoom(1);
      setScale(panzoom.getScale());
      setPan({ ...panzoom.getPan() });
      const root = document.getElementById("navmap-root");
      if (root) {
        setRect(root.getBoundingClientRect());
      }
    });
    setScale(panzoom.getScale());
    setPan({ ...panzoom.getPan() });
  };

  createEffect(() => {
    systemData();

    const root = document.getElementById("navmap-root");
    if (root) {
      enablePanzoom(root);
    }
  });

  return (
    <NavMapContext.Provider
      value={{
        universe: universeData,
        system: systemData,
        object: objectData,
        scale,
        pan,
        rect,
        navigate: (props: { system?: string; object?: string }) => {
          setSearchParams({
            ...(props.system != null && { system: props.system }),
            ...((props.system != null || props.object != null) && {
              nickname: props.object,
            }),
          });
        },
      }}
    >
      <Sidebar />
      {/* <div class={sx.spacer} /> */}
      <div class={sx.sizeContainer}>
        {system() ? <SystemMap /> : <UniverseMap />}
      </div>
      {/* <div class={sx.spacer} /> */}
    </NavMapContext.Provider>
  );
}
