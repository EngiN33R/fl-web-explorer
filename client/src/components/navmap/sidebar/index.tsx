import { ISearchResult } from "@api/types";
import sx from "./sidebar.module.css";
import { ObjectDetails } from "./object-details";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useNavMapContext } from "../context";
import { Navigate } from "@/components/icons";
import { Waypoints } from "./waypoints";

export function SearchBox() {
  const { object, findPath } = useNavMapContext();

  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);
  let timeout = 0;
  const { data: searchResult } = useQuery({
    queryKey: ["search", query],
    queryFn: ({ queryKey }) => {
      const [, query] = queryKey;
      if (!query || query.length < 3) {
        return [];
      }

      return new Promise<ISearchResult[]>((resolve, reject) => {
        if (timeout) {
          clearTimeout(timeout);
        }
        timeout = setTimeout(async () => {
          const response = await fetch(
            `${import.meta.env.VITE_API_URL}/nav/search?q=${query}`
          );

          if (!response.ok) {
            reject(new Error(`HTTP error ${response.status}`));
          }

          timeout = 0;
          const result = (await response.json()) as ISearchResult[];
          resolve(result.filter((r) => r.relevance > 2.5));
        }, 500);
      });
    },
  });

  return (
    <div className={sx.search}>
      <input
        type="search"
        placeholder="Search..."
        value={query}
        onFocus={(e) => {
          if (e.target.value.length > 2) {
            setExpanded(true);
          }
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          if (e.target.value.length > 2) {
            setExpanded(true);
          } else {
            setExpanded(false);
          }
        }}
      />
      {expanded && searchResult?.length !== 0 && (
        <ul className={sx.results}>
          {searchResult?.map((e: ISearchResult) => (
            <li data-relevance={e.relevance}>
              <Link
                className={sx.result}
                to="/navmap/$system"
                params={{ system: e.system?.nickname ?? e.nickname }}
                search={{ nickname: e.system ? e.nickname : undefined }}
                data-nickname={e.nickname}
                data-system={e.system?.nickname ?? e.nickname}
              >
                <button onClick={() => setQuery("")}>
                  {e.name}
                  {e.system && (
                    <small>
                      {e.system?.name}, Sector {e.sector}
                    </small>
                  )}
                </button>
              </Link>
              {!!object && (
                <button
                  className={sx.path}
                  disabled={!e.system}
                  onClick={() => {
                    if (object && e.system) {
                      findPath(object.nickname, e.objectNickname);
                      setExpanded(false);
                    }
                  }}
                >
                  <Navigate />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function Sidebar() {
  const { object, waypoints } = useNavMapContext();

  return (
    <aside className={sx.sidebar}>
      {object && (
        <button className={sx.back} onClick={() => history.back()}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width="24"
            height="24"
          >
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
          </svg>
        </button>
      )}
      {object && <ObjectDetails data={object} />}
      {!!waypoints?.length && <Waypoints waypoints={waypoints} />}
    </aside>
  );
}
