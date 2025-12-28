import { IObjectRes, ISystemRes, IWaypointRes, IZoneRes } from "@api/types";
import { useQuery } from "@tanstack/react-query";
import { useParams, useSearch } from "@tanstack/react-router";
import { createContext, useContext, useState } from "react";

interface INavMapContext {
  system?: ISystemRes;
  object?: ISystemRes | IObjectRes | IZoneRes;
  waypoints?: IWaypointRes[];
  findPath: (from: string, to: string) => void;
}

const NavMapContext = createContext<INavMapContext>({
  findPath: () => {},
});

export function useSystemData() {
  const { system } = useParams({ strict: false });

  const { data } = useQuery<ISystemRes | undefined>({
    queryKey: ["system", system],
    queryFn: () =>
      system
        ? fetch(`${import.meta.env.VITE_API_URL}/nav/system/${system}`)
            .then((r) => r.json())
            .then((r) => ({ ...r, type: "system" }))
        : undefined,
    placeholderData: (prev) => prev,
    enabled: !!system,
  });

  return { data };
}

export function useObjectData(system?: ISystemRes) {
  const { nickname } = useSearch({ strict: false });

  const { data } = useQuery({
    queryKey: ["object", nickname],
    queryFn: () =>
      nickname
        ? fetch(`${import.meta.env.VITE_API_URL}/nav/search?q=${nickname}`)
            .then((r) => r.json())
            .then((r) => r[0])
        : undefined,
    placeholderData: (prev) => prev,
  });

  return { data: nickname ? data : system };
}

export function NavMapProvider({ children }: { children: React.ReactNode }) {
  const { data: system } = useSystemData();
  const { data: object } = useObjectData(system);

  const [from, setFrom] = useState<string | undefined>(undefined);
  const [to, setTo] = useState<string | undefined>(undefined);

  const { data } = useQuery({
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

  return (
    <NavMapContext.Provider
      value={{
        system,
        object,
        waypoints: data,
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
