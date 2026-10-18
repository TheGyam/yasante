/**
 * The hero's pictures, through Vite so each is named by its content and cached for good.
 * The card objects are rendered by web/scripts/hero (see its README); the avatars are
 * Unsplash photos (credits in web/scripts/hero/CREDITS.md). Ama is a painting, cut out and
 * given a depth map by web/scripts/hero/ama.py; ./turn.ts turns her head with it.
 */
const urls = (files: Record<string, string>) =>
  Object.keys(files)
    .sort()
    .map(key => files[key]);

const props = import.meta.glob<string>('./media/props/*.webp', {
  eager: true,
  query: '?url',
  import: 'default',
});
const prop = (name: string) => props[`./media/props/${name}.webp`];
export const PROPS = { coil: prop('coil'), pick: prop('pick'), jar: prop('jar') };

export const AVATARS = urls(
  import.meta.glob<string>('./media/avatars/*.webp', {
    eager: true,
    query: '?url',
    import: 'default',
  })
);

export { default as AMA } from './media/ama/ama.webp?url';
export { default as AMA_DEPTH } from './media/ama/ama-depth.webp?url';
export { default as FILM } from './media/film/yasante-film.mp4?url';
export { default as FILM_POSTER } from './media/film/yasante-film-poster.webp?url';
