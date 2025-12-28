import {
  toRelPos,
  useLineStyle,
  useRelPos,
  useRelSize,
  useTransformState,
} from "@/data/context/navmap";
import {
  IBaseRes,
  IObjectRes,
  ISystemRes,
  IWaypointRes,
  IZoneRes,
} from "@api/types";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { CSSProperties, useRef } from "react";
import { z } from "zod";
import styles from "./navmap.module.css";
import { RiMapPin2Fill } from "react-icons/ri";
import { useNavMapContext } from "@/data/context/navmap";

interface TradeLaneObject {
  startPosition: [number, number, number];
  endPosition: [number, number, number];
}

export const IGNORED_ARCHETYPES = [
  "trade_lane_ring",
  "nav_buoy",
  "hazard_buoy",
  "wplatform",
  "docking_fixture",
  "com_sat",
  /^depot_.+/,
  /^wplatform_.+/,
  /^space_tank.+/,
  /^track_ring.+/,
];

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
    (!z.properties?.includes("EXCLUSION1") &&
      z.visit?.includes("ALWAYS_HIDDEN"))
  );

function Node({
  data,
  system,
}: {
  data: IBaseRes | IObjectRes;
  system: ISystemRes;
}) {
  const { scale } = useTransformState();
  const [relX, , relY] = useRelPos(data.position, system.size);

  return (
    <Link
      className={styles.node}
      to="/navmap/$system"
      params={{ system: system.nickname }}
      search={{ nickname: data.nickname }}
      data-nickname={data.nickname}
      data-type="object"
      data-archetype={data.archetype}
      title={`${data.name} (${data.nickname})`}
      style={{
        left: `${relX}%`,
        top: `${relY}%`,
        transform: `translateX(-50%) scale(${1 / scale})`,
      }}
    >
      <i className={styles.icon} />
      <span className={styles.label}>{data.name}</span>
    </Link>
  );
}

function TradeLane({
  data,
  system,
}: {
  data: TradeLaneObject;
  system: ISystemRes;
}) {
  const size = system.size ?? 1;
  const lineStyle = useLineStyle(data.startPosition, data.endPosition, size);

  return (
    <div
      className={styles.connection}
      style={{
        ...lineStyle,
        borderColor: "#08f",
        color: "#08f",
      }}
    />
  );
}

function NavSegment({
  data,
  system,
}: {
  data: IWaypointRes;
  system?: ISystemRes;
}) {
  const size = system?.size ?? 1;
  const lineStyle = useLineStyle(data.from.position, data.to.position, size);

  return (
    <div
      className={styles.connection}
      style={{
        ...lineStyle,
        borderColor: "#f0f",
        color: "#f0f",
        borderWidth: 2,
      }}
    />
  );
}

function Zone({ data, system }: { data: IZoneRes; system: ISystemRes }) {
  const router = useRouter();
  const { object: selectedObject } = useNavMapContext();

  const size = system.size ?? 1;

  const [relX, , relY] = useRelPos(data.position, size);
  let width = 0;
  let height = 0;
  if (data.shape === "sphere") {
    width = height = (data.size as number) * 2;
  } else if (data.shape === "cylinder") {
    width = (data.size as number[])[1];
    height = (data.size as number[])[0];
  } else if (data.shape === "box") {
    width = (data.size as number[])[0];
    height = (data.size as number[])[2];
  } else {
    width = (data.size as number[])[0] * 2;
    height = (data.size as number[])[2] * 2;
  }
  const [relW, relH] = useRelSize([width, height], size);
  const rotation = data.rotate?.[1] ? -data.rotate[1] : 0;
  let zIndex = relW >= 90 ? 2 : 3;
  let borderColor = data.fogColor ?? "#888";
  if (data.damage) {
    borderColor = "#f00";
  }
  const style: React.CSSProperties = {
    left: `${relX}%`,
    top: `${relY}%`,
    transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
    width: `${relW}%`,
    height: `${relH}%`,
  };

  if (
    data.fogColor &&
    !data.properties?.includes("EXCLUSION1") &&
    !data.properties?.includes("EXCLUSION2")
  ) {
    style.backgroundColor = data.fogColor + "66";
    style.borderColor = borderColor;
  }
  if (data.shape === "box" || data.shape === "cylinder") {
    style.borderRadius = 0;
    zIndex = 4;
  }
  if (relW >= 90) {
    style.opacity = 0.4;
  }
  style.zIndex = zIndex;
  if (selectedObject?.nickname === data.nickname) {
    style.outline = "2px solid #f70";
  }

  const downRef = useRef(false);
  const movingDelta = useRef(0);

  return (
    <div
      className={styles.zone}
      style={style}
      data-nickname={data.nickname}
      data-type="zone"
      data-properties={`${data.properties?.join(",")}${
        data.loot ? ",LOOTABLE" : ""
      }`}
      title={`${data.name} (${data.nickname})`}
      onPointerDown={() => {
        downRef.current = true;
      }}
      onPointerMove={(e) => {
        if (downRef.current) {
          movingDelta.current += e.movementX + e.movementY;
        }
      }}
      onPointerUp={() => {
        if (downRef.current && !movingDelta.current) {
          router.navigate({
            to: "/navmap/$system",
            params: { system: system.nickname },
            search: { nickname: data.nickname },
          });
        }
        movingDelta.current = 0;
        downRef.current = false;
      }}
    />
  );
}

export const Route = createFileRoute("/navmap/$system")({
  component: RouteComponent,
  validateSearch: z.object({
    nickname: z.string().optional(),
  }),
});

function SectorMarkers() {
  const { scale, pan } = useTransformState();

  const opacity = 1 / (scale || 1);

  return (
    <>
      {Array.from({ length: 8 }).map((_, idx) => {
        return (
          <span
            key={`horizontal-${idx}`}
            className={`${styles.sector} ${styles.horizontal}`}
            style={{
              left: `${6 + 12.5 * idx}%`,
              top: `${Math.max(-pan.y / scale + 5, 5)}px`,
              opacity,
            }}
          >
            {String.fromCodePoint(65 + idx)}
          </span>
        );
      })}
      {Array.from({ length: 8 }).map((_, idx) => {
        return (
          <span
            key={`vertical-${idx}`}
            className={`${styles.sector} ${styles.vertical}`}
            style={{
              top: `${6 + 12.5 * idx}%`,
              left: `${Math.max(-pan.x / scale + 10, 10)}px`,
              opacity,
            }}
          >
            {idx + 1}
          </span>
        );
      })}
    </>
  );
}

function Pin({ position }: { position?: [number, number, number] }) {
  const { scale } = useTransformState();

  let pinStyle: CSSProperties;
  if (!position) {
    pinStyle = { display: "none" };
  } else {
    const [pinX, , pinY] = position;

    pinStyle = {
      left: `${pinX}%`,
      top: `${pinY}%`,
      transform: `translate(calc(-50% - ${3.5 / (scale ?? 1)}px), calc(-50% - ${
        16 / (scale ?? 1)
      }px)) scale(${1 / (scale ?? 1)})`,
    };
  }

  return (
    <div className={styles.pin} style={pinStyle}>
      <RiMapPin2Fill size={32} color="#f00" />
    </div>
  );
}

function RouteComponent() {
  const { system, object, waypoints } = useNavMapContext();

  return (
    <article id="navmap-container" className={styles.navmapContainer}>
      <div id="navmap-root" className={`${styles.navmapRoot} ${styles.system}`}>
        {system?.tradelanes?.map((data) => (
          <TradeLane
            key={
              data.startPosition.join(",") + ">" + data.endPosition.join(",")
            }
            data={data}
            system={system}
          />
        ))}
        {system?.zones
          ?.filter(zoneFilter)
          .map((data) => (
            <Zone key={data.nickname} data={data} system={system} />
          ))}
        {system?.bases?.map((data) => (
          <Node
            key={`${data.nickname}-${data.position.join(",")}`}
            data={data}
            system={system}
          />
        ))}
        {system?.objects
          ?.filter(objectFilter)
          .map((data) => (
            <Node
              key={`${data.nickname}-${data.position.join(",")}`}
              data={data}
              system={system}
            />
          ))}
        {waypoints
          ?.filter(
            (w) => w.type !== "jump" && w.from.system === system?.nickname
          )
          .map((data) => (
            <NavSegment
              key={
                data.type +
                data.from.position.join(",") +
                data.to.position.join(",")
              }
              data={data}
              system={system}
            />
          ))}
        <SectorMarkers />
        <Pin
          position={
            object && object.type !== "system" && object.type !== "zone"
              ? toRelPos<[number, number, number]>(
                  object?.position ?? [0, 0, 0],
                  system?.size ?? 1
                )
              : undefined
          }
        />
      </div>
    </article>
  );
}
