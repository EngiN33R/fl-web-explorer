import { A } from "@solidjs/router";
import { ParentProps } from "solid-js";
import {
  IoCashOutline,
  IoPlanetOutline,
  IoSettingsOutline,
} from "solid-icons/io";
import sx from "./main.module.css";

export function MainLayout(props: ParentProps<{}>) {
  return (
    <main id="main" class={sx.main}>
      <section id="content" class={sx.content}>
        {props.children}
      </section>
      <nav id="navigation" class={sx.navigation}>
        <ul>
          <li>
            <A href="/navmap">
              <IoPlanetOutline size={32} />
              <span>Map</span>
            </A>
          </li>
          <li class={sx.disabled}>
            <A href="/trade">
              <IoCashOutline size={32} />
              <span>Trade</span>
            </A>
          </li>
          <li class={sx.disabled}>
            <A href="/loadout">
              <IoSettingsOutline size={32} />
              <span>Loadouts</span>
            </A>
          </li>
        </ul>
      </nav>
    </main>
  );
}
