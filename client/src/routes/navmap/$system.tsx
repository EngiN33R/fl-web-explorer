import {
  toRelPos,
  useLineStyle,
  useObjectDetails,
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
import { CSSProperties, useRef, useEffect, useState, useMemo } from "react";
import { z } from "zod";
import styles from "./navmap.module.css";
import { RiMapPin2Fill } from "react-icons/ri";
import { useNavMapContext } from "@/data/context/navmap";
import { FlagCircled } from "@/components/icons";

interface TradeLaneObject {
  startPosition: [number, number, number];
  endPosition: [number, number, number];
}

export const IGNORED_ARCHETYPES = [
  "trade_lane_ring",
  "nav_buoy",
  "hazard_buoy",
  // "wplatform",
  "docking_fixture",
  // "com_sat",
  // /^depot_.+/,
  // /^wplatform_.+/,
  // /^space_tank.+/,
  // /^track_ring.+/,
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
  labelOffset = 0,
}: {
  data: IBaseRes | IObjectRes;
  system: ISystemRes;
  labelOffset?: number;
}) {
  const { scale } = useTransformState();
  const details = useObjectDetails(data, {
    icon: <FlagCircled />,
  });
  const [relX, , relY] = useRelPos(data.position, system.size);

  return (
    <Link
      className={styles.node}
      to="/navmap/$system"
      params={{ system: system.nickname }}
      search={{ nickname: data.nickname }}
      state={(state) => ({ ...state })}
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
      <i className={styles.icon}>{details.icon}</i>
      <span
        className={styles.label}
        style={{
          marginTop: `${10 + labelOffset}px`,
        }}
      >
        {data.name}
      </span>
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
  const { scale } = useTransformState();
  const size = system.size ?? 1;
  const lineStyle = useLineStyle(data.startPosition, data.endPosition, size);

  return (
    <div
      className={styles.connection}
      style={{
        ...lineStyle,
        borderColor: "#08f",
        color: "#08f",
        borderWidth: 2 / scale,
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
  const { scale } = useTransformState();
  const size = system?.size ?? 1;
  const lineStyle = useLineStyle(data.from.position, data.to.position, size);

  return (
    <div
      className={styles.connection}
      style={{
        ...lineStyle,
        borderColor: "#f0f",
        color: "#f0f",
        borderWidth: 2 / scale,
      }}
    />
  );
}

function NavPoint({
  position,
  system,
}: {
  position: [number, number, number];
  system?: ISystemRes;
}) {
  const { scale } = useTransformState();
  const size = system?.size ?? 1;
  const [relX, , relY] = useRelPos(position, size);

  return (
    <div
      className={styles.node}
      style={{
        left: `${relX}%`,
        top: `${relY}%`,
        transform: `translateX(-50%) scale(${1 / (scale * 2)})`,
      }}
    >
      <i className={styles.icon} style={{ backgroundColor: "#f0f" }} />
    </div>
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
    if (typeof data.size === "number") {
      width = height = (data.size as number) * 2;
    } else {
      width = (data.size as number[])[0] * 2;
      height = (data.size as number[])[2] * 2;
    }
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
  const { mode, object, system } = useNavMapContext();
  const { scale, pan } = useTransformState();

  const opacity = 1 / (scale || 1);

  const showSidebar = mode !== "object" || (!!system && !!object);

  const x = -pan.x / scale;
  const left = showSidebar
    ? Math.max(x + 410 / scale, 10)
    : Math.max(x + 10 / scale, 10);

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
              left: `${left}px`,
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
  const { scale } = useTransformState();
  const containerRef = useRef<HTMLDivElement>(null);
  const [labelOffsets, setLabelOffsets] = useState<Map<string, number>>(
    new Map(),
  );
  const previousOffsetsRef = useRef<string>("");

  // Collect all nodes
  const allNodes = useMemo(() => {
    if (!system) return [];
    return [
      ...(system.bases ?? []).map((data) => ({
        data,
        nickname: data.nickname,
      })),
      ...(system.objects ?? []).filter(objectFilter).map((data) => ({
        data,
        nickname: data.nickname,
      })),
    ];
  }, [system]);

  // Calculate label offsets after render - only recalculate when nodes/scale/system change
  useEffect(() => {
    if (allNodes.length === 0 || !containerRef.current) {
      setLabelOffsets(new Map());
      return;
    }

    // Wait for DOM to be ready, then calculate offsets based on base positions
    const timeoutId = setTimeout(() => {
      const offsets = new Map<string, number>();
      const nodeElements: Array<{
        nickname: string;
        iconEl: HTMLElement;
        labelEl: HTMLElement;
        iconRect: DOMRect;
        labelWidth: number;
        labelHeight: number;
        labelLeft: number;
        labelRight: number;
        baseLabelTop: number; // Position without offset
      }> = [];

      // First, temporarily reset all label offsets to get base positions
      allNodes.forEach(({ nickname }) => {
        const nodeEl = containerRef.current?.querySelector(
          `[data-nickname="${nickname}"][data-type="object"]`,
        ) as HTMLElement;
        if (!nodeEl) return;

        const iconEl = nodeEl.querySelector(`.${styles.icon}`) as HTMLElement;
        const labelEl = nodeEl.querySelector(`.${styles.label}`) as HTMLElement;

        if (iconEl && labelEl) {
          // Temporarily set marginTop to base value to get accurate measurements
          const originalMarginTop = labelEl.style.marginTop;
          labelEl.style.marginTop = "10px";

          // Force reflow
          labelEl.offsetHeight;

          const iconRect = iconEl.getBoundingClientRect();
          const labelRect = labelEl.getBoundingClientRect();
          const baseLabelTop = iconRect.bottom + 10; // 10px is the base marginTop

          nodeElements.push({
            nickname,
            iconEl,
            labelEl,
            iconRect,
            labelWidth: labelRect.width,
            labelHeight: labelRect.height,
            labelLeft: labelRect.left,
            labelRight: labelRect.right,
            baseLabelTop,
          });

          // Restore original marginTop
          labelEl.style.marginTop = originalMarginTop;
        }
      });

      // Iterative bidirectional overlap resolution (adapted from Navmap)
      // Each label is checked against ALL others; the lower label gets pushed down.
      // Tracks total movement per iteration; stops when a pass produces zero movement.
      const diffHistory: (number | undefined)[] = [undefined, undefined];
      let iterations = 0;
      const maxIterations = 8;

      while (diffHistory[0] !== 0 && iterations < maxIterations) {
        let diffSum = 0;

        for (let i = 0; i < nodeElements.length; i++) {
          const current = nodeElements[i];

          for (let j = 0; j < nodeElements.length; j++) {
            if (i === j) continue;
            const other = nodeElements[j];

            // Get current computed positions
            const currentOffset = offsets.get(current.nickname) ?? 0;
            const otherOffset = offsets.get(other.nickname) ?? 0;

            const currentLabelTop = current.baseLabelTop + currentOffset;
            const currentLabelBottom = currentLabelTop + current.labelHeight;
            const otherLabelTop = other.baseLabelTop + otherOffset;
            const otherLabelBottom = otherLabelTop + other.labelHeight;

            // AABB overlap check using actual label bounding boxes
            // Horizontal: no overlap if one is entirely left/right of the other
            if (
              current.labelRight <= other.labelLeft ||
              current.labelLeft >= other.labelRight
            )
              continue;
            // Vertical: no overlap if one is entirely above/below the other
            if (
              currentLabelBottom <= otherLabelTop ||
              currentLabelTop >= otherLabelBottom
            )
              continue;

            // Labels overlap — push the lower one down
            if (currentLabelTop <= otherLabelTop) {
              const overlap = currentLabelBottom - otherLabelTop;
              offsets.set(other.nickname, otherOffset + overlap + 2);
              diffSum += overlap;
            } else {
              const overlap = otherLabelBottom - currentLabelTop;
              offsets.set(current.nickname, currentOffset + overlap + 2);
              diffSum += overlap;
            }
          }
        }

        diffHistory.unshift(diffSum);
        diffHistory.pop();
        iterations++;
      }

      const offsetsStr = JSON.stringify(Array.from(offsets.entries()).sort());
      if (previousOffsetsRef.current !== offsetsStr) {
        previousOffsetsRef.current = offsetsStr;
        setLabelOffsets(offsets);
      }
    }, 50); // Small delay to ensure DOM is ready

    return () => clearTimeout(timeoutId);
  }, [allNodes, scale, system]);

  return (
    <article id="navmap-container" className={styles.navmapContainer}>
      <div
        ref={containerRef}
        id="navmap-root"
        className={`${styles.navmapRoot} ${styles.system}`}
      >
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
            labelOffset={labelOffsets.get(data.nickname) ?? 0}
          />
        ))}
        {system?.objects
          ?.filter(objectFilter)
          .map((data) => (
            <Node
              key={`${data.nickname}-${data.position.join(",")}`}
              data={data}
              system={system}
              labelOffset={labelOffsets.get(data.nickname) ?? 0}
            />
          ))}
        {waypoints
          ?.filter(
            (w) => w.type !== "jump" && w.from.system === system?.nickname,
          )
          .flatMap((data) => [
            <NavSegment
              key={
                "segment-" +
                data.type +
                data.from.position.join(",") +
                data.to.position.join(",")
              }
              data={data}
              system={system}
            />,
            <NavPoint
              key={`point-${data.from.position.join(",")}`}
              position={data.from.position}
              system={system}
            />,
            <NavPoint
              key={`point-${data.to.position.join(",")}`}
              position={data.to.position}
              system={system}
            />,
          ])}
        <SectorMarkers />
        <Pin
          position={
            object && object.type !== "system" && object.type !== "zone"
              ? toRelPos<[number, number, number]>(
                  object?.position ?? [0, 0, 0],
                  system?.size ?? 1,
                )
              : undefined
          }
        />
      </div>
    </article>
  );
}
