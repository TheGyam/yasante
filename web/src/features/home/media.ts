/**
 * The hero's pictures, through Vite so each is named by its content and cached for good.
 * Frames and props are rendered by web/scripts/hero (see its README); the avatars are
 * Unsplash photos (credits in web/scripts/hero/CREDITS.md).
 */
const urls = (files: Record<string, string>) =>
  Object.keys(files)
    .sort()
    .map(key => files[key]);

/** The turntable, 60° left to 60° right in 2° steps, at two sizes. */
export const FRAMES_LARGE = urls(
  import.meta.glob<string>('./media/bob/1200/*.webp', {
    eager: true,
    query: '?url',
    import: 'default',
  })
);
export const FRAMES_SMALL = urls(
  import.meta.glob<string>('./media/bob/640/*.webp', {
    eager: true,
    query: '?url',
    import: 'default',
  })
);

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

export { default as FILM } from './media/film/yasante-film.mp4?url';
export { default as FILM_POSTER } from './media/film/yasante-film-poster.webp?url';
