import type { RankingPort } from './RankingPort';
import { RankingLoadError, type RankingEntry } from './ranking';

const ENDPOINT_PATH = 'wp-json/psr/v1/leaderboard';
const MAX_ENTRIES = 20;
const MAX_TEXT_LENGTH = 80;
const REQUEST_TIMEOUT_MS = 8_000;

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const parseFiniteNonNegativeNumber = (value: unknown): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null;
  return value;
};

const parseText = (value: unknown, fallback: string): string | null => {
  if (value == null || value === '') return fallback;
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  if (!normalized || normalized.length > MAX_TEXT_LENGTH) return null;
  return normalized;
};

const parseDate = (value: unknown): string | null => {
  if (typeof value !== 'string' || !value.trim()) return null;
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return null;
  return new Date(timestamp).toISOString();
};

const normalizeEntry = (value: unknown, index: number): RankingEntry | null => {
  if (!isRecord(value)) return null;

  const score = parseFiniteNonNegativeNumber(value.score);
  const rankValue = value.rank == null ? index + 1 : parseFiniteNonNegativeNumber(value.rank);
  const displayName = parseText(value.displayName ?? value.name, 'ANONYMOUS');
  const characterLabel = parseText(value.characterLabel ?? value.char, 'PARFAIT');
  const recordedAt = parseDate(value.recordedAt ?? value.time);

  if (score == null || rankValue == null || rankValue < 1 || displayName == null || characterLabel == null || recordedAt == null) {
    return null;
  }

  return {
    rank: Math.floor(rankValue),
    score: Math.floor(score),
    recordedAt,
    displayName,
    characterLabel,
  };
};

export const buildRankingUrl = (baseUrl: string): URL => {
  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    throw new RankingLoadError('configuration', 'ランキングAPIのURL設定が不正です。');
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new RankingLoadError('configuration', 'ランキングAPIはHTTPまたはHTTPSのURLを指定してください。');
  }

  url.pathname = `${url.pathname.replace(/\/$/, '')}/${ENDPOINT_PATH}`.replace(/\/+/g, '/');
  url.search = '';
  url.hash = '';
  return url;
};

export class WordPressRankingAdapter implements RankingPort {
  private readonly baseUrl: string | undefined;

  constructor(baseUrl: string | undefined) {
    this.baseUrl = baseUrl;
  }

  async load(signal?: AbortSignal): Promise<RankingEntry[]> {
    if (!this.baseUrl?.trim()) {
      throw new RankingLoadError('configuration', 'VITE_PSR_API_BASE_URL が設定されていません。');
    }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      throw new RankingLoadError('offline', 'オフラインのためランキングを取得できません。');
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort('timeout'), REQUEST_TIMEOUT_MS);
    const abortFromCaller = () => controller.abort(signal?.reason);
    signal?.addEventListener('abort', abortFromCaller, { once: true });

    try {
      const response = await fetch(buildRankingUrl(this.baseUrl), {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new RankingLoadError('http', `ランキングAPIがエラーを返しました（${response.status}）。`);
      }

      const payload: unknown = await response.json();
      if (!isRecord(payload) || !Array.isArray(payload.leaderboard)) {
        throw new RankingLoadError('invalid-response', 'ランキングAPIの応答形式が不正です。');
      }

      const normalized = payload.leaderboard.slice(0, MAX_ENTRIES).map(normalizeEntry);
      if (normalized.some((entry) => entry == null)) {
        throw new RankingLoadError('invalid-response', 'ランキングAPIに不正なデータが含まれています。');
      }
      return normalized as RankingEntry[];
    } catch (error) {
      if (error instanceof RankingLoadError) throw error;
      if (controller.signal.aborted) {
        if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
        throw new RankingLoadError('timeout', 'ランキングの取得がタイムアウトしました。');
      }
      if (error instanceof SyntaxError) {
        throw new RankingLoadError('invalid-response', 'ランキングAPIのJSONが不正です。');
      }
      throw new RankingLoadError('network', 'ランキングの取得に失敗しました。');
    } finally {
      window.clearTimeout(timeoutId);
      signal?.removeEventListener('abort', abortFromCaller);
    }
  }
}
