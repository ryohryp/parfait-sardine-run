import type { RankingEntry } from './ranking';

export interface RankingPort {
  load(signal?: AbortSignal): Promise<RankingEntry[]>;
}
