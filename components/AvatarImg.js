'use client';

import { useEffect, useRef, useState } from 'react';

// Token logos often live on slow IPFS gateways. If one fails, the initials underneath stay visible.
export default function AvatarImg({ src, size }) {
  const ref = useRef(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) setFailed(true);
  }, [src]);
  if (failed) return null;
  return <img ref={ref} src={src} alt="" width={size} height={size} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} />;
}
