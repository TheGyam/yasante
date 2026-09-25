import { useState } from 'react';
import * as styles from './Avatar.css';

export interface AvatarProps {
  name: string;
  uri?: string;
  size?: number;
}

/** A face, or the first letter of the name when there's no photo (or it won't load). */
export function Avatar({ name, uri, size = 40 }: AvatarProps) {
  const [failed, setFailed] = useState<string>();
  const photo = uri && failed !== uri ? uri : undefined;
  return (
    <span
      className={styles.avatar}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      aria-hidden
    >
      {photo ? (
        <img src={photo} alt="" loading="lazy" decoding="async" onError={() => setFailed(photo)} />
      ) : (
        name.trim().charAt(0).toUpperCase()
      )}
    </span>
  );
}
