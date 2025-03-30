import { createResource, createSignal, useContext } from "solid-js";
import { NavMapContext } from "../../../data/context";
import { ISearchResult } from "../../../../../api/src/types";
import sx from "./sidebar.module.css";
import { ObjectDetails } from "./object-details";

export function SearchBox() {
  const ctx = useContext(NavMapContext);
  const [query, setQuery] = createSignal("");
  let timeout = 0;
  const [searchResult] = createResource(
    () => query(),
    (q) => {
      if (!q) {
        return [];
      }

      return new Promise<ISearchResult[]>((resolve, reject) => {
        if (timeout) {
          clearTimeout(timeout);
        }
        timeout = setTimeout(async () => {
          const response = await fetch(
            `${import.meta.env.VITE_API_URL}/nav/search?q=${q}`
          );

          if (!response.ok) {
            reject(new Error(`HTTP error ${response.status}`));
          }

          timeout = 0;
          const result = (await response.json()) as ISearchResult[];
          resolve(result.filter((r) => r.relevance > 2.5));
        }, 500);
      });
    }
  );

  return (
    <div class={sx.search}>
      <input
        type="search"
        placeholder="Search..."
        on:input={(e: Event) => {
          setQuery((e.target as HTMLInputElement).value);
        }}
      />
      {searchResult()?.length !== 0 && (
        <ul class={sx.results}>
          {searchResult()?.map((e: ISearchResult) => (
            <li data-relevance={e.relevance}>
              <button
                class={sx.result}
                data-nickname={e.nickname}
                data-system={e.system?.nickname ?? e.nickname}
                on:click={() => {
                  ctx?.navigate({
                    system: e.system.nickname,
                    object: e.nickname,
                  });
                  setQuery("");
                }}
              >
                {e.name}
                {e.system && <small>{e.system?.name}, Sector A1</small>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function Sidebar() {
  const ctx = useContext(NavMapContext);

  return (
    <aside class={sx.sidebar}>
      {ctx?.object() && (
        <button class={sx.back} on:click={() => history.back()}>
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
      {ctx?.object() && <ObjectDetails />}
    </aside>
  );
}
