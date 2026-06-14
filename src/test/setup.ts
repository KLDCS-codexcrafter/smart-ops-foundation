import "@testing-library/jest-dom";
import { afterEach, beforeEach } from "vitest";
import { cleanup } from "@testing-library/react";

/**
 * CL-FREEZE-FIX · T-FREEZE-FIX-TestIsolation
 * Global storage reset between tests — eliminates order-dependent flakes from
 * ~63 test files that touch localStorage without clearing it themselves.
 * Clearing twice is a no-op for the 283 files that already self-clear.
 */
function clearStorage() {
  if (typeof localStorage !== "undefined") localStorage.clear();
  if (typeof sessionStorage !== "undefined") sessionStorage.clear();
}

beforeEach(() => {
  clearStorage();
});

afterEach(() => {
  cleanup();
  clearStorage();
});


Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = ResizeObserverMock;
