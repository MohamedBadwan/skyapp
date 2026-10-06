'use client';

import { useState } from 'react';

/** Muestra la figura del AKTS con opción de ampliar (lightbox). */
export function FigureView({ src, alt }: { src: string; alt?: string }) {
  const [zoom, setZoom] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setZoom(true)}
        className="mb-5 block w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 transition hover:border-[var(--line-strong)]"
        title="Click para ampliar"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt ?? 'Figura FAA'} className="mx-auto max-h-72 w-auto object-contain" />
      </button>

      {zoom && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setZoom(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={alt ?? 'Figura FAA'} className="max-h-full max-w-full object-contain" />
        </div>
      )}
    </>
  );
}
