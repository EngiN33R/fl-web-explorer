import { useState } from "react";

export const useSort = <S extends string>(initialState?: [S, 1 | -1]) => {
  const [column, setColumn] = useState<S | undefined>(initialState?.[0]);
  const [direction, setDirection] = useState<1 | -1>(initialState?.[1] ?? 1);

  return [
    column,
    direction,
    (column: S, direction?: 1 | -1) => {
      setColumn(column);
      setDirection((val) => ((direction ?? val === 1) ? -1 : 1));
    },
  ] as const;
};
