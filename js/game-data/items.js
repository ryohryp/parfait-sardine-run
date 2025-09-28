// items.js
export const ITEM_CATALOG = [
  {
    key: 'parfait',
    icon: '🍨',
    name: 'パフェ',
    description: '甘くて元気が出るご褒美デザート。集めるとちょっぴり強くなる。',
    base: 2,
    score: '+2pt',
    effect: 'コレクション+2 / ジャンプ+1 / スコア倍率+10%'
  },
  {
    key: 'fish',
    icon: '🐟',
    name: 'いわし',
    description: '海の恵み。取ると軽やかに動ける気がする。',
    base: 1,
    score: '+1pt',
    effect: 'コレクション+1 / ジャンプ+1 / スコア倍率+6%'
  },
  {
    key: 'star',
    icon: '⭐',
    name: 'スターピース',
    description: 'きらめく星のかけら。短時間コンボが続きやすくなる。',
    base: 0,
    score: 'なし',
    effect: 'コンボ持続+3秒 / スコア倍率+12%'
  }
];
