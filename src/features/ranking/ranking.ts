export type RankingEntry = {
  rank: number;
  score: number;
  recordedAt: string;
  displayName: string;
  characterLabel: string;
};

export type RankingLoadErrorCode =
  | 'configuration'
  | 'offline'
  | 'timeout'
  | 'http'
  | 'invalid-response'
  | 'network';

export class RankingLoadError extends Error {
  readonly code: RankingLoadErrorCode;

  constructor(code: RankingLoadErrorCode, message: string) {
    super(message);
    this.name = 'RankingLoadError';
    this.code = code;
  }
}
