/**
 * @file     DishaniContextObject.ts
 * @purpose  React context object for Ask Dishani, extracted from
 *           DishaniContext.tsx so the component file only exports
 *           components (react-refresh/only-export-components) and the
 *           hook lives in its own file.
 * @who      Operix Engineering
 * @when     Apr-2026
 * @sprint   T-H1.5-Z-Cleanup-1c-a-cont
 * @iso      Maintainability (HIGH+ component file scope cleaned)
 *           Performance (HIGH+ HMR fast-refresh works correctly)
 * @whom     DishaniContext.tsx (Provider) · useDishani.ts (consumer hook)
 * @depends  react · ./DishaniContext.types
 */
import { createContext } from "react";
import type { DishaniMessage } from "./DishaniContext.types";

export interface DishaniContextType {
  isOpen: boolean;
  openDishani: () => void;
  closeDishani: () => void;
  toggleDishani: () => void;
  messages: DishaniMessage[];
  isLoading: boolean;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
  currentPage: string;
  setCurrentPage: (page: string) => void;
}

export const DishaniContext = createContext<DishaniContextType | null>(null);
