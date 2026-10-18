import { lookPhotos, type Look } from '../types';

const baseLook: Look = {
  id: 'look-1',
  authorId: 'author-1',
  authorName: 'Ama',
  photoUri: 'cover.jpg',
  styles: [],
  visibility: 'public',
  likeCount: 0,
  liked: false,
  commentCount: 0,
  createdAt: '2026-01-01T00:00:00Z',
};

describe('lookPhotos', () => {
  it('returns the photos array when the look has one', () => {
    const look: Look = {
      ...baseLook,
      photos: [{ uri: 'a.jpg' }, { uri: 'b.jpg' }],
    };
    expect(lookPhotos(look)).toEqual([{ uri: 'a.jpg' }, { uri: 'b.jpg' }]);
  });

  it('falls back to the cover photo when there is no photos array', () => {
    const look: Look = {
      ...baseLook,
      thumbUri: 'thumb.jpg',
      feedUri: 'feed.jpg',
      photoAspect: 0.75,
    };
    expect(lookPhotos(look)).toEqual([
      { uri: 'cover.jpg', thumbUri: 'thumb.jpg', feedUri: 'feed.jpg', aspect: 0.75 },
    ]);
  });

  it('falls back to the cover photo when photos is an empty array', () => {
    const look: Look = { ...baseLook, photos: [] };
    expect(lookPhotos(look)).toEqual([
      { uri: 'cover.jpg', thumbUri: undefined, feedUri: undefined, aspect: undefined },
    ]);
  });
});
