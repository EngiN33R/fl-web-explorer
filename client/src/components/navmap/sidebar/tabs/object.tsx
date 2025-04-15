import { IObjectRes } from "@api/types";
import sx from "../sidebar.module.css";

export function ObjectTabs({ data }: { data: IObjectRes }) {
  return (
    <div className={sx.dynamic}>
      <p dangerouslySetInnerHTML={{ __html: data.infocard }} />
    </div>
  );
}
