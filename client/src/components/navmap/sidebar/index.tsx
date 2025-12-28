import sx from "./sidebar.module.css";
import { ObjectDetails } from "./object-details";
import { useNavMapContext } from "@/data/context/navmap";
import { Waypoints } from "./waypoints";
import { SearchBox, SearchDetails } from "./search";
import { PathSection } from "./path";
import { Navigate } from "@/components/icons";
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";

export function Sidebar() {
  const { system, object, waypoints, mode, search, setMode } =
    useNavMapContext();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const navigate = useNavigate();

  const onClear = () => {
    search("", "object");
    if (system) {
      navigate({
        to: "/navmap/$system",
        params: { system: system.nickname },
      });
    }
  };

  const renderPathButton = (query: string) =>
    !query &&
    !object &&
    mode === "object" && (
      <button
        className={sx.action}
        onClick={() => {
          setMode("path");
        }}
      >
        <Navigate />
      </button>
    );

  const showSidebar = mode !== "object" || (!!system && !!object);

  if (!showSidebar) {
    return (
      <SearchBox
        className={sx.floating}
        onDetailedSearch={(query) => search(query, "search")}
        onClear={onClear}
        extra={renderPathButton}
        query={searchQuery}
        onQueryChange={setSearchQuery}
        onClickResult={(result) => {
          navigate({
            to: "/navmap/$system",
            params: { system: result.system?.nickname },
            search: { nickname: result.nickname },
          });
        }}
      />
    );
  }

  return (
    <aside className={sx.sidebar}>
      {/* <Link to="/navmap/$system" params={{ system: system.nickname }}>
        <button className={sx.back}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width="24"
            height="24"
          >
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
          </svg>
        </button>
      </Link> */}
      <SearchBox
        onDetailedSearch={(query) => search(query, "search")}
        onClear={onClear}
        extra={renderPathButton}
        query={searchQuery}
        onQueryChange={setSearchQuery}
      />
      {object && mode === "object" && <ObjectDetails data={object} />}
      {mode === "search" && <SearchDetails />}
      {mode === "path" && <PathSection />}
      {!!waypoints?.length && <Waypoints waypoints={waypoints} />}
    </aside>
  );
}
