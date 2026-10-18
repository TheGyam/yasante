import { forwardRef, useImperativeHandle, useRef } from 'react';
import { X } from 'lucide-react';
import { FILM, FILM_POSTER } from '../media';
import * as styles from './FilmDialog.css';

export interface FilmDialogHandle {
  open: () => void;
}

/** The launch film, in a native dialog: Escape and the backdrop close it, focus stays inside. */
export const FilmDialog = forwardRef<FilmDialogHandle>(function FilmDialog(_, ref) {
  const dialog = useRef<HTMLDialogElement>(null);
  const video = useRef<HTMLVideoElement>(null);

  useImperativeHandle(ref, () => ({
    open() {
      dialog.current?.showModal();
      void video.current?.play().catch(() => {});
    },
  }));

  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      aria-label="The Yasante film"
      onClose={() => video.current?.pause()}
      onClick={event => event.target === dialog.current && dialog.current?.close()}
    >
      <video
        ref={video}
        className={styles.video}
        src={FILM}
        poster={FILM_POSTER}
        preload="none"
        controls
        playsInline
        width={1080}
        height={1080}
      />
      <form method="dialog">
        <button className={styles.close} aria-label="Close the film">
          <X size={20} strokeWidth={2.4} aria-hidden />
        </button>
      </form>
    </dialog>
  );
});
