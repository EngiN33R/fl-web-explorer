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
import { NavMapProvider, useNavMapContext } from "@/data/context/navmap";
import styles from "./navmap.module.css";
import { Galaxy } from "../../components/icons";

export const Route = createFileRoute("/navmap")({
  component: NavMapLayout,
});

function MapContainer() {
  const { /* mode, object, */ system } = useNavMapContext();
  const transformRef = useRef<ReactZoomPanPinchRef>();
  const location = useLocation();

  // const showSidebar = mode !== "object" || (!!system && !!object);

  useEffect(() => {
    if (transformRef.current) {
      transformRef.current.resetTransform(0);
    }
  }, [location.pathname]);

  return (
    <div className={styles.sizeContainer}>
      <TransformWrapper
        maxScale={6}
        minScale={1}
        initialPositionX={420}
        limitToBounds={false}
        doubleClick={{ disabled: true }}
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
          wrapperStyle={{
            // paddingLeft: showSidebar ? "400px" : undefined,
            width: "100%",
            height: "100%",
            cursor: "grab",
          }}
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
  );
}

export function NavMapLayout() {
  return (
    <NavMapProvider>
      <Sidebar />
      <MapContainer />
    </NavMapProvider>
  );
}
