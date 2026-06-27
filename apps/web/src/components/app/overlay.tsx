"use client";

import { createContext, useContext } from "react";

/**
 * Lets home-page islands (quick actions, quick capture) open the global search
 * and capture overlays that live in the shell — without prop-drilling.
 */
export interface OverlayApi {
  openSearch: () => void;
  openCapture: () => void;
}

export const OverlayContext = createContext<OverlayApi>({
  openSearch: () => {},
  openCapture: () => {},
});

export function useOverlay(): OverlayApi {
  return useContext(OverlayContext);
}
