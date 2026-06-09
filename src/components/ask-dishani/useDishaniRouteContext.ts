/**
 * @file        src/components/ask-dishani/useDishaniRouteContext.ts
 * @sprint      AM.1 · T-AM1-AI-Everywhere · Pass 1 · NEW (allowlisted)
 * @purpose     Minimal context-set hook. Reads the current route via
 *              react-router and pushes the resolved CardContext.cardName
 *              into DishaniContext.setCurrentPage. NO per-card-page edits.
 * @canon       Tier-L · NO fetch · NO LLM/ML.
 */
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useDishani } from './useDishani';
import { resolveCardContext } from './dishani-context-resolver';

export function useDishaniRouteContext(): void {
  const { setCurrentPage } = useDishani();
  const location = useLocation();
  useEffect(() => {
    const ctx = resolveCardContext(location.pathname);
    setCurrentPage(ctx.cardName);
  }, [location.pathname, setCurrentPage]);
}
