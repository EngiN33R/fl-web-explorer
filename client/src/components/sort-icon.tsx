import {
  TiArrowSortedDown,
  TiArrowSortedUp,
  TiArrowUnsorted,
} from "react-icons/ti";

export function SortIcon({
  column,
  sort,
}: {
  column: string;
  sort: [string | undefined, 1 | -1];
}) {
  const icon =
    column !== sort[0] ? (
      <TiArrowUnsorted className="unsorted" />
    ) : sort[1] === 1 ? (
      <TiArrowSortedDown className="sorted" />
    ) : (
      <TiArrowSortedUp className="sorted" />
    );

  return <div className="sortIcon">{icon}</div>;
}
