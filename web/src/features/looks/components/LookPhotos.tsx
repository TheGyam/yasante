import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { RemoteImage } from '@/shared/ui/RemoteImage';
import type { Schemas } from '@/shared/lib/api/types';
import * as styles from './LookPhotos.css';

type Photo = Schemas['LookPhoto'];

/** One photo: the image as before. Several: a swipeable, keyboard-navigable row. */
export function LookPhotos({
  photos,
  alt,
  aspect,
  sizes,
  className,
}: {
  photos: Photo[];
  alt: string;
  aspect: number;
  sizes?: string;
  className?: string;
}) {
  const [current, setCurrent] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || photos.length < 2 || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      entries => {
        const visible = entries.filter(entry => entry.isIntersecting);
        if (!visible.length) return;
        const closest = visible.reduce((a, b) => (b.intersectionRatio > a.intersectionRatio ? b : a));
        const index = slideRefs.current.indexOf(closest.target as HTMLDivElement);
        if (index !== -1) setCurrent(index);
      },
      { root: track, threshold: 0.6 }
    );
    slideRefs.current.forEach(slide => slide && observer.observe(slide));
    return () => observer.disconnect();
  }, [photos.length]);

  if (photos.length <= 1) {
    const photo = photos[0];
    return (
      <RemoteImage
        src={photo?.feedUri ?? photo?.uri}
        alt={alt}
        aspect={aspect}
        priority
        sizes={sizes}
        className={className}
      />
    );
  }

  const goTo = (index: number) => {
    const clamped = Math.max(0, Math.min(photos.length - 1, index));
    slideRefs.current[clamped]?.scrollIntoView?.({ block: 'nearest' });
    setCurrent(clamped);
  };

  return (
    <div className={`${styles.wrapper} ${className ?? ''}`}>
      <div
        ref={trackRef}
        className={styles.track}
        role="region"
        aria-label="Photos"
        tabIndex={0}
        onKeyDown={event => {
          if (event.key === 'ArrowLeft') goTo(current - 1);
          else if (event.key === 'ArrowRight') goTo(current + 1);
          else return;
          event.preventDefault();
        }}
      >
        {photos.map((photo, index) => (
          <div
            key={photo.uri}
            ref={node => {
              slideRefs.current[index] = node;
            }}
            className={styles.slide}
          >
            <RemoteImage
              src={photo.feedUri ?? photo.uri}
              alt={`${alt}, photo ${index + 1} of ${photos.length}`}
              aspect={aspect}
              priority={index === 0}
              sizes={sizes}
            />
          </div>
        ))}
      </div>
      <button type="button" className={styles.prev} aria-label="Previous photo" onClick={() => goTo(current - 1)}>
        <ChevronLeft aria-hidden />
      </button>
      <button type="button" className={styles.next} aria-label="Next photo" onClick={() => goTo(current + 1)}>
        <ChevronRight aria-hidden />
      </button>
      <div className={styles.dots}>
        {photos.map((photo, index) => (
          <button
            key={photo.uri}
            type="button"
            className={styles.dot}
            data-active={index === current}
            aria-label={`Photo ${index + 1}`}
            onClick={() => goTo(index)}
          />
        ))}
      </div>
      <span className={styles.counter}>
        {current + 1} / {photos.length}
      </span>
    </div>
  );
}
