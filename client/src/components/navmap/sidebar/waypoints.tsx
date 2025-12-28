import { IWaypointRes } from "@api/types";
import sx from "./sidebar.module.css";
import { Jump, MapArrow, MapArrowCircle } from "@/components/icons";
import { Ids } from "@/components/ids";
import { time } from "@/util";

export function Waypoints({
  waypoints,
  className,
}: {
  waypoints: IWaypointRes[];
  className?: string;
}) {
  return (
    <div className={`${sx.waypoints} ${className ?? ""}`}>
      <ul className={sx.list}>
        {waypoints.map((w) => (
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
              {w.type === "tradelane" && (
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
