import sx from "./sidebar.module.css";
import { ObjectDetails } from "./object-details";
import { useNavMapContext } from "@/data/context/navmap";
import { Waypoints } from "./waypoints";
import { SearchBox, SearchDetails } from "./search";

export function Sidebar() {
  const { system, object, waypoints, mode } = useNavMapContext();

  if (mode === "object" && (!system || !object)) {
    return <SearchBox className={sx.floating} />;
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
      <SearchBox />
      {object && mode === "object" && <ObjectDetails data={object} />}
      {mode === "search" && <SearchDetails />}
      {!!waypoints?.length && <Waypoints waypoints={waypoints} />}
    </aside>
  );
}
