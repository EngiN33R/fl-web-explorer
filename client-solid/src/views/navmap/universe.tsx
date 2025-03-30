import { Accessor, createMemo, For, useContext } from "solid-js";
import { ISystemRes } from "../../../../api/src/types";
import { NavMapContext } from "../../data/context";
import sx from "./navmap.module.css";

function useRelPos<T extends number[]>(pos: T) {
  return pos.map((v) => (v / 18) * 90 + 15) as T;
}

function Node(props: { data: ISystemRes }) {
  const ctx = useContext(NavMapContext);
  const scale = ctx?.scale;

  const [relX, relY] = useRelPos(props.data.position);

  return (
    <button
      class={sx.node}
      data-nickname={props.data.nickname}
      data-type="system"
      title={`${props.data.name} (${props.data.nickname})`}
      style={{
        left: `${relX}%`,
        top: `${relY}%`,
        transform: `translateX(-50%) scale(${1 / scale?.()})`,
      }}
      on:click={() => ctx?.navigate({ system: props.data.nickname })}
    >
      <i class={sx.icon} />
      <span class={sx.label}>{props.data.name}</span>
    </button>
  );
}

function Connection(props: {
  data: readonly ["jumpgate" | "jumphole" | "both", ISystemRes, ISystemRes];
}) {
  const [type, src, dst] = props.data;

  const [ox, oy] = useRelPos(src.position);
  const [tx, ty] = useRelPos(dst.position);
  const rotation = Math.round((Math.atan2(ty - oy, tx - ox) * 180) / Math.PI);
  const color =
    type === "both" ? "#f0f" : type === "jumpgate" ? "#08f" : "#f00";
  const length = Math.sqrt((ox - tx) ** 2 + (oy - ty) ** 2);
  const [relX, relY] = [(tx + ox) / 2, (ty + oy) / 2];

  const style = {
    "border-color": color,
    color,
    width: `${length}%`,
    transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
    left: `${relX}%`,
    top: `${relY}%`,
  };

  return (
    <div
      class={`${sx.connection} ${sx.directional}`}
      style={style}
      data-from={src.nickname}
      data-to={dst.nickname}
    />
  );
}

export function UniverseMap() {
  const ctx = useContext(NavMapContext);
  const universe = ctx?.universe as Accessor<ISystemRes[]>;

  const connections = createMemo(() => {
    if (!universe()) {
      return [];
    }

    const systemsMap = universe().reduce((map, s) => {
      map[s.nickname as string] = s;
      return map;
    }, {} as Record<string, ISystemRes>);

    const map = universe().reduce((map, s) => {
      for (const c of s.connections) {
        const key = `${s.nickname}>${c.system}`;
        let value: "jumphole" | "jumpgate" | "both" = c.type;
        if (map.has(key) && map.get(key) !== value) {
          value = "both";
        }
        map.set(`${s.nickname}>${c.system}`, value);
      }
      return map;
    }, new Map<string, "jumphole" | "jumpgate" | "both">());

    return [
      ...map.entries().map(([conn, type]) => {
        const [src, dst] = conn.split(">").map((s) => systemsMap[s]);
        return [type, src, dst] as const;
      }),
    ];
  });

  return (
    <article id="navmap-container" class={sx.navmapContainer}>
      <div
        id="navmap-root"
        class={`${sx.navmapRoot} ${sx.universe}`}
        style={{
          "background-image": `url(${
            import.meta.env.VITE_API_URL
          }/assets/texture/navmap)`,
        }}
      >
        <For each={connections()}>{(data) => <Connection data={data} />}</For>
        <For each={universe() ?? []}>{(data) => <Node data={data} />}</For>
      </div>
    </article>
  );
}
