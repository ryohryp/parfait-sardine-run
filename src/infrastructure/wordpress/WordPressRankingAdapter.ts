import type { RankingEntry } from '../../domain/ranking';
import type { RankingPort } from '../../services/RankingPort';

const LEADERBOARD_PATH = '/wp-json/psrun/v2/leaderboard';
const MAX_ENTRIES = 20;
const MAX_RANK = 1_000_000;
const MAX_SCORE = 1_000_000_000;
const MAX_LABEL_LENGTH = 80;

type WordPressLeaderboardEntry = { rank: number; name: string; score: number; time?: string | null; char?: string | null };

export class RankingConfigurationError extends Error {
  constructor() { super('ランキングAPIのURLが設定されていません。'); this.name = 'RankingConfigurationError'; }
}
export class RankingResponseError extends Error {
  constructor() { super('ランキングAPIの応答形式が正しくありません。'); this.name = 'RankingResponseError'; }
}

const isNullableString = (value: unknown): value is string | null => value === undefined || value === null || typeof value === 'string';
const isSafeInteger = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value);
const isValidLabel = (value: unknown) => typeof value === 'string' && value.trim().length > 0 && value.length <= MAX_LABEL_LENGTH;
const isValidRecordedAt = (value: unknown) => isNullableString(value) && (value == null || (value.length <= 64 && !Number.isNaN(Date.parse(value))));
const isEntry = (value: unknown): value is WordPressLeaderboardEntry => {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Record<string, unknown>;
  const { rank, name, score, time, char } = entry;
  return isSafeInteger(rank) && rank > 0 && rank <= MAX_RANK
    && isValidLabel(name) && isSafeInteger(score) && score >= 0 && score <= MAX_SCORE
    && isValidRecordedAt(time) && (char == null || isValidLabel(char));
};

export function normalizeWordPressLeaderboard(payload: unknown): RankingEntry[] {
  if (!payload || typeof payload !== 'object' || !Array.isArray((payload as { leaderboard?: unknown }).leaderboard)) throw new RankingResponseError();
  const entries = (payload as { leaderboard: unknown[] }).leaderboard;
  if (!entries.every(isEntry)) throw new RankingResponseError();
  return entries.slice(0, MAX_ENTRIES).map((entry) => ({ rank: entry.rank, displayName: entry.name, score: entry.score, recordedAt: entry.time ?? null, characterLabel: entry.char ?? null }));
}

export function buildLeaderboardUrl(apiBaseUrl: string): string {
  let baseUrl: URL;
  try { baseUrl = new URL(apiBaseUrl); } catch { throw new RankingConfigurationError(); }
  if (baseUrl.protocol !== 'http:' && baseUrl.protocol !== 'https:') throw new RankingConfigurationError();
  const basePath = baseUrl.pathname.replace(/\/+$/, '');
  baseUrl.pathname = basePath.endsWith(LEADERBOARD_PATH) ? basePath : `${basePath}${LEADERBOARD_PATH}`;
  baseUrl.search = '';
  baseUrl.hash = '';
  return baseUrl.toString();
}

export class WordPressRankingAdapter implements RankingPort {
  private readonly apiBaseUrl: string | undefined;
  private readonly fetcher: typeof fetch;

  constructor(apiBaseUrl: string | undefined, fetcher: typeof fetch = fetch) {
    this.apiBaseUrl = apiBaseUrl;
    this.fetcher = fetcher;
  }
  async getTopRankings(signal?: AbortSignal): Promise<RankingEntry[]> {
    const baseUrl = this.apiBaseUrl?.trim();
    if (!baseUrl) throw new RankingConfigurationError();
    let response: Response;
    try {
      response = await this.fetcher(buildLeaderboardUrl(baseUrl), { headers: { Accept: 'application/json' }, signal });
    } catch (error) {
      if (signal?.aborted) throw error;
      throw new Error('ネットワークに接続できません。通信状態を確認して再試行してください。');
    }
    if (!response.ok) throw new Error(`ランキングの取得に失敗しました (${response.status})。`);
    try { return normalizeWordPressLeaderboard(await response.json()); } catch (error) { if (error instanceof RankingResponseError) throw error; throw new RankingResponseError(); }
  }
}
