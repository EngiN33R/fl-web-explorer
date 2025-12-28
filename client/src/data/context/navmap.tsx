import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useTransformEffect } from "react-zoom-pan-pinch";
import {
  IBaseRes,
  IObjectRes,
  ISearchResult,
  ISystemRes,
  IWaypointRes,
  IZoneRes,
} from "@api/types";
import { GiAnchor } from "react-icons/gi";
import { useQuery } from "@tanstack/react-query";
import { useParams, useSearch } from "@tanstack/react-router";
import {
  Asteroid,
  Jump,
  Lootable,
  Mining,
  Nebula,
  Planet,
  Star,
  System,
  Unknown,
} from "@/components/icons";

type NavMapMode = "object" | "search" | "path";

interface INavMapContext {
  system?: ISystemRes;
  object?: ISearchResult;
  waypoints?: IWaypointRes[];
  searchResult?: ISearchResult[];
  mode: NavMapMode;
  setMode: (mode: NavMapMode) => void;
  search: (query: string, mode?: NavMapMode) => void;
  findPath: (from: string, to: string) => void;
}

const NavMapContext = createContext<INavMapContext>({
  mode: "object",
  setMode: () => {},
  search: () => {},
  findPath: () => {},
});

export function useSystemData() {
  const { system } = useParams({ strict: false });

  const { data } = useQuery<ISystemRes | null>({
    queryKey: ["system", system],
    queryFn: () =>
      system
        ? fetch(`${import.meta.env.VITE_API_URL}/nav/system/${system}`)
            .then((r) => r.json())
            .then((r) => ({ ...r, type: "system" }))
        : null,
    placeholderData: (prev) => prev,
    enabled: !!system,
  });

  return { data: system ? (data ?? undefined) : undefined };
}

export function useObjectData() {
  const { nickname } = useSearch({ strict: false });

  const { data } = useQuery({
    queryKey: ["object", nickname],
    queryFn: () =>
      nickname
        ? fetch(`${import.meta.env.VITE_API_URL}/nav/search?q=${nickname}`)
            .then((r) => r.json())
            .then((r) => r[0] as INavMapContext["object"])
        : null,
    placeholderData: (prev) => prev,
  });

  return { data: nickname ? (data ?? undefined) : undefined };
}

export function NavMapProvider({ children }: { children: React.ReactNode }) {
  const { data: system } = useSystemData();
  const { data: object } = useObjectData();

  console.log(history.state);

  const [mode, setModeRaw] = useState<NavMapMode>(
    history.state?.navmapMode ?? "object"
  );
  const setMode = (mode: NavMapMode) => {
    setModeRaw(mode);
    history.pushState({ ...history.state, navmapMode: mode }, "");
  };
  const [from, setFrom] = useState<string | undefined>(undefined);
  const [to, setTo] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState<string | undefined>(
    history.state?.navmapSearchQuery
  );

  useEffect(() => {
    setModeRaw(history.state?.navmapMode ?? "object");
  }, [history.state?.navmapMode]);

  const { data: waypoints } = useQuery({
    queryKey: ["path", from, to],
    queryFn: ({ queryKey }) => {
      const [, from, to] = queryKey;
      if (!from || !to) {
        return [];
      }
      return fetch(
        `${import.meta.env.VITE_API_URL}/nav/path?from=${from}&to=${to}`
      )
        .then((r) => r.json())
        .then((r) => r.waypoints as IWaypointRes[]);
    },
  });

  const { data: searchResult } = useQuery({
    queryKey: ["search", searchQuery],
    queryFn: async ({ queryKey }) => {
      const [, query] = queryKey;
      if (!query || query.length < 3) {
        return [];
      }

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/nav/search?q=${query}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const result = (await response.json()) as ISearchResult[];
      return result.filter((r) => r.relevance > 2);
    },
  });

  return (
    <NavMapContext.Provider
      value={{
        system,
        object,
        waypoints,
        searchResult,
        mode,
        setMode: (mode) => {
          setMode(mode);
          history.pushState({ ...history.state, navmapMode: mode }, "");
        },
        search: (query, mode) => {
          setModeRaw(mode ?? history.state?.navmapMode ?? "object");
          history.pushState(
            {
              ...history.state,
              navmapSearchQuery: query,
              navmapMode: mode ?? history.state?.navmapMode,
            },
            ""
          );
          setSearchQuery(query);
        },
        findPath: (from, to) => {
          setFrom(from);
          setTo(to);
        },
      }}
    >
      {children}
    </NavMapContext.Provider>
  );
}

export function useNavMapContext() {
  return useContext(NavMapContext);
}

export function useTransformState() {
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  useTransformEffect((ref) => {
    setScale(ref.state.scale);
    setPan({ x: ref.state.positionX, y: ref.state.positionY });
  });

  return { scale, pan };
}

export function toRelPos<T extends number[]>(pos: T, size: number) {
  return pos.map((v) => 50 + (v / size) * 100) as T;
}

export function useRelSize<T extends number[]>(pos: T, size: number) {
  return pos.map((v) => (v / size) * 100) as T;
}

export function useRelPos<T extends number[]>(pos: T, size: number) {
  return toRelPos(pos, size) as T;
}

export function useLineStyle<T extends number[]>(
  start: T,
  end: T,
  size: number
) {
  const [ox, oz, oy] = useRelPos(start, size);
  const [tx, tz, ty] = useRelPos(end, size);
  const length = Math.sqrt((ox - tx) ** 2 + (oy - ty) ** 2 + (oz - tz) ** 2);
  const width = `${length}%`;
  const rotation = Math.round((Math.atan2(ty - oy, tx - ox) * 180) / Math.PI);
  const [relX, relY] = [(tx + ox) / 2, (ty + oy) / 2];

  return {
    width,
    transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
    left: `${relX}%`,
    top: `${relY}%`,
  };
}

export function useObjectDetails(
  data: IObjectRes | IZoneRes | IBaseRes | ISystemRes,
  fallback = { icon: <Unknown /> } as {
    icon: React.ReactNode;
    summary?: string;
  }
) {
  return useMemo(() => {
    if (!data) {
      return { summary: "Unknown", ...fallback };
    }

    if (data.type === "object" && data.archetype === "dock_ring") {
      return { icon: <GiAnchor className="fill" />, summary: "Docking Ring" };
    }

    switch (data.kind) {
      case "system":
        return { icon: <System />, summary: "System" };
      case "zone_nebula":
        return { icon: <Nebula />, summary: "Nebula" };
      case "zone_mines":
        return {
          icon: <Asteroid />,
          summary: "Minefield",
        };
      case "zone_rocky":
        return {
          icon: <Asteroid />,
          summary: "Rocky Asteroid Field",
        };
      case "zone_icy":
        return {
          icon: <Asteroid />,
          summary: "Icy Asteroid Field",
        };
      case "zone_crystal":
        return {
          icon: <Asteroid />,
          summary: "Ice Crystal Field",
        };
      case "zone_debris":
        return {
          icon: <Asteroid />,
          summary: "Debris Field",
        };
      case "zone_gas":
        return {
          icon: <Asteroid />,
          summary: "Explosive Gas Field",
        };
      case "zone_lava":
        return {
          icon: <Asteroid />,
          summary: "Lava Asteroid Field",
        };
      case "jump_gate":
        return {
          icon: <Jump />,
          summary: "Jump Gate",
        };
      case "jump_hole":
        return {
          icon: <Jump />,
          summary: "Jump Hole",
        };
      case "lootable_wreck":
        return {
          icon: <Lootable />,
          summary: "Wreck",
        };
      case "lootable_depot":
        return {
          icon: <Lootable />,
          summary: "Depot",
        };
      case "planet":
        return {
          icon: <Planet />,
          summary: "Planet",
        };
      case "station":
        return {
          icon: <GiAnchor className="fill" />,
          summary: "Station",
        };
      case "star":
        return {
          icon: <Star />,
          summary: "Star",
        };
      case "mineable":
        return {
          icon: <Mining />,
          summary: "Mineable Resource",
        };
      default:
        return {
          summary: `Unknown (${"archetype" in data ? data.archetype : data.kind})`,
          ...fallback,
        };
    }
  }, [data, fallback]);
}
