import type { DesktopApi } from "@repo/electron";

declare global {
  interface Window {
    desktop?: DesktopApi;
  }
}

export {};
