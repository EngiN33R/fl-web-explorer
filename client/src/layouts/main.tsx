import { Link } from "@tanstack/react-router";
import {
  IoCashOutline,
  IoPlanetOutline,
  IoSettingsOutline,
} from "react-icons/io5";
import styles from "./main.module.css";
import { PropsWithChildren } from "react";
import { NotificationsHost } from "@/data/context/notifications";

export function MainLayout({ children }: PropsWithChildren) {
  return (
    <div className={styles.root}>
      <aside id="notifications" className={styles.notifications}>
        <NotificationsHost />
      </aside>
      <main id="content" className={styles.content}>
        {children}
      </main>
      <nav id="navigation" className={styles.navigation}>
        <ul>
          <li>
            <Link to="/navmap" activeProps={{ className: styles.active }}>
              <IoPlanetOutline size={32} />
              <span>Map</span>
            </Link>
          </li>
          <li className={styles.disabled} title="Coming soon!">
            <Link to="/trade" activeProps={{ className: styles.active }}>
              <IoCashOutline size={32} />
              <span>Trade</span>
            </Link>
          </li>
          <li>
            <Link to="/loadouts" activeProps={{ className: styles.active }}>
              <IoSettingsOutline size={32} />
              <span>Loadouts</span>
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}
