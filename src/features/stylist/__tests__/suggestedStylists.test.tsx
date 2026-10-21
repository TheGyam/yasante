import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SuggestedStylists } from '../components/SuggestedStylists';

const mockPush = jest.fn();
let mockStylists: unknown[] = [];
jest.mock('@/shared/lib/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('../hooks', () => ({ useSuggestedStylists: () => ({ data: mockStylists }) }));

beforeEach(() => mockPush.mockReset());

describe('stylists for you', () => {
  it('shows nothing until there is someone to suggest', () => {
    mockStylists = [];
    render(<SuggestedStylists />);
    expect(screen.queryByText('Stylists for you')).toBeNull();
  });

  it('says why each stylist is suggested and opens their page', () => {
    mockStylists = [
      {
        accountId: 'a1',
        handle: 'ama.braids',
        displayName: 'Ama',
        baseArea: 'Peckham',
        reason: 'Does Twists, a style you like',
      },
    ];
    render(<SuggestedStylists />);
    expect(screen.getByText('Does Twists, a style you like')).toBeTruthy();
    fireEvent.press(screen.getByText('Ama'));
    expect(mockPush).toHaveBeenCalledWith('/stylist/ama.braids');
  });
});
