import { ISearchResult } from "@api/types";
import sx from "../sidebar.module.css";

export function ObjectTabs({ data }: { data: ISearchResult }) {
  return (
    <div className={sx.dynamic}>
      <p dangerouslySetInnerHTML={{ __html: data.infocard }} />
    </div>
  );
}
