'use client';

import { useEffect, useRef, useState } from 'react';

type RendererType = 'gl' | 'wg' | 'sw';

interface UseThorVGOptions {
  renderer?: RendererType;
  canvasId?: string;
}

export function useThorVG(options: UseThorVGOptions = {}) {
  const { renderer = 'gl', canvasId = 'canvas' } = options;
  const [TVG, setTVG] = useState<any>(null);
  const [canvas, setCanvas] = useState<any>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const initRef = useRef(false);

  useEffect(() => {
    // Prevent double initialization
    if (initRef.current) return;
    initRef.current = true;

    async function initThorVG() {
      try {
        // Dynamically import the ThorVG module
        const wasmModule = await import('@thorvg/canvas-kit');

        const tvgInstance = await wasmModule.init({
          renderer: renderer,
          locateFile: (path: string) => `/canvas-kit/${path.split('/').pop()}`,
        });

        const canvasInstance = new tvgInstance.Canvas(`#${canvasId}`, {
          width: 600,
          height: 600,
          renderer: renderer,
        });

        setTVG(tvgInstance);
        setCanvas(canvasInstance);
        setIsInitialized(true);
      } catch (err) {
        console.error('Failed to initialize ThorVG:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
      }
    }

    initThorVG();

    // Cleanup
    return () => {
      if (canvas) {
        try {
          canvas.clear();
        } catch (e) {
          console.warn('Error clearing canvas:', e);
        }
      }
    };
  }, [renderer, canvasId]);

  return { TVG, canvas, isInitialized, error };
}
