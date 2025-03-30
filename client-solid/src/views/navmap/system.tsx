import { Accessor, createMemo, For, Index, JSX, useContext } from "solid-js";
import { RiMapMapPin2Fill } from "solid-icons/ri";
import type {
  IBaseRes,
  IObjectRes,
  ISystemRes,
  IZoneRes,
} from "../../../../api/src/types";
import { NavMapContext } from "../../data/context";
import sx from "./navmap.module.css";
import { Galaxy } from "../../components/icons";
import { SearchBox } from "./sidebar";

export const IGNORED_ARCHETYPES = [
  "trade_lane_ring",
  "nav_buoy",
  "hazard_buoy",
];

function toRelPos<T extends number[]>(pos: T, size: number) {
  return pos.map((v) => 50 + (v / size) * 100);
}

function useRelSize<T extends number[]>(pos: T) {
  const ctx = useContext(NavMapContext);
  const size = ctx?.system()?.size ?? 1;
  return pos.map((v) => (v / size) * 100);
}

function useRelPos<T extends number[]>(pos: T) {
  const ctx = useContext(NavMapContext);
  const size = ctx?.system()?.size ?? 1;
  return toRelPos(pos, size);
}

const objectFilter = (o: IObjectRes) =>
  !(
    !o.nickname ||
    !o.name ||
    !!o.parent ||
    IGNORED_ARCHETYPES.some((a) => !!o.archetype?.match(a))
  );

const zoneFilter = (z: IZoneRes) =>
  !(
    !z.nickname ||
    z.vignetteType ||
    (!z?.properties?.length && !z.name && !z.infocard) ||
    // zone.properties.includes("EXCLUSION2") ||
    (!z.properties?.includes("EXCLUSION1") &&
      z.visit?.includes("ALWAYS_HIDDEN"))
  );

function Node(props: { data: IObjectRes | IBaseRes }) {
  const ctx = useContext(NavMapContext);
  const scale = ctx?.scale;

  const [relX, , relY] = useRelPos(props.data.position);

  return (
    <button
      class={sx.node}
      data-nickname={props.data.nickname}
      data-type="object"
      data-archetype={props.data.archetype}
      title={`${props.data.name} (${props.data.nickname})`}
      style={{
        left: `${relX}%`,
        top: `${relY}%`,
        transform: `translateX(-50%) scale(${1 / scale?.()})`,
      }}
      on:click={(e) => {
        e.stopPropagation();
        ctx?.navigate({ object: props.data.nickname });
      }}
    >
      <i class={sx.icon} />
      <span class={sx.label}>{props.data.name}</span>
    </button>
  );
}

function TradeLane(props: { data: ISystemRes["tradelanes"][number] }) {
  const [ox, oz, oy] = useRelPos(props.data.startPosition);
  const [tx, tz, ty] = useRelPos(props.data.endPosition);
  const length = Math.sqrt((ox - tx) ** 2 + (oy - ty) ** 2 + (oz - tz) ** 2);
  const width = `${length}%`;
  const rotation = Math.round((Math.atan2(ty - oy, tx - ox) * 180) / Math.PI);
  const [relX, relY] = [(tx + ox) / 2, (ty + oy) / 2];

  return (
    <div
      class={sx.connection}
      style={{
        "border-color": "#08f",
        color: "#08f",
        width,
        transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
        left: `${relX}%`,
        top: `${relY}%`,
      }}
    />
  );
}

function Zone(props: { data: IZoneRes }) {
  const ctx = useContext(NavMapContext);

  const [relX, , relY] = useRelPos(props.data.position);
  let width = 0;
  let height = 0;
  if (props.data.shape === "sphere") {
    width = height = (props.data.size as number) * 2;
  } else if (props.data.shape === "cylinder") {
    width = (props.data.size as number[])[1];
    height = (props.data.size as number[])[0];
  } else if (props.data.shape === "box") {
    width = (props.data.size as number[])[0];
    height = (props.data.size as number[])[2];
  } else {
    width = (props.data.size as number[])[0] * 2;
    height = (props.data.size as number[])[2] * 2;
  }
  const [relW, relH] = useRelSize([width, height]);
  const rotation = props.data.rotate?.[1] ? -props.data.rotate[1] : 0;
  let zIndex = relW >= 90 ? 2 : 3;
  let borderColor = props.data.fogColor ?? "#888";
  if (props.data.damage) {
    borderColor = "#f00";
  }
  const style: JSX.CSSProperties = {
    left: `${relX}%`,
    top: `${relY}%`,
    transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
    width: `${relW}%`,
    height: `${relH}%`,
  };

  if (
    props.data.fogColor &&
    !props.data.properties?.includes("EXCLUSION1") &&
    !props.data.properties?.includes("EXCLUSION2")
  ) {
    style["background-color"] = props.data.fogColor + "66";
    style["border-color"] = borderColor;
  }
  if (props.data.shape === "box") {
    style["border-radius"] = 0;
    zIndex = 4;
  }
  if (relW >= 90) {
    style.opacity = 0.4;
  }
  style["z-index"] = zIndex;

  return (
    <div
      class={sx.zone}
      style={style}
      data-nickname={props.data.nickname}
      data-type="zone"
      data-properties={`${props.data.properties?.join(",")}${
        props.data.loot ? ",LOOTABLE" : ""
      }`}
      title={`${props.data.name} (${props.data.nickname})`}
      on:click={(e) => {
        e.stopPropagation();
        ctx?.navigate({ object: props.data.nickname });
      }}
    />
  );
}

export function SystemMap() {
  const ctx = useContext(NavMapContext);
  const system = ctx?.system as Accessor<ISystemRes>;

  const pinStyle = createMemo(() => {
    const object = ctx?.object();

    if (!object || object.type === "system") {
      return { display: "none" };
    }

    const scale = ctx?.scale() ?? 1;
    const [pinX, , pinY] = toRelPos(
      object?.position ?? [0, 0, 0],
      system()?.size ?? 1
    );

    return {
      left: `${pinX}%`,
      top: `${pinY}%`,
      // transform: `translate(calc(-50% + ${1 * (scale - 1)}px), calc(-50% - ${
      //   16 / ctx?.scale()
      // }px)) scale(${1 / scale})`,
      transform: `translate(calc(-50% - ${3.5 / scale}px), calc(-50% - ${
        16 / scale
      }px)) scale(${1 / scale})`,
    };
  });

  return (
    <article id="navmap-container" class={sx.navmapContainer}>
      <SearchBox />
      <div id="navmap-root" class={`${sx.navmapRoot} ${sx.system}`}>
        {/* <Index each={new Array(64)}>
          {(_, idx) => {
            const row = idx % 8;
            const col = Math.floor(idx / 8);
            return (
              <div
                class={`${sx.sector} ${sx.cell}`}
                style={{
                  top: `${6.25 + 12.5 * col}%`,
                  left: `${6.25 + 12.5 * row}%`,
                }}
              >
                {String.fromCodePoint(65 + row)}
                {col + 1}
              </div>
            );
          }}
        </Index> */}
        <For each={system()?.tradelanes ?? []}>
          {(data) => <TradeLane data={data} />}
        </For>
        <For each={system()?.zones.filter(zoneFilter) ?? []}>
          {(data) => <Zone data={data} />}
        </For>
        <For each={system()?.bases ?? []}>{(data) => <Node data={data} />}</For>
        <For each={system()?.objects.filter(objectFilter) ?? []}>
          {(data) => <Node data={data} />}
        </For>
        <Index each={new Array(8)}>
          {(_, idx) => {
            const oy = createMemo(
              () => -(((ctx?.rect()?.height ?? 0) / 100) * 50) / ctx?.scale()
            );

            return (
              <span
                class={`${sx.sector} ${sx.horizontal}`}
                style={{
                  left: `${6 + 12.5 * idx}%`,
                  top: `calc(50% - ${ctx?.pan()?.y}px)`,
                  "margin-top": `${oy()}px`,
                }}
              >
                {String.fromCodePoint(65 + idx)}
              </span>
            );
          }}
        </Index>
        <Index each={new Array(8)}>
          {(_, idx) => {
            const ox = createMemo(
              () => -(((ctx?.rect()?.width ?? 0) / 100) * 50 - 8) / ctx?.scale()
            );

            return (
              <span
                class={`${sx.sector} ${sx.vertical}`}
                style={{
                  top: `${6 + 12.5 * idx}%`,
                  left: `calc(50% - ${ctx?.pan()?.x}px)`,
                  "margin-left": `${ox()}px`,
                }}
              >
                {idx + 1}
              </span>
            );
          }}
        </Index>
        <span class={sx.title}>{system()?.name}</span>
        <i class={sx.pin} style={pinStyle()}>
          <RiMapMapPin2Fill stroke="#fff" stroke-width={2} color="#b33" />
        </i>
      </div>
      <button
        class={sx.home}
        title="Sector map"
        on:click={() => ctx?.navigate({ system: "" })}
      >
        <Galaxy />
      </button>
    </article>
  );
}
