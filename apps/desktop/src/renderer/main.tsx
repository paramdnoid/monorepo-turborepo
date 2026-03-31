import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Providers } from "@repo/ui/providers";
import { DesktopLayout } from "./components/desktop-layout";
import "./globals.css";

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error('Missing root element "#root"');
}

createRoot(rootEl).render(
  <StrictMode>
    <Providers>
      <DesktopLayout />
    </Providers>
  </StrictMode>,
);
