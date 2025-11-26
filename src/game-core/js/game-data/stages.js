export const stages = [
  {
    key: 'meadow',
    name: '草原',
    bg1: '#9ed6ee',
    bg2: '#fff7e6',
    ground: '#7fb10a',
    enemyMul: 1.00,
    layers: [
      { src: './assets/bg/meadow_layer1.png', speed: 0.2, alpha: 1.0 },
      { src: './assets/bg/meadow_layer2.png', speed: 0.5, alpha: 1.0 },
      { src: './assets/bg/meadow_layer3.png', speed: 0.8, alpha: 1.0, bottomAligned: true }
    ],
    foregroundLayer: { src: './assets/bg/meadow_layer4.png', speed: 1.0, alpha: 1.0 },
    gimmick: null
  },
  {
    key: 'dunes',
    name: '砂漠',
    bg1: '#ffd28a',
    bg2: '#ffe9c7',
    ground: '#d2a659',
    enemyMul: 1.10,
    layers: [
      { src: './assets/bg/bg_layer_1_sky.png', speed: 0.2, alpha: 1.0 },
      { src: './assets/bg/desert.png', speed: 0.5, alpha: 0.6 },
      { src: './assets/bg/desert.png', speed: 0.8, alpha: 0.3, bottomAligned: true }
    ],
    foregroundLayer: { src: './assets/bg/dunes_layer4.png', speed: 1.0, alpha: 1.0 },
    gimmick: 'obstacle'
  },
  {
    key: 'sky',
    name: '雪原',
    bg1: '#c8e7ff',
    bg2: '#f6fbff',
    ground: '#b9d3e5',
    enemyMul: 1.22,
    layers: [
      { src: './assets/bg/bg_layer_1_sky.png', speed: 0.2, alpha: 1.0 },
      { src: './assets/bg/bg_layer_2_mountains.png', speed: 0.5, alpha: 0.9 },
      { src: './assets/bg/snow.png', speed: 0.8, alpha: 0.4, bottomAligned: true }
    ],
    foregroundLayer: { src: './assets/bg/sky_layer4.png', speed: 1.0, alpha: 1.0 },
    gimmick: 'obstacle'
  },
  {
    key: 'volcano',
    name: '火山',
    bg1: '#ff4500',
    bg2: '#ff6b35',
    ground: '#8b0000',
    enemyMul: 1.50,
    layers: [
      { src: './assets/bg/bg_layer_1_sky.png', speed: 0.2, alpha: 0.5 },
      { src: './assets/bg/bg_layer_2_mountains.png', speed: 0.5, alpha: 0.7 },
      { src: './assets/bg/bg_layer_2_mountains.png', speed: 0.8, alpha: 0.5, bottomAligned: true }
    ],
    foregroundLayer: { src: './assets/bg/volcano_layer4.png', speed: 1.0, alpha: 1.0 },
    gimmick: 'obstacle'
  },
  {
    key: 'ocean',
    name: '海底',
    bg1: '#001f3f',
    bg2: '#003366',
    ground: '#1a3a52',
    enemyMul: 1.68,
    layers: [
      { src: './assets/bg/bg_layer_1_sky.png', speed: 0.15, alpha: 0.6 },
      { src: './assets/bg/bg_layer_2_mountains.png', speed: 0.4, alpha: 0.5 },
      { src: './assets/bg/bg_layer_2_mountains.png', speed: 0.7, alpha: 0.3, bottomAligned: true }
    ],
    foregroundLayer: { src: './assets/bg/ocean_layer4.png', speed: 1.0, alpha: 1.0 },
    gimmick: 'obstacle'
  },
  {
    key: 'abyss',
    name: '宇宙',
    bg1: '#0b1833',
    bg2: '#1b2850',
    ground: '#0b1833',
    enemyMul: 1.38,
    layers: [
      { src: './assets/bg/space.png', speed: 0.1, alpha: 1.0 },
      { src: './assets/bg/space.png', speed: 0.3, alpha: 0.5 },
      { src: './assets/bg/space.png', speed: 0.6, alpha: 0.3, bottomAligned: true }
    ],
    foregroundLayer: { src: './assets/bg/abyss_layer4.png', speed: 1.0, alpha: 1.0 },
    gimmick: 'obstacle'
  },
];


export function stageForKey(key) {
  return stages.find(s => s.key === key) || stages[0];
}

// Legacy support - maps old level-based system to new stage keys
export function stageForLevel(lv) {
  const level = (typeof lv === 'number' && lv > 0) ? lv : 1;
  // Loop stages: 1-3=0, 4-6=1, 7-9=2, 10-12=3, 13-15=4, 16-18=5, 19-21=0...
  const stageIndex = Math.floor((level - 1) / 3) % 6;
  return stages[stageIndex] || stages[0];
}


export const stageBosses = {
  meadow: {
    key: 'boss-meadow',
    displayName: 'Meadow Monarch',
    icon: '🦌',
    bodyColor: '#4ade80',
    width: 140,
    height: 110,
    hp: 14,
    speed: 2.4,
    targetOffset: 260,
    floatRange: 26,
    floatSpeed: 0.024,
    attackInterval: 2200,
    projectileSpeed: 3.0,
    projectileGravity: 0.08,
    projectileSpread: 0.18,
    volley: 3,
    rewardScore: 150,
    rewardCoins: 9,
    spawnDelay: 6500,
    groundOffset: 28
  },
  dunes: {
    key: 'boss-dunes',
    displayName: 'Dune Typhoon',
    icon: '🦂',
    bodyColor: '#f97316',
    width: 150,
    height: 118,
    hp: 18,
    speed: 2.6,
    targetOffset: 220,
    floatRange: 32,
    floatSpeed: 0.027,
    attackInterval: 2000,
    projectileSpeed: 3.4,
    projectileGravity: 0.10,
    projectileSpread: 0.22,
    volley: 4,
    rewardScore: 180,
    rewardCoins: 12,
    spawnDelay: 7000,
    groundOffset: 32
  },
  sky: {
    key: 'boss-sky',
    displayName: 'Stratos Ranger',
    icon: '🦅',
    bodyColor: '#60a5fa',
    width: 160,
    height: 120,
    hp: 24,
    speed: 2.8,
    targetOffset: 200,
    floatRange: 36,
    floatSpeed: 0.031,
    attackInterval: 1800,
    projectileSpeed: 3.8,
    projectileGravity: 0.11,
    projectileSpread: 0.26,
    volley: 4,
    rewardScore: 220,
    rewardCoins: 14,
    spawnDelay: 7600,
    groundOffset: 36
  },
  volcano: {
    key: 'boss-volcano',
    displayName: 'Inferno Dragon',
    icon: '🐉',
    bodyColor: '#ff4500',
    width: 180,
    height: 135,
    hp: 28,
    speed: 2.9,
    targetOffset: 190,
    floatRange: 38,
    floatSpeed: 0.033,
    attackInterval: 1700,
    projectileSpeed: 4.0,
    projectileGravity: 0.12,
    projectileSpread: 0.28,
    volley: 5,
    rewardScore: 250,
    rewardCoins: 16,
    spawnDelay: 7800,
    groundOffset: 38
  },
  ocean: {
    key: 'boss-ocean',
    displayName: 'Leviathan',
    icon: '🐋',
    bodyColor: '#003366',
    width: 190,
    height: 140,
    hp: 36,
    speed: 3.1,
    targetOffset: 170,
    floatRange: 45,
    floatSpeed: 0.036,
    attackInterval: 1500,
    projectileSpeed: 4.4,
    projectileGravity: 0.14,
    projectileSpread: 0.32,
    volley: 6,
    rewardScore: 320,
    rewardCoins: 20,
    spawnDelay: 8500,
    groundOffset: 42
  },
  abyss: {
    key: 'boss-abyss',
    displayName: 'Abyss Sovereign',
    icon: '🐙',
    bodyColor: '#4338ca',
    width: 176,
    height: 128,
    hp: 32,
    speed: 3.0,
    targetOffset: 180,
    floatRange: 42,
    floatSpeed: 0.034,
    attackInterval: 1600,
    projectileSpeed: 4.2,
    projectileGravity: 0.13,
    projectileSpread: 0.30,
    volley: 5,
    rewardScore: 280,
    rewardCoins: 18,
    spawnDelay: 8200,
    groundOffset: 40
  }
};
