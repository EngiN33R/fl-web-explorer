import { ISearchResult } from "@api/types";
import sx from "./sidebar.module.css";
import { useCallback, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Navigate, Search, XMark } from "@/components/icons";
import { useNavMapContext, useObjectDetails } from "@/data/context/navmap";

export function SearchBox({ className }: { className?: string }) {
  const { mode, object, searchResult, search, system, setMode } =
    useNavMapContext();
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);

  const searchTimeout = useRef<number | null>(null);
  const onChange = useCallback(
    (value: string) => {
      setQuery(value);
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
      searchTimeout.current = setTimeout(() => {
        search(value);
      }, 500);
    },
    [query]
  );

  return (
    <div className={`${sx.search} ${className ?? ""}`}>
      <div className={sx.inner}>
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
            onChange(e.target.value);
            if (e.target.value.length > 2) {
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
              search(query, "search");
              setExpanded(false);
            }
          }}
        />
        <button
          className={sx.action}
          onClick={() => {
            search(query, "search");
            setExpanded(false);
          }}
        >
          <Search />
        </button>
        <button
          className={sx.action}
          onClick={() => {
            search("", "object");
            setQuery("");
            if (mode === "path") {
              setMode("object");
            } else {
              if (object) {
                navigate({
                  to: "/navmap/$system",
                  params: { system: system?.nickname ?? "" },
                });
              } else {
                setMode("path");
              }
            }
          }}
        >
          {object || mode === "path" ? <XMark /> : <Navigate />}
        </button>
      </div>
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
