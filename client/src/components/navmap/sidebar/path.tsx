import { useEffect, useState } from "react";
import { IoSwapVertical } from "react-icons/io5";
import sx from "./sidebar.module.css";
import { SearchBox } from "./search";
import { ISearchResult } from "@api/types";
import { useNavMapContext } from "@/data/context/navmap";
import { Waypoints } from "./waypoints";
import { useNavigate } from "@tanstack/react-router";

export function PathSection() {
  const { findPath, waypoints } = useNavMapContext();
  const navigate = useNavigate();

  const [from, setFrom] = useState<ISearchResult | undefined>(undefined);
  const [to, setTo] = useState<ISearchResult | undefined>(undefined);

  const [fromQuery, setFromQuery] = useState<string | undefined>(undefined);
  const [toQuery, setToQuery] = useState<string | undefined>(undefined);

  const [fromDisabled, setFromDisabled] = useState(false);
  const [toDisabled, setToDisabled] = useState(false);

  useEffect(() => {
    if (from) {
      setFromQuery(from.name);
    }
    if (to) {
      setToQuery(to.name);
    }
    if (from && to) {
      findPath(
        from.objectNickname ?? from.nickname,
        to.objectNickname ?? to.nickname
      );
      navigate({
        to: "/navmap/$system",
        params: { system: from.system?.nickname },
        state: (state) => ({ ...state, navmapMode: "path" }),
      });
    }
  }, [from, to]);

  const onSwap = () => {
    setFrom(to);
    setTo(from);
  };

  return (
    <div className={sx.path}>
      <div className={sx.points}>
        <div className={sx.from}>
          <SearchBox
            placeholder="From"
            query={fromQuery}
            onQueryChange={(value) => {
              setFromQuery(value);
              setFromDisabled(false);
            }}
            onClickResult={(result) => {
              setFrom(result);
              setFromDisabled(true);
            }}
            searchDisabled={fromDisabled}
          />
        </div>
        <div className={sx.to}>
          <SearchBox
            placeholder="To"
            query={toQuery}
            onQueryChange={(value) => {
              setToQuery(value);
              setToDisabled(false);
            }}
            onClickResult={(result) => {
              setTo(result);
              setToDisabled(true);
            }}
            searchDisabled={toDisabled}
          />
        </div>
        <button className={sx.swap} onClick={onSwap}>
          <IoSwapVertical />
        </button>
      </div>
      {!!waypoints?.length && <Waypoints waypoints={waypoints} />}
    </div>
  );
}
