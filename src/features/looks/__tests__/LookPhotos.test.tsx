import { render, screen } from '@testing-library/react-native';
import { LookPhotos } from '../components/LookPhotos';
import type { Look, LookPhoto } from '../types';

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

const photo = (uri: string): LookPhoto => ({ uri });

const noop = () => {};

describe('LookPhotos', () => {
  it('renders one photo with no list, dots or counter', () => {
    const look: Look = { ...baseLook, photos: [photo('a.jpg')] };
    render(<LookPhotos look={look} onLike={noop} />);

    expect(screen.queryByRole('adjustable')).toBeNull();
    expect(screen.queryByText('1/1')).toBeNull();
  });

  it('shows dots and a "1/3" counter for 3 photos', () => {
    const look: Look = {
      ...baseLook,
      photos: [photo('a.jpg'), photo('b.jpg'), photo('c.jpg')],
    };
    render(<LookPhotos look={look} onLike={noop} />);

    expect(screen.getByText('1/3')).toBeTruthy();
    expect(screen.getByRole('adjustable')).toBeTruthy();
  });
});
