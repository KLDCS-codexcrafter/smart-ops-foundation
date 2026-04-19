/**
 * service-worker-setup.ts — Register the SW and manage lifecycle
 * Callers: App.tsx / MobileRouter on mount.
 * Browser-pure: uses navigator.serviceWorker but no React.
 */

export interface ServiceWorkerState {
  supported: boolean;
  registered: boolean;
  online: boolean;
  updateAvailable: boolean;
}

type Listener = (state: ServiceWorkerState) => void;

const listeners = new Set<Listener>();
let currentState: ServiceWorkerState = {
  supported: typeof navigator !== 'undefined' && 'serviceWorker' in navigator,
  registered: false,
  online: typeof navigator !== 'undefined' ? navigator.onLine : true,
  updateAvailable: false,
};

function emit(): void {
  for (const l of listeners) l(currentState);
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  listener(currentState);
  return () => {
    listeners.delete(listener);
  };
}

export function getState(): ServiceWorkerState {
  return currentState;
}

export async function registerServiceWorker(): Promise<void> {
  if (!currentState.supported) return;

  try {
    // [JWT] n/a — service worker registration is a browser API.
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    currentState = { ...currentState, registered: true };
    emit();

    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          currentState = { ...currentState, updateAvailable: true };
          emit();
        }
      });
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[sw] registration failed', err);
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
      currentState = { ...currentState, online: true };
      emit();
    });
    window.addEventListener('offline', () => {
      currentState = { ...currentState, online: false };
      emit();
    });
  }
}

/** Trigger queue replay — service worker will postMessage back when ready. */
export function triggerQueueReplay(): void {
  if (!currentState.supported || !navigator.serviceWorker.controller) return;
  navigator.serviceWorker.controller.postMessage({ type: 'REPLAY_QUEUE' });
}
