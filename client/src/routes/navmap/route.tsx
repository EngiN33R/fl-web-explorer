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
import { Sidebar } from "@/components/navmap/sidebar";
import { NavMapProvider, useSystemData } from "@/data/context/navmap";
import styles from "./navmap.module.css";
import { Galaxy } from "../../components/icons";

export const Route = createFileRoute("/navmap")({
  component: NavMapLayout,
});

export function NavMapLayout() {
  const transformRef = useRef<ReactZoomPanPinchRef>();
  const location = useLocation();

  const { data: system } = useSystemData();

  useEffect(() => {
    if (transformRef.current) {
      transformRef.current.resetTransform(0);
    }
  }, [location.pathname]);

  return (
    <NavMapProvider>
      <Sidebar />
      <div className={styles.sizeContainer}>
        <TransformWrapper
          maxScale={6}
          minScale={0.8}
          centerOnInit
          limitToBounds={false}
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
            contentStyle={{
              height: "100%",
              aspectRatio: "1 / 1",
            }}
          >
            <Outlet />
          </TransformComponent>
        </TransformWrapper>
        {!!system && (
          <Link to="/navmap">
            <button className={styles.home} title="Sector map">
              <Galaxy />
            </button>
          </Link>
        )}
      </div>
    </NavMapProvider>
  );
}
