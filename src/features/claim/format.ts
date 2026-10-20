import type { FinishState } from './types';

/** Waiting count in words: "1 person is waiting to book you". */
export const waitingLabel = (waiting: number) =>
  waiting === 1 ? '1 person is waiting to book you' : `${waiting} people are waiting to book you`;

/** "2 of 3 done": prices, hours, tags. */
export function finishProgress(state: FinishState) {
  const priced = state.styles.every(style => style.priced);
  return [priced, state.hoursSet, state.tagsChecked].filter(Boolean).length;
}
