// characters.js
import { INVINCIBILITY_DURATION } from '../game-constants.js';

export const characters = {
  // [N] Normal - 基本
  parfen: { key: 'parfen', name: '🍓パフェン', emoji: '🍓', rar: 'N', move: 1.00, jump: 1.00, bullet: 1.00, inv: INVINCIBILITY_DURATION, ultRate: 1.00, special: [], ult: null },
  choco: { key: 'choco', name: '🍫チョコパフェン', emoji: '🍫', rar: 'N', move: 1.00, jump: 1.00, bullet: 1.20, inv: INVINCIBILITY_DURATION, ultRate: 1.10, special: [], ult: null },

  // [R] Rare - 一芸特化
  missile: { key: 'missile', name: '🚀ミサイル', emoji: '🚀', rar: 'R', move: 1.30, jump: 0.90, bullet: 1.00, inv: INVINCIBILITY_DURATION, ultRate: 1.00, special: [], ult: null }, // 超高速
  iwassy: { key: 'iwassy', name: '🐟イワッシー', emoji: '🐟', rar: 'R', move: 1.00, jump: 1.30, bullet: 1.00, inv: INVINCIBILITY_DURATION, ultRate: 1.00, special: ['doubleJump'], ult: null }, // 超高ジャンプ

  // [SR] Super Rare - 特殊能力
  ice: { key: 'ice', name: '❄️アイスパフェン', emoji: '❄️', rar: 'SR', move: 1.00, jump: 1.10, bullet: 1.00, inv: INVINCIBILITY_DURATION, ultRate: 1.00, special: ['slowEnemy'], ult: null },
  yadon: { key: 'yadon', name: '🦛まったりヤドン', emoji: '🦛', rar: 'SR', move: 0.85, jump: 1.00, bullet: 1.00, inv: INVINCIBILITY_DURATION, ultRate: 1.50, special: ['magnet'], ult: 'yadon' },

  // [SSR] Double Super Rare - 必殺技特化
  king: { key: 'king', name: '👑キングパフェ', emoji: '👑', rar: 'SSR', move: 1.10, jump: 1.10, bullet: 1.10, inv: INVINCIBILITY_DURATION, ultRate: 1.60, special: ['oneGuard'], ult: 'rainbow' },
  iwashiK: { key: 'iwashiK', name: '🌀トルネード鰯', emoji: '🌀', rar: 'SSR', move: 1.15, jump: 1.20, bullet: 1.10, inv: INVINCIBILITY_DURATION, ultRate: 1.20, special: ['doubleJump', 'pierce'], ult: 'storm' },

  // [L] Legendary - 最強
  aurora: { key: 'aurora', name: '🌈オーロラパフェ', emoji: '🌈', rar: 'L', move: 1.15, jump: 1.15, bullet: 1.15, inv: INVINCIBILITY_DURATION, ultRate: 1.35, special: ['magnet', 'oneGuard'], ult: 'rainbow' },
  ncha: {
    key: 'ncha', name: '🤖んちゃマシン', emoji: '🤖',
    image: 'assets/sprite/ncha.png',
    spriteConfig: {
      cols: 8,
      rows: 1,
      walkFrames: [0, 1, 2, 3, 4, 5],
      jumpFrames: [6, 7]
    },
    rar: 'L',
    move: 1.25, jump: 1.25, bullet: 1.30, inv: INVINCIBILITY_DURATION, ultRate: 1.40,
    special: ['pierce', 'doubleJump', 'slowEnemy'], // 全部盛り
    ult: 'ncha'
  },
};

window.PSR = window.PSR || {};
window.PSR.GameData = window.PSR.GameData || {};
window.PSR.GameData.characters = characters;

// レア度の表示順 → CSSクラス
export const rarOrder = ['N', 'R', 'SR', 'SSR', 'L'];
export function rarClass(r) {
  return r === 'L' ? 'rar-m'
    : r === 'SSR' ? 'rar-l'
      : r === 'SR' ? 'rar-e'
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
