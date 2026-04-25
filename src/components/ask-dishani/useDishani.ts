/**
 * @file     useDishani.ts
 * @purpose  Consumer hook for DishaniContext, extracted from
 *           DishaniContext.tsx so the component file only exports
 *           components (react-refresh/only-export-components).
 * @who      Operix Engineering
 * @when     Apr-2026
 * @sprint   T-H1.5-Z-Cleanup-1c-a-cont
 * @iso      Maintainability (HIGH+ component file scope cleaned)
 *           Performance (HIGH+ HMR fast-refresh works correctly)
 * @whom     DishaniFloatingButton · DishaniPanel · ERPHeader · ask-dishani/index.ts
 * @depends  react · ./DishaniContextObject
 */
import { useContext } from "react";
import { DishaniContext } from "./DishaniContextObject";

export function useDishani() {
  const ctx = useContext(DishaniContext);
  if (!ctx) throw new Error("useDishani must be used within DishaniProvider");
  return ctx;
}
