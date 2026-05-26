import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.tsx";
import { storageAdapter } from "./services/storage.adapter";
import { isZaloMiniApp } from "./services/zalo-env";

// Hydrate in-memory cache từ zmp-sdk storage (Zalo mode) trước khi render
storageAdapter.hydrateCache().then(() => {
  const basename = isZaloMiniApp()
    ? `/zapps/${import.meta.env.VITE_ZALO_MINI_APP_ID || ""}`
    : "/";

  createRoot(document.getElementById("app")!).render(
    <StrictMode>
      <BrowserRouter basename={basename}>
        <App />
      </BrowserRouter>
    </StrictMode>
  );
});
