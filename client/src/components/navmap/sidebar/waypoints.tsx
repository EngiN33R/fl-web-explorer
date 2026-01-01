import { IWaypointRes } from "@api/types";
import sx from "./sidebar.module.css";
import { Jump, MapArrow, MapArrowCircle } from "@/components/icons";
import { Ids } from "@/components/ids";
import { time } from "@/util";
import { useMemo } from "react";

export function Waypoints({
  waypoints,
  className,
}: {
  waypoints: IWaypointRes[];
  className?: string;
}) {
  const shortWaypoints = useMemo(() => {
    const result: IWaypointRes[] = [];
    for (let i = 0; i < waypoints.length; i++) {
      const w = waypoints[i];
      if (waypoints[i - 1] && waypoints[i + 1] && w.type === "cruise") {
        if (
          waypoints[i - 1].type === "tradelane" &&
          waypoints[i + 1].type === "tradelane"
        ) {
          continue;
        }
        if (
          waypoints[i - 1].type === "tradelane" &&
          waypoints[i + 1].type === "jump" &&
          w.duration <= 30
        ) {
          continue;
        }
        if (
          waypoints[i - 1].type === "jump" &&
          waypoints[i + 1].type === "tradelane" &&
          w.duration <= 30
        ) {
          continue;
        }
      }
      result.push(w);
    }
    return result;
  }, [waypoints]);

  return (
    <div className={`${sx.waypoints} ${className ?? ""}`}>
      <ul className={sx.list}>
        {shortWaypoints.map((w) => (
          <li
            key={w.type + w.from.position.join(",") + w.to.position.join(",")}
          >
            <div className={sx.icon}>
              {w.type === "cruise" && <MapArrow />}
              {w.type === "tradelane" && <MapArrowCircle />}
              {w.type === "jump" && <Jump />}
            </div>
            <div className={sx.label}>
              {w.type === "cruise" && (
                <span>
                  Fly to{" "}
                  {w.to.object ? (
                    <>
                      <Ids>{w.to.object}</Ids>
                      {` (${w.to.sector})`}
                    </>
                  ) : (
                    w.to.sector
                  )}
                </span>
              )}
              {w.type === "tradelane" && w.to.name && (
                <span>Take the {w.to.name} trade lane</span>
              )}
              {w.type === "tradelane" && !w.to.name && (
                <span>
                  Take the trade lane to{" "}
                  {w.to.object ? (
                    <>
                      <Ids>{w.to.object}</Ids>
                      {` (${w.to.sector})`}
                    </>
                  ) : (
                    w.to.sector
                  )}
                </span>
              )}
              {w.type === "jump" && (
                <span>
                  Jump to <Ids>{w.to.system}</Ids>
                </span>
              )}
            </div>
            <div className={sx.detail}>
              {w.type !== "jump" && time(w.duration)}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
