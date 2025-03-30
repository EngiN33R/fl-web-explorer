/* @refresh reload */
import { render } from "solid-js/web";
import { Navigate, Route, Router } from "@solidjs/router";
// import { Store, SwrProvider } from "solid-swr";
// import { LRU, createCache } from "solid-swr/dist/cache";
import "solid-devtools";

import "./index.css";
import { MainLayout } from "./layouts/main";
import { NavMapView } from "./views/navmap";
import { LoadoutsView } from "./views/loadouts";

const root = document.getElementById("root");

if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
  throw new Error(
    "Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got misspelled?"
  );
}

render(
  () => (
    // <SwrProvider value={{ store: new Store(createCache(new LRU())) }}>
    <Router root={MainLayout}>
      <Route path="/navmap" component={NavMapView} />
      <Route path="/loadouts" component={LoadoutsView} />
      <Route path="*" component={() => <Navigate href="/navmap" />} />
    </Router>
    // </SwrProvider>
  ),
  root!
);
