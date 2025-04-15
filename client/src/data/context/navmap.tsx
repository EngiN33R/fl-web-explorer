import { ISystemRes } from "@api/types";
import { useQuery } from "@tanstack/react-query";
import { useParams, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { useTransformEffect } from "react-zoom-pan-pinch";

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

export function useTransformState() {
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  useTransformEffect((ref) => {
    setScale(ref.state.scale);
    setPan({ x: ref.state.positionX, y: ref.state.positionY });
  });

  return { scale, pan };
}
