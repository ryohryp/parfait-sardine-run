// characters.js
import { INVINCIBILITY_DURATION } from '../game-constants.js';

export const characters = {
  // Common
  parfen: { key: 'parfen', name: '🍓パフェン', emoji: '🍓', rar: 'C', move: 1.00, jump: 1.00, bullet: 1.00, inv: INVINCIBILITY_DURATION, ultRate: 1.00, special: [], ult: null },
  iwassy: { key: 'iwassy', name: '🐟イワッシー', emoji: '🐟', rar: 'C', move: 1.00, jump: 1.10, bullet: 1.00, inv: INVINCIBILITY_DURATION, ultRate: 1.00, special: ['doubleJump'], ult: null },

  // Rare
  choco: { key: 'choco', name: '🍫チョコパフェン', emoji: '🍫', rar: 'R', move: 1.00, jump: 1.00, bullet: 1.15, inv: INVINCIBILITY_DURATION, ultRate: 1.00, special: [], ult: null },
  missile: { key: 'missile', name: '🚀ミサイル', emoji: '🚀', rar: 'R', move: 1.10, jump: 1.00, bullet: 1.00, inv: INVINCIBILITY_DURATION, ultRate: 1.05, special: [], ult: null },

  // Epic
  ice: { key: 'ice', name: '❄️アイスパフェン', emoji: '❄️', rar: 'E', move: 1.00, jump: 1.20, bullet: 1.00, inv: INVINCIBILITY_DURATION, ultRate: 1.00, special: ['slowEnemy'], ult: null },

  // Legendary
  king: { key: 'king', name: '👑キングパフェ', emoji: '👑', rar: 'L', move: 1.15, jump: 1.10, bullet: 1.10, inv: INVINCIBILITY_DURATION, ultRate: 1.20, special: [], ult: 'rainbow' },
  ncha: { key: 'ncha', name: '👒んちゃマシン', emoji: '👒', image: 'assets/sprite/player_ncha.png', rar: 'L', move: 1.20, jump: 1.05, bullet: 1.25, inv: INVINCIBILITY_DURATION, ultRate: 1.25, special: ['pierce'], ult: 'ncha' },

  // Mythic
  aurora: { key: 'aurora', name: '🌈オーロラパフェ', emoji: '🌈', rar: 'M', move: 1.18, jump: 1.12, bullet: 1.15, inv: INVINCIBILITY_DURATION, ultRate: 1.35, special: ['magnet', 'oneGuard'], ult: 'rainbow' },
  iwashiK: { key: 'iwashiK', name: '🌀トルネード鰯', emoji: '🌀', rar: 'M', move: 1.15, jump: 1.20, bullet: 1.10, inv: INVINCIBILITY_DURATION, ultRate: 1.30, special: ['doubleJump', 'pierce'], ult: 'storm' },
  yadon: { key: 'yadon', name: '🦛まったりヤドン', emoji: '🦛', rar: 'M', move: 0.98, jump: 1.08, bullet: 1.05, inv: INVINCIBILITY_DURATION, ultRate: 1.45, special: ['magnet'], ult: 'yadon' },
};

window.PSR = window.PSR || {};
window.PSR.GameData = window.PSR.GameData || {};
window.PSR.GameData.characters = characters;

// レア度の表示順 → CSSクラス
export const rarOrder = ['C', 'R', 'E', 'L', 'M'];
export function rarClass(r) {
  return r === 'M' ? 'rar-m'
    : r === 'L' ? 'rar-l'
      : r === 'E' ? 'rar-e'
        : r === 'R' ? 'rar-r'
          : 'rar-c';
}

export const SPECIAL_LABELS = {
  magnet: 'アイテム吸引',
  oneGuard: '自動ガード',
  doubleJump: '二段ジャンプ',
  pierce: '貫通ショット',
  slowEnemy: '敵スロウ',
};

export const ULT_DETAILS = {
  rainbow: { name: 'レインボーレーザー', description: '3ラインのビームで前方の敵を一掃する。' },
  storm: { name: 'トルネードストーム', description: '竜巻を発生させ、一定時間周囲の敵に連続ヒット。' },
  ncha: { name: 'んちゃキャノン', description: '挨拶代わりの極太ビームを放ち、全てを貫通する。' },
  yadon: { name: 'ヤドン砲', description: '巨大な仲間を召喚し、広範囲に多段ヒットする弾をばらまく。' },
};
