import { Flag, Navigate, Pin, UpRightArrow } from "@/components/icons";
import sx from "./sidebar.module.css";
import { ObjectTabs } from "./tabs/object";
import { BaseTabs } from "./tabs/base";
import { Link } from "@tanstack/react-router";
import { LootableTabs } from "./tabs/lootable";
import { ZoneTabs } from "./tabs/zone";
import { ISearchResult } from "@api/types";
import { useNavMapContext, useObjectDetails } from "@/data/context/navmap";

export function ObjectDetails({ data }: { data: ISearchResult }) {
  const details = useObjectDetails(data);
  const { findPath, setMode } = useNavMapContext();

  return (
    <div id="details-root" className={sx.detailsRoot}>
      <div className={sx.static}>
        {/* <div className={sx.preview}>
          <div className={sx.placeholder}>{details?.icon}</div>
        </div> */}
        <div className={sx.title}>
          <h1 className={sx.name}>{data?.name || "Unnamed"}</h1>
          {"goto" in data && data.goto && (
            <Link
              className={sx.jump}
              to="/navmap/$system"
              params={{ system: data?.goto?.system }}
              search={{ nickname: data?.goto?.object }}
              state={(state) => ({ ...state })}
              data-nickname={data?.goto?.system}
              data-system={data?.goto?.system}
            >
              <UpRightArrow />
            </Link>
          )}
        </div>
        <div className={sx.summary}>
          <div className={sx.icon}>{details?.icon}</div>
          {details?.summary}
        </div>
        {"faction" in data && data.faction && (
          <div className={sx.faction}>
            <div className={sx.icon}>
              <Flag />
            </div>
            {data.faction?.name}
          </div>
        )}
        <div className={sx.location}>
          <div className={sx.icon}>
            <Pin />
          </div>
          {data.type === "system"
            ? data?.territory
            : `${data?.system?.name ?? "Unknown"}, Sector ${data?.sector}`}
        </div>
        <div className={sx.actions}>
          <button
            className={sx.action}
            onClick={() => {
              findPath(undefined, data.nickname);
              setMode("path");
            }}
          >
            <Navigate />
            <span className={sx.label}>Navigate</span>
          </button>
        </div>
      </div>
      {data.type === "base" ? (
        <BaseTabs data={data} />
      ) : data.kind === "lootable_wreck" || data.kind === "lootable_depot" ? (
        <LootableTabs data={data} />
      ) : data.type === "zone" ? (
        <ZoneTabs data={data} />
      ) : (
        <ObjectTabs data={data} />
      )}
    </div>
  );
}
