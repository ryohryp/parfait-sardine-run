import type { RankingEntry } from '../domain/ranking';

export interface RankingPort {
  getTopRankings(signal?: AbortSignal): Promise<RankingEntry[]>;
}
