import { plain } from '@/shared/lib/format';
import { lengthLine, sectionFor } from '../quiz/sections';

it('keeps stretched and shrunk lengths as two answers', () => {
  expect(plain(lengthLine({ length: 'mid-back', shrunkLength: 'shoulder' }))).toBe(
    'Mid-back stretched · Shoulder as it shrinks'
  );
  expect(lengthLine({ shrunkLength: 'chin' })).toBe('Chin as it shrinks');
  expect(sectionFor('length')!.answered({ shrunkLength: 'chin' })).toBe(true);
});
