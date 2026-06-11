import { useLayoutEffect, useRef, useState } from 'react';

// Berechnet einen einzelnen Skalierungsfaktor, sodass die Folie (logische Größe)
// in den verfügbaren Container passt. Alles in der Folie skaliert mit.
export function useStageScale(
  formatW: number,
  formatH: number,
  padding = 88,
  maxScale = 2,
) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const compute = () => {
      const availW = el.clientWidth - padding * 2;
      const availH = el.clientHeight - padding * 2;
      if (availW <= 0 || availH <= 0) return;
      const s = Math.min(availW / formatW, availH / formatH, maxScale);
      setScale(s > 0 ? s : 0.1);
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [formatW, formatH, padding, maxScale]);

  return { containerRef: ref, scale };
}
