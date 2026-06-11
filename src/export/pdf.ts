import { createRoot } from 'react-dom/client';
import { createElement } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import type { Deck } from '../types';
import { SlideRenderer } from '../renderer/SlideRenderer';

// Jede Folie in fester logischer Größe offscreen rendern (geteilter
// SlideRenderer!), "Screenshot" via html2canvas, Seite für Seite ins PDF.
export async function exportDeckPdf(deck: Deck): Promise<void> {
  const { width, height } = deck.format;

  // Offscreen-Bühne: sichtbar genug für html2canvas, aber aus dem Viewport.
  const host = document.createElement('div');
  host.style.cssText = `position:fixed; left:-99999px; top:0; width:${width}px; height:${height}px; background:#fff;`;
  document.body.appendChild(host);
  const root = createRoot(host);

  const pdf = new jsPDF({
    orientation: width >= height ? 'landscape' : 'portrait',
    unit: 'px',
    format: [width, height],
  });

  try {
    for (let i = 0; i < deck.slides.length; i++) {
      root.render(createElement(SlideRenderer, { slide: deck.slides[i], deck }));
      await waitForImages(host);
      const canvas = await html2canvas(host, {
        width,
        height,
        scale: 2, // höhere Auflösung
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
      });
      const img = canvas.toDataURL('image/jpeg', 0.92);
      if (i > 0) pdf.addPage([width, height], width >= height ? 'landscape' : 'portrait');
      pdf.addImage(img, 'JPEG', 0, 0, width, height);
    }
    pdf.save(`${sanitize(deck.title)}.pdf`);
  } finally {
    root.unmount();
    host.remove();
  }
}

// Wartet, bis alle <img> im Container geladen/dekodiert sind (Blob-URLs laden async).
async function waitForImages(host: HTMLElement): Promise<void> {
  // Kurzer Tick, damit AssetImage seine URLs setzen konnte.
  await new Promise((r) => setTimeout(r, 60));
  const imgs = Array.from(host.querySelectorAll('img'));
  await Promise.all(
    imgs.map((img) =>
      img.complete && img.naturalWidth > 0
        ? Promise.resolve()
        : new Promise<void>((res) => {
            img.onload = () => res();
            img.onerror = () => res();
          }),
    ),
  );
  // Noch ein Frame für Layout.
  await new Promise((r) => requestAnimationFrame(() => r(null)));
}

function sanitize(name: string): string {
  return name.replace(/[^\w\- ]+/g, '').trim() || 'praesentation';
}
