import { apiClient } from '@/shared/lib/api/client';
import { uploadImage } from '@/shared/lib/imageService';
import { looksApi, PhotoUploadError, type UploadCache } from '../api';
import type { LookDraft } from '../types';

jest.mock('@/shared/lib/api/client', () => ({ apiClient: { post: jest.fn() } }));
jest.mock('@/shared/lib/imageService', () => ({ uploadImage: jest.fn() }));

const mockedPost = apiClient.post as jest.Mock;
const mockedUpload = uploadImage as jest.Mock;

const draft = (photoUris: string[]): LookDraft => ({ photoUris, styles: [] });

beforeEach(() => {
  jest.clearAllMocks();
  mockedPost.mockResolvedValue({ data: { id: 'look-1' } });
});

describe('posting a look with several photos', () => {
  it('uploads at most 3 at a time, and sends them in her order', async () => {
    const resolvers: Record<string, (value: { uri: string }) => void> = {};
    const started: string[] = [];
    mockedUpload.mockImplementation(
      (uri: string) =>
        new Promise(resolve => {
          started.push(uri);
          resolvers[uri] = resolve;
        })
    );

    const uris = ['a', 'b', 'c', 'd', 'e'];
    const posting = looksApi.create(draft(uris));

    // All three workers run synchronously up to their first await.
    expect(started).toEqual(['a', 'b', 'c']);

    resolvers.a({ uri: 'remote-a' });
    await Promise.resolve();
    await Promise.resolve();
    expect(started).toEqual(['a', 'b', 'c', 'd']);

    resolvers.b({ uri: 'remote-b' });
    resolvers.c({ uri: 'remote-c' });
    resolvers.d({ uri: 'remote-d' });
    await Promise.resolve();
    await Promise.resolve();
    expect(started).toEqual(['a', 'b', 'c', 'd', 'e']);

    resolvers.e({ uri: 'remote-e' });
    await posting;

    expect(mockedPost).toHaveBeenCalledWith(
      '/api/looks/',
      expect.objectContaining({
        photoUris: ['remote-a', 'remote-b', 'remote-c', 'remote-d', 'remote-e'],
      })
    );
  });

  it('sends whatever order the composer ends up with, after a remove and a reorder', async () => {
    mockedUpload.mockImplementation((uri: string) => Promise.resolve({ uri: `remote-${uri}` }));

    // Started as [a, b, c]; she removed b, then dragged c before a.
    await looksApi.create(draft(['c', 'a']));

    expect(mockedPost).toHaveBeenCalledWith(
      '/api/looks/',
      expect.objectContaining({ photoUris: ['remote-c', 'remote-a'] })
    );
  });

  it('retries a failed photo once, then throws its index and posts nothing', async () => {
    let attempts = 0;
    mockedUpload.mockImplementation((uri: string) => {
      if (uri === 'bad') {
        attempts++;
        return Promise.reject(new Error('network'));
      }
      return Promise.resolve({ uri: `remote-${uri}` });
    });

    await expect(looksApi.create(draft(['a', 'bad', 'c']))).rejects.toMatchObject({
      photoIndex: 1,
    });
    expect(attempts).toBe(2); // the original attempt, plus one retry
    expect(mockedPost).not.toHaveBeenCalled();
  });

  it('on a second call, only re-sends the photo that failed before', async () => {
    const cache: UploadCache = new Map();
    mockedUpload.mockImplementation((uri: string) =>
      uri === 'bad'
        ? Promise.reject(new Error('network'))
        : Promise.resolve({ uri: `remote-${uri}` })
    );

    await expect(looksApi.create(draft(['a', 'bad', 'c']), { cache })).rejects.toBeInstanceOf(
      PhotoUploadError
    );

    mockedUpload.mockClear();
    mockedUpload.mockImplementation((uri: string) => Promise.resolve({ uri: `remote-${uri}` }));

    await looksApi.create(draft(['a', 'bad', 'c']), { cache });

    expect(mockedUpload).toHaveBeenCalledTimes(1);
    expect(mockedUpload).toHaveBeenCalledWith('bad', 'look');
    expect(mockedPost).toHaveBeenCalledWith(
      '/api/looks/',
      expect.objectContaining({ photoUris: ['remote-a', 'remote-bad', 'remote-c'] })
    );
  });
});
