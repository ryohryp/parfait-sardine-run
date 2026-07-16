import { describe, expect, it, vi } from 'vitest';
import { buildLeaderboardUrl, normalizeWordPressLeaderboard, RankingConfigurationError, RankingResponseError, WordPressRankingAdapter } from './WordPressRankingAdapter';

describe('WordPressRankingAdapter', () => {
  it('normalizes the wrapped WordPress response and maps time to recordedAt', () => {
    expect(normalizeWordPressLeaderboard({ leaderboard: [{ rank: 1, name: 'Chef', score: 999, time: '2026-07-16T00:00:00Z', char: 'Sardine' }] })).toEqual([
      { rank: 1, displayName: 'Chef', score: 999, recordedAt: '2026-07-16T00:00:00Z', characterLabel: 'Sardine' },
    ]);
  });

  it('keeps only the top 20 records', () => {
    const leaderboard = Array.from({ length: 21 }, (_, index) => ({ rank: index + 1, name: `N${index}`, score: index }));
    expect(normalizeWordPressLeaderboard({ leaderboard })).toHaveLength(20);
  });

  it('rejects an array response and invalid entries', () => {
    expect(() => normalizeWordPressLeaderboard([])).toThrow(RankingResponseError);
    expect(() => normalizeWordPressLeaderboard({ leaderboard: [{ rank: 1, name: 'Chef', score: '999' }] })).toThrow(RankingResponseError);
  });

  it('rejects invalid numeric values, labels, and dates before displaying any entry', () => {
    expect(() => normalizeWordPressLeaderboard({ leaderboard: [{ rank: 0, name: 'Chef', score: 1 }] })).toThrow(RankingResponseError);
    expect(() => normalizeWordPressLeaderboard({ leaderboard: [{ rank: 1, name: 'Chef', score: -1 }] })).toThrow(RankingResponseError);
    expect(() => normalizeWordPressLeaderboard({ leaderboard: [{ rank: 1, name: 'x'.repeat(81), score: 1 }] })).toThrow(RankingResponseError);
    expect(() => normalizeWordPressLeaderboard({ leaderboard: [{ rank: 1, name: 'Chef', score: 1, time: 'not-a-date' }] })).toThrow(RankingResponseError);
  });

  it('builds the endpoint with or without a trailing slash and rejects unsafe schemes', () => {
    expect(buildLeaderboardUrl('https://example.com')).toBe('https://example.com/wp-json/psrun/v2/leaderboard');
    expect(buildLeaderboardUrl('https://example.com/')).toBe('https://example.com/wp-json/psrun/v2/leaderboard');
    expect(buildLeaderboardUrl('https://example.com/wp-json/psrun/v2/leaderboard/')).toBe('https://example.com/wp-json/psrun/v2/leaderboard');
    expect(() => buildLeaderboardUrl('javascript:alert(1)')).toThrow(RankingConfigurationError);
    expect(() => buildLeaderboardUrl('data:text/plain,no')).toThrow(RankingConfigurationError);
  });

  it('does not fetch when the API base URL is missing', async () => {
    const fetcher = vi.fn();
    await expect(new WordPressRankingAdapter(undefined, fetcher).getTopRankings()).rejects.toBeInstanceOf(RankingConfigurationError);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('uses the configured endpoint and rejects HTTP errors', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    await expect(new WordPressRankingAdapter('https://example.com', fetcher).getTopRankings()).rejects.toThrow('500');
    expect(fetcher).toHaveBeenCalledWith('https://example.com/wp-json/psrun/v2/leaderboard', expect.objectContaining({ headers: { Accept: 'application/json' } }));
  });

  it('returns a clear offline error for a network failure', async () => {
    const fetcher = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(new WordPressRankingAdapter('https://example.com', fetcher).getTopRankings()).rejects.toThrow('ネットワーク');
  });

  it('turns malformed JSON into a safe response error', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: vi.fn().mockRejectedValue(new SyntaxError('Unexpected token')) });
    await expect(new WordPressRankingAdapter('https://example.com', fetcher).getTopRankings()).rejects.toBeInstanceOf(RankingResponseError);
  });
});
