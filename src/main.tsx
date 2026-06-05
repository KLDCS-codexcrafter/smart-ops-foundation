import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
// Sprint 97 T1 · Block 1 — auto-wire hierarchical ledger + DNA hooks on app boot.
import "@/lib/hierarchical-ledger-wiring";

// Sprint 151 · DP-WS-22 · PWA rider · guarded SW registration.
// Skip in dev / Lovable preview / iframe — see PWA skill.
function shouldRegisterSW(): boolean {
  if (typeof window === 'undefined') return false;
  if (!('serviceWorker' in navigator)) return false;
  if (!import.meta.env.PROD) return false;
  if (window.self !== window.top) return false;
  const h = window.location.hostname;
  if (h.startsWith('id-preview--') || h.startsWith('preview--')) return false;
  if (h.endsWith('.lovableproject.com') || h === 'lovableproject.com') return false;
  if (h.endsWith('.lovable.app')) return false;
  if (new URLSearchParams(window.location.search).get('sw') === 'off') return false;
  return true;
}
if (shouldRegisterSW()) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => { /* PWA optional */ });
  });
} else if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(regs => {
    regs.forEach(r => { if (r.active?.scriptURL.endsWith('/sw.js')) r.unregister().catch(() => {}); });
  }).catch(() => {});
}

createRoot(document.getElementById("root")!).render(<App />);
