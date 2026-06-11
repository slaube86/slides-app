import { useEffect, useState } from 'react';
import { objectUrlFor } from '../db/assetCache';

interface Props {
  assetId: string;
  fit?: 'cover' | 'contain';
  alt?: string;
}

// Lädt den Blob-URL aus dem Cache. Das <img> bleibt stabil, weil objectUrlFor
// pro assetId eine URL wiederverwendet.
export function AssetImage({ assetId, fit = 'contain', alt = '' }: Props) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    objectUrlFor(assetId).then((u) => {
      if (active) setUrl(u);
    });
    return () => {
      active = false;
    };
  }, [assetId]);

  if (!url) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'grid',
          placeItems: 'center',
          background: '#f1f5f9',
          color: '#94a3b8',
          fontSize: 14,
        }}
      >
        Bild …
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={alt}
      draggable={false}
      style={{ width: '100%', height: '100%', objectFit: fit, display: 'block' }}
    />
  );
}
