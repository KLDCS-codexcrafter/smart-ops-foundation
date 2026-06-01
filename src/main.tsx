import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
// Sprint 97 T1 · Block 1 — auto-wire hierarchical ledger + DNA hooks on app boot.
import "@/lib/hierarchical-ledger-wiring";

createRoot(document.getElementById("root")!).render(<App />);
