import { useState, type CSSProperties } from 'react';
import * as styles from './RemoteImage.css';

export interface RemoteImageProps {
  src: string | undefined;
  alt: string;
  /** Width over height. The frame holds its shape before the photo arrives, so nothing jumps. */
  aspect?: number;
  /** The first screenful: load straight away rather than when scrolled near. */
  priority?: boolean;
  sizes?: string;
  className?: string;
  style?: CSSProperties;
}

/** Every photo on the site. Fades in once it has loaded; the frame never shifts. */
export function RemoteImage({
  src,
  alt,
  aspect,
  priority = false,
  sizes,
  className,
  style,
}: RemoteImageProps) {
  // Keyed on the source, so a reused frame never shows the previous photo as loaded.
  const [loadedSrc, setLoadedSrc] = useState<string>();
  return (
    <div
      className={`${styles.frame} ${className ?? ''}`}
      style={{ aspectRatio: aspect ? String(aspect) : undefined, ...style }}
    >
      {src && (
        <img
          key={src}
          src={src}
          alt={alt}
          sizes={sizes}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          decoding="async"
          className={`${styles.image} ${loadedSrc === src ? styles.loaded : ''}`}
          onLoad={() => setLoadedSrc(src)}
          ref={node => {
            // Already in the browser's cache: complete before React could listen.
            if (node?.complete && node.naturalWidth) setLoadedSrc(src);
          }}
        />
      )}
    </div>
  );
}
