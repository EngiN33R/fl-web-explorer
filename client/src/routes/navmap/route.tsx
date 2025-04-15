import { useEffect, useRef } from "react";
import {
  createFileRoute,
  Link,
  Outlet,
  useLocation,
} from "@tanstack/react-router";
import {
  TransformWrapper,
  TransformComponent,
  ReactZoomPanPinchRef,
} from "react-zoom-pan-pinch";
import { SearchBox, Sidebar } from "@/components/navmap/sidebar";
import styles from "./navmap.module.css";
import { Galaxy } from "../../components/icons";

export const Route = createFileRoute("/navmap")({
  component: NavMapLayout,
});

export function NavMapLayout() {
  const transformRef = useRef<ReactZoomPanPinchRef>();
  const location = useLocation();

  useEffect(() => {
    if (transformRef.current) {
      transformRef.current.resetTransform(0);
    }
  }, [location.pathname]);

  return (
    <>
      <Sidebar />
      <div className={styles.sizeContainer}>
        <SearchBox />
        <TransformWrapper
          maxScale={4}
          minScale={1}
          centerOnInit
          onPanningStart={(ref) => {
            if (ref.instance.wrapperComponent) {
              ref.instance.wrapperComponent.style.cursor = "grabbing";
            }
          }}
          onPanningStop={(ref) => {
            if (ref.instance.wrapperComponent) {
              ref.instance.wrapperComponent.style.cursor = "grab";
            }
          }}
          onInit={(ref) => {
            transformRef.current = ref;
          }}
        >
          <TransformComponent
            wrapperStyle={{ width: "100%", height: "100%", cursor: "grab" }}
            contentStyle={{ width: "100%", aspectRatio: "1 / 1" }}
          >
            <Outlet />
          </TransformComponent>
        </TransformWrapper>
        <Link to="/navmap">
          <button className={styles.home} title="Sector map">
            <Galaxy />
          </button>
        </Link>
      </div>
    </>
  );
}
