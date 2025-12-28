import { useState } from "react";
import { useTransformEffect } from "react-zoom-pan-pinch";

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
