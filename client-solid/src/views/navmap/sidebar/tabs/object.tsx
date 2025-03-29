import { useContext } from "solid-js";
import { NavMapContext } from "../../../../data/context";
import sx from "../sidebar.module.css";

export function ObjectTabs() {
  const ctx = useContext(NavMapContext);
  const object = ctx?.object;

  return (
    <div class={sx.dynamic}>
      <p innerHTML={object()?.infocard} />
    </div>
  );
}
