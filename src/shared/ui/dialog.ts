import { create } from 'zustand';

/**
 * Ask a question, or say something that has to be acknowledged — in the app's own
 * dialog rather than the platform's grey one.
 *
 *   if (await confirm({ title: 'Delete this board?', destructive: true })) …
 *   await notify({ title: 'Saved on this device' });
 *
 * Callable from anywhere, including outside React. `<DialogHost />` draws it.
 */
export interface DialogRequest {
  title: string;
  message?: string;
  /** The button that does the thing. Defaults to "OK". */
  confirmLabel?: string;
  /** Omitted for a notice, so it has one button. */
  cancelLabel?: string;
  /** Destructive actions read in red and take the dangerous wording. */
  destructive?: boolean;
}

interface QueuedDialog extends DialogRequest {
  id: number;
  resolve: (confirmed: boolean) => void;
}

interface DialogState {
  /** One at a time; anything asked while one is open waits its turn. */
  queue: QueuedDialog[];
  ask: (request: DialogRequest) => Promise<boolean>;
  answer: (id: number, confirmed: boolean) => void;
}

let nextId = 1;

export const useDialogStore = create<DialogState>()((set, get) => ({
  queue: [],
  ask: request =>
    new Promise<boolean>(resolve => {
      set(state => ({ queue: [...state.queue, { ...request, id: nextId++, resolve }] }));
    }),
  answer: (id, confirmed) => {
    const found = get().queue.find(dialog => dialog.id === id);
    set(state => ({ queue: state.queue.filter(dialog => dialog.id !== id) }));
    found?.resolve(confirmed);
  },
}));

/** Resolves true when they choose the confirming action. */
export function confirm(request: DialogRequest & { confirmLabel: string; cancelLabel?: string }) {
  return useDialogStore.getState().ask({ cancelLabel: 'Cancel', ...request });
}

/** One button, nothing to decide. */
export function notify(request: Omit<DialogRequest, 'cancelLabel' | 'destructive'>) {
  return useDialogStore.getState().ask({ confirmLabel: 'OK', ...request });
}
