import { useState } from "react";
import sx from "./sidebar.module.css";
import { SearchBox } from "./search";
import { IoSwapVertical } from "react-icons/io5";

export function PathSection() {
  const [from, setFrom] = useState<string | undefined>(undefined);
  const [to, setTo] = useState<string | undefined>(undefined);

  return (
    <div className={sx.path}>
      <div className={sx.points}>
        <div className={sx.from}>
          <SearchBox />
        </div>
        <div className={sx.to}>
          <SearchBox />
        </div>
        <button className={sx.swap}>
          <IoSwapVertical />
        </button>
      </div>
    </div>
  );
}
