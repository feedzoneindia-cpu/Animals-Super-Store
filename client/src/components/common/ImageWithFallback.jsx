import { useEffect, useRef, useState } from 'react';
import { cn } from '../../utils/cn.js';

/**
 * Cloudinary delivery URLs can be resized and re-encoded on the fly. Asking
 * for the width a card really needs (instead of the full-size upload) makes
 * images far lighter to download and decode, which keeps scrolling smooth.
 * Any other URL is returned untouched.
 */
function optimizeUrl(url, width) {
  if (!url || !width) return url;
  const match = url.match(/^(https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(v\d+\/.+)$/);
  return match ? `${match[1]}f_auto,q_auto,c_limit,w_${width}/${match[2]}` : url;
}

/**
 * Image that fades in once decoded and shows a graceful branded fallback when
 * loading fails. Pass `optimize` (a pixel width) to request a right-sized
 * Cloudinary rendition; if that rendition fails the original URL is tried.
 */
export default function ImageWithFallback({ src, alt, className, fallbackClassName, optimize, ...props }) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [useOriginal, setUseOriginal] = useState(false);
  const imgRef = useRef(null);

  const resolved = useOriginal ? src : optimizeUrl(src, optimize);

  useEffect(() => {
    setLoaded(false);
    setFailed(false);
    setUseOriginal(false);
  }, [src]);

  useEffect(() => {
    const el = imgRef.current;
    if (el && el.complete && el.naturalWidth > 0) setLoaded(true);
  }, [resolved]);

  if (!src || failed) {
    return (
      <div className={cn('flex items-center justify-center bg-brand-50', className)} aria-hidden="true">
        <svg className={cn('h-10 w-10 text-brand-300', fallbackClassName)} viewBox="0 0 24 24" fill="none" strokeWidth="1" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A1.5 1.5 0 0 0 21.75 19.5V4.5A1.5 1.5 0 0 0 20.25 3H3.75A1.5 1.5 0 0 0 2.25 4.5v15A1.5 1.5 0 0 0 3.75 21Z"
          />
        </svg>
      </div>
    );
  }

  return (
    <img
      ref={imgRef}
      src={resolved}
      alt={alt}
      decoding="async"
      loading="lazy"
      className={cn('img-fade', loaded && 'is-loaded', className)}
      onLoad={() => setLoaded(true)}
      onError={() => {
        if (optimize && !useOriginal && resolved !== src) setUseOriginal(true);
        else setFailed(true);
      }}
      {...props}
    />
  );
}
