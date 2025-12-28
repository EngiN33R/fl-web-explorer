import { ISearchResult } from "@api/types";
import sx from "./sidebar.module.css";
import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Search, XMark } from "@/components/icons";
import { useNavMapContext, useObjectDetails } from "@/data/context/navmap";
import { useQuery } from "@tanstack/react-query";

export function SearchBox({
  className,
  onDetailedSearch,
  onClear,
  extra,
  query: queryValue,
  onQueryChange,
  onClickResult,
}: {
  className?: string;
  onDetailedSearch?: (query: string) => unknown;
  onClear?: () => unknown;
  extra?: React.ReactNode | ((query: string) => React.ReactNode);
  query?: string;
  onQueryChange?: (query: string) => unknown;
  onClickResult?: (result: ISearchResult) => unknown;
}) {
  const { mode, object } = useNavMapContext();

  const queryState = useState("");
  const [expanded, setExpanded] = useState(false);

  const query = queryValue ?? queryState[0];
  const setQuery = onQueryChange ?? queryState[1];

  const searchTimeout = useRef<number | null>(null);
  const { data: searchResult } = useQuery({
    queryKey: ["search", query],
    queryFn: async ({ queryKey }) => {
      const [, query] = queryKey;
      if (!query || query.length < 2) {
        return [];
      }

      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
      return new Promise<ISearchResult[]>((resolve) => {
        searchTimeout.current = setTimeout(async () => {
          const response = await fetch(
            `${import.meta.env.VITE_API_URL}/nav/search?q=${query}`
          );

          if (!response.ok) {
            throw new Error(`HTTP error ${response.status}`);
          }

          const result = (await response.json()) as ISearchResult[];
          resolve(result.filter((r) => r.relevance > 2));
        }, 500);
      });
    },
  });

  return (
    <div className={`${sx.search} ${className ?? ""}`}>
      <div className={sx.inner}>
        <input
          type="search"
          placeholder="Search..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (e.target.value.length > 1) {
              setExpanded(true);
            } else {
              setExpanded(false);
            }
          }}
          onKeyUp={(e) => {
            if (e.key === "Enter") {
              if (searchTimeout.current) {
                clearTimeout(searchTimeout.current);
              }
              onDetailedSearch?.(query);
              setExpanded(false);
            }
          }}
        />
        {query && query.length > 1 && !!onDetailedSearch && (
          <button
            className={sx.action}
            onClick={() => {
              onDetailedSearch(query);
              setExpanded(false);
            }}
          >
            <Search />
          </button>
        )}
        {!!onClear && (object || query || mode === "search") && (
          <button
            className={sx.action}
            onClick={() => {
              setQuery("");
              onClear();
            }}
          >
            <XMark />
          </button>
        )}
        {typeof extra === "function" ? extra(query) : extra}
      </div>
      {expanded && searchResult?.length !== 0 && (
        <ul className={sx.results}>
          {searchResult?.map((e: ISearchResult) => (
            <li data-relevance={e.relevance}>
              <button
                className={sx.result}
                onClick={() => {
                  setQuery("");
                  onClickResult?.(e);
                }}
              >
                {e.name}
                {e.system && (
                  <small>
                    {e.system?.name}, Sector {e.sector}
                  </small>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function SearchResult({ result }: { result: ISearchResult }) {
  const details = useObjectDetails(result);

  return (
    <li className={sx.result}>
      <Link
        to="/navmap/$system"
        params={{ system: result.system?.nickname ?? result.nickname }}
        search={{ nickname: result.system ? result.nickname : undefined }}
        state={(state) => ({ ...state, navmapMode: "object" })}
        data-nickname={result.nickname}
        data-system={result.system?.nickname ?? result.nickname}
        className={sx.link}
      />
      <div className={sx.name}>{result.name}</div>
      <div className={sx.details}>
        <span>{details.summary}</span>
      </div>
      <div className={sx.details}>
        {"faction" in result && result.faction && (
          <>
            <span>{result.faction.name}</span>
            &middot;
          </>
        )}
        <span>
          {result.system?.name}, Sector {result.sector}
        </span>
      </div>
    </li>
  );
}

export function SearchDetails() {
  const { searchResult } = useNavMapContext();

  return (
    <div className={sx.detailsRoot}>
      <div className={sx.title}>
        <h1 className={sx.name}>Results</h1>
      </div>
      <div className={sx.dynamic}>
        <ul className={sx.searchResults}>
          {searchResult?.map((e: ISearchResult) => (
            <SearchResult key={e.nickname} result={e} />
          ))}
        </ul>
      </div>
    </div>
  );
}
