import { useMemo } from "react";
import { ISystemRes } from "../../../../api/src/types";
import sx from "./navmap.module.css";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useTransformState } from "@/data/context/navmap";

export const Route = createFileRoute("/navmap/")({
  component: UniverseMap,
});

function useRelPos<T extends number[]>(pos: T) {
  return pos.map((v) => (v / 18) * 90 + 15) as T;
}

function Node(props: { data: ISystemRes }) {
  const { scale } = useTransformState();
  const [relX, relY] = useRelPos(props.data.position);

  return (
    <Link to="/navmap/$system" params={{ system: props.data.nickname }}>
      <button
        className={sx.node}
        data-nickname={props.data.nickname}
        data-type="system"
        title={`${props.data.name} (${props.data.nickname})`}
        style={{
          left: `${relX}%`,
          top: `${relY}%`,
          transform: `translateX(-50%) scale(${1 / scale})`,
        }}
      >
        <i className={sx.icon} />
        <span className={sx.label}>{props.data.name}</span>
      </button>
    </Link>
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
    borderColor: color,
    color,
    width: `${length}%`,
    transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
    left: `${relX}%`,
    top: `${relY}%`,
  };

  return (
    <div
      className={`${sx.connection} ${sx.directional}`}
      style={style}
      data-from={src.nickname}
      data-to={dst.nickname}
    />
  );
}

export function UniverseMap() {
  const { data: universe } = useQuery<ISystemRes[]>({
    queryKey: ["universe"],
    queryFn: () =>
      fetch(`${import.meta.env.VITE_API_URL}/nav/system`).then((r) => r.json()),
    initialData: [],
  });

  const connections = useMemo(() => {
    if (!universe) {
      return [];
    }

    const systemsMap = universe.reduce(
      (map: Record<string, ISystemRes>, s: ISystemRes) => {
        map[s.nickname as string] = s;
        return map;
      },
      {}
    );

    const map = universe.reduce(
      (map: Map<string, "jumphole" | "jumpgate" | "both">, s: ISystemRes) => {
        for (const c of s.connections) {
          const key = `${s.nickname}>${c.system}`;
          let value: "jumphole" | "jumpgate" | "both" = c.type;
          if (map.has(key) && map.get(key) !== value) {
            value = "both";
          }
          map.set(`${s.nickname}>${c.system}`, value);
        }
        return map;
      },
      new Map<string, "jumphole" | "jumpgate" | "both">()
    );

    return [
      ...Array.from(map.entries()).map(([conn, type]) => {
        const [src, dst] = conn.split(">").map((s) => systemsMap[s]);
        return [type, src, dst] as const;
      }),
    ];
  }, [universe]);

  return (
    <article id="navmap-container" className={sx.navmapContainer}>
      <div
        id="navmap-root"
        className={`${sx.navmapRoot} ${sx.universe}`}
        style={{
          backgroundImage: `url(${
            import.meta.env.VITE_API_URL
          }/assets/texture/navmap)`,
        }}
      >
        {connections.map((data) => (
          <Connection
            key={`${data[1].nickname}-${data[2].nickname}`}
            data={data}
          />
        ))}
        {universe.map((data) => (
          <Node key={data.nickname} data={data} />
        ))}
      </div>
    </article>
  );
}
