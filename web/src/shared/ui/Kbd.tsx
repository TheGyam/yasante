import type { ReactNode } from 'react';
import * as s from './Kbd.css';
export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className={s.key}>{children}</kbd>;
}
