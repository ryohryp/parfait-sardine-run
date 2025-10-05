// main.js  (Parfait & Sardine RUN!)
// 修正点：
// - event.target.closest が無いノード(Text など)でも安全に動くようヘルパ＆Polyfill追加
// - モーダル検知の対象をID限定にして modal-open の誤判定を防止
// - #touchControls を .scene-wrap の外へ退避（pointer-events 無効化の巻き添え防止）
// - その他のロジックは現行を維持

import './js/utils.js';
import './js/howto.js';
import './js/leaderboard.js';
import './js/settings.js';
import './js/comments.js';

import { showStageTitle, cameraShake, floatText, speedSE } from './js/presentation.js';
import { initAudio, playBgm, stopBgm, playSfx } from './js/audio.js';
import { G, BASE_JUMP, GROUND, GAME_TIME, INVINCIBILITY_DURATION, SHOOT_COOLDOWN as shootCD, POWER_DURATION as powerMillis, ENEMY_BONUS as enemyBonus, ITEM_LEVEL as itemLv } from './js/game-constants.js';
import { ITEM_CATALOG } from './js/game-data/items.js';
import { characters, rarOrder, rarClass, SPECIAL_LABELS, ULT_DETAILS } from './js/game-data/characters.js';
import { stages, stageForLevel, stageBosses } from './js/game-data/stages.js';
import { registerSW, checkLatestAndBadge, initUpdateUI, ensureUpdateBtnOutside } from './js/app-update.js';

// 先頭付近に置く（PSRUN_STARTより前）
function now(){ return performance.now(); }
function clamp(v, min, max){ return Math.max(min, Math.min(max, v)); }
function rand(a, b){ return a + Math.random() * (b - a); }
function AABB(a,b){ return a.x<b.x+b.w && a.x+a.w>b.x && a.y<b.y+b.h && a.y+a.h>b.y; }

// ==== Polyfill & 安全ヘルパ（closestエラー対策） ====
// Polyfill: Element.prototype.closest（古環境保険）
if (typeof Element !== 'undefined' && !Element.prototype.closest) {
  // eslint-disable-next-line no-extend-native
  Element.prototype.closest = function(sel){
    let el = this;
    while (el && el.nodeType === 1) {
      if (el.matches && el.matches(sel)) return el;
      el = el.parentElement || el.parentNode;
    }
    return null;
  };
}
// event から安全に Element を得る
function getEventElement(ev){
  if (ev && ev.target instanceof Element) return ev.target;
  if (ev && typeof ev.composedPath === 'function') {
    const n = ev.composedPath().find(n => n instanceof Element);
    if (n) return n;
  }
  const t = ev && ev.target;
  if (t && t.parentElement instanceof Element) return t.parentElement;
  return null;
}

(()=>{
// ====== 開始/終了 ======
window.PSRUN_START = function PSRUN_START(){
  hideResultOverlay();
  resetRunStats();
  score=0; level=1; lives=3; invUntil=0; hurtUntil=0; ult=0; ultReady=false; ultActiveUntil=0;
  coins=0; autoShootUntil=0; bulletBoostUntil=0; scoreMulUntil=0;
  items.length=0; enemies.length=0; bullets.length=0; powers.length=0; ultProjectiles.length=0; bossProjectiles.length=0;
  bossState = null;
  defeatedBossStages = new Set();
  currentStageKey = stageForLevel(level).key;
  bossNextSpawnAt = 0;
  player.x=120; player.y=cv.height-GROUND-player.h; player.vy=0; player.onGround=true;
  canDouble = characters[currentCharKey].special?.includes('doubleJump');
  guardReadyTime = 0;
  resetPlayerAnimation();
  btnStart.style.display='none'; btnRestart.style.display='none';
  setStartScreenVisible(false);
  t0=now(); gameOn=true;
  playBgm({ reset: true });
  lastItem=lastEnemy=lastPower=lastShot=t0;
  currentStats = getEffectiveStats(currentCharKey);
  setHUD(GAME_TIME); draw(GAME_TIME, stageForLevel(level));
  requestAnimationFrame(update);
};

function startGame(){ window.PSRUN_START(); }

const PSR = window.PSR || {};
const HowtoModule = PSR.Howto || null;
const LeaderboardModule = PSR.Leaderboard || null;
const CommentsModule = PSR.Comments || null;
// ====== 基本 ======
const cv = document.getElementById('cv');
const c = cv.getContext('2d');
const hud = document.getElementById('hud');
const btnStart = document.getElementById('start');
const btnRestart = document.getElementById('restart');
const startScreen = document.getElementById('startScreen');
const touchControls = document.getElementById('touchControls');
const btnUlt = document.getElementById('ultBtn');
const btnAttack = document.getElementById('attackBtn');
const btnJump = document.getElementById('jumpBtn');
const btnGacha = document.getElementById('gachaOpen');
const btnGacha10 = document.getElementById('gacha10');
const btnCollection = document.getElementById('collection');
const btnCodex = document.getElementById('codexBtn');
const charInfo = document.getElementById('charInfo');
const resultOverlay = document.getElementById('resultOverlay');
const resultClose = document.getElementById('resultClose');
const resultSummary = document.getElementById('resultSummary');
const resultItemList = document.getElementById('resultItemList');
const resultEnemyList = document.getElementById('resultEnemyList');
const resultRetry = document.getElementById('resultRetry');
const resultMenu = document.getElementById('resultMenu');
const resultLeaderboardBtn = document.getElementById('resultLeaderboard');
const resultCommentBtn = document.getElementById('resultComment');

const OVERLAY_SELECTOR = '.overlay';

function openOverlay(el){
  if (!el) return;
  document.body.classList.add('modal-open');
  el.hidden = false;
  el.classList.add('show');
  if (el.style?.display){
    el.style.removeProperty('display');
  }
}

function closeOverlay(el){
  if (!el) return;
  el.hidden = true;
  el.classList.remove('show');
  if (el.style?.display){
    el.style.removeProperty('display');
  }
  if (!document.querySelector(`${OVERLAY_SELECTOR}:not([hidden])`)){
    document.body.classList.remove('modal-open');
  }
}

window.PSR = window.PSR || {};
window.PSR.UI = Object.assign(window.PSR.UI || {}, {
  openOverlay,
  closeOverlay,
  isOverlayOpen: () => !!document.querySelector(`${OVERLAY_SELECTOR}:not([hidden])`)
});

// selectstart 時に Text ノード等が来ても安全に closest できるように
document.addEventListener('selectstart', (event) => {
  const el = getEventElement(event);
  if (el && el.closest('button')){
    event.preventDefault();
  }
});

const preGameOverlay = document.getElementById('preGameOverlay');
const preGameClose = document.getElementById('preGameClose');
const preGameStart = document.getElementById('preGameStart');
const preGameCharList = document.getElementById('preGameCharList');
const preGameSummary = document.getElementById('preGameSummary');
const preGameUlt = document.getElementById('preGameUlt');
const preGameSpecial = document.getElementById('preGameSpecial');
const preGameStats = document.getElementById('preGameStats');
let preGameSelectedKey = null;

initAudio();

// 自キャラ画像（スプライトシート）
const PLAYER_SPRITE_PATH = 'assets/player-cube-sheet.png';
const PLAYER_SPRITE_COLUMNS = 3;
const PLAYER_SPRITE_ROWS = 2;
const PLAYER_WALK_FRAMES = [0, 1, 2, 3];
const PLAYER_JUMP_FRAMES = [4, 5];
const PLAYER_WALK_FRAME_DURATION = 120; // ms per frame

const playerSprite = {
  image: new Image(),
  loaded: false,
  frameWidth: 0,
  frameHeight: 0,
};

const playerAnimation = {
  sequence: PLAYER_WALK_FRAMES,
  sequenceIndex: 0,
  frameElapsed: 0,
  currentFrame: PLAYER_WALK_FRAMES[0],
};

// === タッチコントロールも .scene-wrap の外へ退避（安全策） ===
(function detachTouchControls(){
  const wrap = document.querySelector('#sceneWrap, .scene-wrap');
  const panel = document.getElementById('touchControls');
  if (wrap && panel && wrap.contains(panel)){
    document.body.appendChild(panel);
  }
})();

window.addEventListener('DOMContentLoaded', async () => {
  ensureUpdateBtnOutside();
  await registerSW();
  initUpdateUI();
  await checkLatestAndBadge();
  setInterval(checkLatestAndBadge, 6 * 60 * 60 * 1000);
});

let lastPlayerAnimTick = null;

playerSprite.image.src = PLAYER_SPRITE_PATH;
playerSprite.image.onload = ()=>{
  playerSprite.loaded = true;
  playerSprite.frameWidth = Math.floor(playerSprite.image.naturalWidth / PLAYER_SPRITE_COLUMNS);
  playerSprite.frameHeight = Math.floor(playerSprite.image.naturalHeight / PLAYER_SPRITE_ROWS);
};
playerSprite.image.onerror = ()=>{ playerSprite.loaded = false; };
// ガチャUI
const ov = document.getElementById('gachaOverlay');
const resWrap = document.getElementById('gachaResults');
const gachaClose = document.getElementById('gachaClose');
const pull1 = document.getElementById('pull1');
const pull10 = document.getElementById('pull10');
if (gachaClose){ gachaClose.onclick = ()=> closeOverlay(ov); }
if (pull1){ pull1.onclick = ()=> doGacha(1); }
if (pull10){ pull10.onclick = ()=> doGacha(10); }

// コレクションUI
const colOv = document.getElementById('colOverlay');
const colGrid = document.getElementById('colGrid');
const colClose = document.getElementById('colClose');
const colEquip = document.getElementById('colEquip');
let colSelectedKey = null;
if (colClose){
  colClose.onclick = ()=>{
    closeOverlay(colOv);
    colSelectedKey = null;
    if (colEquip) colEquip.disabled = true;
  };
}
if (colEquip){
  colEquip.onclick = ()=>{
    if(colSelectedKey){
      setCurrentChar(colSelectedKey);
      closeOverlay(colOv);
    }
  };
}

// 図鑑UI
const codexOverlay = document.getElementById('codexOverlay');
const codexClose = document.getElementById('codexClose');
const codexList = document.getElementById('codexList');
if (btnCodex){
  btnCodex.onclick = ()=>{
    populateCodex();
    openOverlay(codexOverlay);
  };
}
if (codexClose){
  codexClose.onclick = ()=> closeOverlay(codexOverlay);
}

function populateCodex(){
  if (!codexList) return;
  codexList.innerHTML='';
  ITEM_CATALOG.forEach(item=>{
    const li = document.createElement('li');
    li.className = 'codexItem';

    const icon = document.createElement('div');
    icon.className = 'codexIcon';
    icon.textContent = item.icon;

    const body = document.createElement('div');
    body.className = 'codexBody';

    const title = document.createElement('h3');
    title.textContent = `${item.icon} ${item.name}`;

    const desc = document.createElement('p');
    desc.textContent = item.description;

    const meta = document.createElement('div');
    meta.className = 'codexMeta';

    const scoreSpan = document.createElement('span');
    scoreSpan.textContent = `スコア: ${item.score}`;

    const effectSpan = document.createElement('span');
    effectSpan.textContent = `効果: ${item.effect}`;

    meta.appendChild(scoreSpan);
    meta.appendChild(effectSpan);

    body.appendChild(title);
    body.appendChild(desc);
    body.appendChild(meta);

    li.appendChild(icon);
    li.appendChild(body);

    codexList.appendChild(li);
  });
}


// 物理 & ゲーム基本
let gameOn=false, t0=0;
let lastItem=0, lastEnemy=0, lastPower=0, lastShot=0;
let score=0, level=1, lives=3, invUntil=0, hurtUntil=0;
let ult=0, ultReady=false, ultActiveUntil=0;
let coins=0; // ガチャ用
let autoShootUntil=0, bulletBoostUntil=0, scoreMulUntil=0;

let runStats; // ★ 追加：ラン集計の入れ物（resetRunStatsで初期化）

const player = { x:120, y:cv.height-GROUND-46, w:46, h:46, vy:0, onGround:true, color:'#ff6347' };

function resetPlayerAnimation(){
  playerAnimation.sequence = PLAYER_WALK_FRAMES;
  playerAnimation.sequenceIndex = 0;
  playerAnimation.frameElapsed = 0;
  playerAnimation.currentFrame = PLAYER_WALK_FRAMES[0];
  lastPlayerAnimTick = null;
}

function updatePlayerAnimation(delta){
  if (!Number.isFinite(delta) || delta < 0) delta = 0;

  if (player.onGround){
    if (playerAnimation.sequence !== PLAYER_WALK_FRAMES){
      playerAnimation.sequence = PLAYER_WALK_FRAMES;
      playerAnimation.sequenceIndex = 0;
      playerAnimation.frameElapsed = 0;
      playerAnimation.currentFrame = PLAYER_WALK_FRAMES[0];
    }

    playerAnimation.frameElapsed += delta;
    const frameAdvance = Math.floor(playerAnimation.frameElapsed / PLAYER_WALK_FRAME_DURATION);
    if (frameAdvance > 0){
      playerAnimation.frameElapsed -= frameAdvance * PLAYER_WALK_FRAME_DURATION;
      playerAnimation.sequenceIndex = (playerAnimation.sequenceIndex + frameAdvance) % playerAnimation.sequence.length;
      playerAnimation.currentFrame = playerAnimation.sequence[playerAnimation.sequenceIndex];
    }
  } else {
    if (playerAnimation.sequence !== PLAYER_JUMP_FRAMES){
      playerAnimation.sequence = PLAYER_JUMP_FRAMES;
      playerAnimation.sequenceIndex = 0;
    }
    playerAnimation.frameElapsed = 0;
    playerAnimation.currentFrame = player.vy < 0 ? PLAYER_JUMP_FRAMES[0] : PLAYER_JUMP_FRAMES[1];
  }
}

let items=[], enemies=[], bullets=[], powers=[], ultProjectiles=[];

// ステージ
let bossState = null;
let bossProjectiles = [];
let defeatedBossStages = new Set();
let bossNextSpawnAt = 0;
let currentStageKey = stages[0].key;

window.PSR = window.PSR || {};
window.PSR.GameData = window.PSR.GameData || {};
window.PSR.GameData.characters = characters;

// レア→カラー/順序
const STORE_KEY = 'psrun_char_collection_v1';
const BEST_SCORE_KEY = 'psrun_best_score_v1';
let collection = loadCollection();
let currentCharKey = collection.current || 'parfen';
if(!collection.owned[currentCharKey]) {
  // 初回はパフェン付与
  collection.owned.parfen = { owned:true, dup:0, limit:0 };
  saveCollection();
  currentCharKey = 'parfen';
}
updateCharInfo();
let bestScore = loadBestScore();

// ====== ガチャ：確率 & 天井 ======
/*
  確率：C60/R24/E10/L5/M1
  天井：30連でL以上保証 / 100連でM保証
*/
const pityKey = 'psrun_pity_v1';
let pity = loadPity(); // {sinceL:0, sinceM:0}

function rollRarity(){
  const p = Math.random();
  if (p < 0.01) return 'M';
  if (p < 0.06) return 'L';
  if (p < 0.16) return 'E';
  if (p < 0.40) return 'R';
  return 'C';
}
function rollCharByRar(r){
  const pool = Object.values(characters).filter(c=>c.rar===r);
  return pool[Math.floor(Math.random()*pool.length)];
}
function doGacha(n){
  const cost = n===10?100:10;
  if (coins<cost) return;
  coins -= cost;

  
  let rarities = [];
  for(let i=0;i<n;i++){
    let r = rollRarity();
    // 30連L保障（sinceL>=29 で次はL以上保証）
    if (pity.sinceL >= 29 && i===0) r = (Math.random()<0.167)?'M':'L';
    rarities.push(r);
  }
  // 100連M保障（sinceM>=99 で最後をMに）
  if (pity.sinceM >= 99) rarities[rarities.length-1] = 'M';

  // 結果生成
  const results = rarities.map(r=>{
    const ch = rollCharByRar(r);
    addToCollection(ch.key);
    // pity更新
    if (r==='M') { pity.sinceM=0; pity.sinceL=0; }
    else if (r==='L') { pity.sinceL=0; pity.sinceM++; }
    else { pity.sinceL++; pity.sinceM++; }
    return ch;
  });
  savePity();
  setHUD(GAME_TIME-(now()-t0));

  // 表示
  resWrap.innerHTML='';
  resWrap.style.gridTemplateColumns = `repeat(${Math.min(5,results.length)},1fr)`;
  results.forEach(ch=>{
    const dv=document.createElement('div');
    dv.className=`miniCard ${rarClass(ch.rar)}`;
    const own = collection.owned[ch.key];
    dv.innerHTML = `<div class="big">${ch.emoji}</div>
      <div>${ch.name}</div>
      <div class="small">R:${ch.rar} / LB:${own.limit}</div>`;
    dv.onclick = ()=>{ setCurrentChar(ch.key); closeOverlay(ov); };
    resWrap.appendChild(dv);
  });
  openOverlay(ov);
}

function addToCollection(key){
  if (!collection.owned[key]) collection.owned[key] = { owned:true, dup:0, limit:0 };
  else {
    collection.owned[key].dup++;
    // 限界突破ルール（被り強化）
    const rar = characters[key].rar;
    const inc = rar==='M' ? 0.04 : rar==='L' ? 0.03 : rar==='E' ? 0.025 : rar==='R' ? 0.015 : 0.005;
    collection.owned[key].limit = +(collection.owned[key].limit + inc).toFixed(3); // 小数で蓄積
  }
  saveCollection();
}

// コレクションUI
btnCollection.onclick = ()=>{
  colGrid.innerHTML='';
  // ソート：レア→所持→名前
  const list = Object.values(characters).sort((a,b)=>{
    const ra = rarOrder.indexOf(a.rar), rb = rarOrder.indexOf(b.rar);
    if (ra!==rb) return ra-rb;
    const oa = !!collection.owned[a.key], ob = !!collection.owned[b.key];
    if (oa!==ob) return (ob?1:-1);
    return a.name.localeCompare(b.name,'ja');
  });
  list.forEach(ch=>{
    const own = collection.owned[ch.key];
    const dv=document.createElement('div');
    dv.className=`miniCard ${rarClass(ch.rar)}`;
    dv.innerHTML = `<div class="big">${ch.emoji}</div>
      <div>${ch.name}</div>
      <div class="small">${own?`R:${ch.rar} / LB:${own.limit||0}`:'未所持'}</div>`;
    dv.onclick = ()=>{
      colSelectedKey = ch.key;
      colEquip.disabled = !own;
      // 軽い選択ハイライト
      [...colGrid.children].forEach(x=>x.style.outline='none');
      dv.style.outline='2px solid #fff';
    };
    colGrid.appendChild(dv);
  });
  openOverlay(colOv);
};

// ====== HUD / 便利 ======
function hearts(n){
  const count = Math.max(0, Math.min(3, Math.floor(n)));
  return '❤️'.repeat(count) + '♡'.repeat(3-count);
}
function setHUD(remainMs){
  const sec = Math.max(0, Math.ceil(remainMs/1000));
  const st = stageForLevel(level).name;
  const ch = characters[currentCharKey];
  const own = collection.owned[currentCharKey];
  const lb = own?.limit ? own.limit : 0;
  const bestText = (Number.isFinite(bestScore) ? bestScore : 0).toLocaleString('ja-JP');
  const scoreText = score.toLocaleString('ja-JP');
  const coinText = coins.toLocaleString('ja-JP');
  const nowTs = now();
  const effects = [];
  if (nowTs < invUntil){ effects.push({ icon:'🛡️', label:'無敵', remain: (invUntil - nowTs) / 1000 }); }
  if (nowTs < autoShootUntil){ effects.push({ icon:'🤖', label:'連射', remain: (autoShootUntil - nowTs) / 1000 }); }
  if (nowTs < bulletBoostUntil){ effects.push({ icon:'💥', label:'火力UP', remain: (bulletBoostUntil - nowTs) / 1000 }); }
  if (nowTs < scoreMulUntil){ effects.push({ icon:'✖️2', label:'スコアUP', remain: (scoreMulUntil - nowTs) / 1000 }); }
  if (gameOn && nowTs < ultActiveUntil){ effects.push({ icon:'🌈', label:'必殺', remain: (ultActiveUntil - nowTs) / 1000 }); }
  const effectsHtml = effects.map(effect => {
    const remainText = `${Math.max(0, effect.remain).toFixed(1)}s`;
    return `<span class="hudEffect"><span class="icon">${effect.icon}</span><span class="label">${effect.label}</span><span class="time">${remainText}</span></span>`;
  }).join('');
  const effectsClass = effects.length ? 'hudEffects' : 'hudEffects isHidden';

  hud.innerHTML = `
    <div class="hudRow hudRowPrimary">
      <div class="hudItem hudLife">
        <span class="hudLabel">ライフ</span>
        <span class="hudValue hudHearts">${hearts(lives)}</span>
        <span class="hudGauge">必殺 ${Math.floor(ult)}%</span>
      </div>
      <div class="hudItem hudTime">
        <span class="hudLabel">残り時間</span>
        <span class="hudValue">${sec}秒</span>
      </div>
      <div class="hudItem hudScore">
        <span class="hudLabel">スコア</span>
        <span class="hudValue hudScoreValue">${scoreText}</span>
      </div>
    </div>
    <div class="hudRow hudRowSecondary">
      <div class="hudItem hudStage">
        <span class="hudLabel">ステージ</span>
        <span class="hudValue">${st}</span>
        <span class="hudSub">Lv.${level}</span>
      </div>
      <div class="hudItem hudCoins">
        <span class="hudLabel">コイン</span>
        <span class="hudValue">🪙${coinText}</span>
      </div>
      <div class="hudItem hudBest">
        <span class="hudLabel">ベスト</span>
        <span class="hudValue">${bestText}</span>
      </div>
    </div>
    <div class="${effectsClass}">${effectsHtml}</div>`;

  charInfo.textContent = `CHAR: ${ch.emoji} ${ch.name} [${ch.rar}]  LB:${lb}`;

  if (touchControls){
    touchControls.classList.toggle('isVisible', gameOn);
    touchControls.setAttribute('aria-hidden', gameOn ? 'false' : 'true');
  }
  if (btnJump){ btnJump.disabled = !gameOn; }
  if (btnAttack){ btnAttack.disabled = !gameOn; }
  if (btnUlt){
    const ready = gameOn && ultReady;
    btnUlt.disabled = !ready;
    btnUlt.classList.toggle('isReady', ready);
  }

  btnGacha.disabled = coins < 10;
  btnGacha10.disabled = coins < 100;
}

function setStartScreenVisible(show){
  if (!startScreen) return;
  startScreen.classList.toggle('isHidden', !show);
  startScreen.setAttribute('aria-hidden', show ? 'false' : 'true');
}

function describeUlt(key){
  if (!key){
    return { title:'必殺技なし', text:'このキャラは必殺技を持たず、基礎能力で勝負します。' };
  }
  const entry = ULT_DETAILS[key];
  if (entry){
    return { title:`必殺技：${entry.name}`, text:entry.description };
  }
  return { title:`必殺技：${key}`, text:'固有必殺技を発動できます。' };
}

function buildPreGameList(){
  if (!preGameCharList) return;
  preGameCharList.innerHTML = '';
  const ownedKeys = Object.keys(collection.owned || {}).filter(key => collection.owned[key]?.owned);
  const sorted = ownedKeys
    .map(key => characters[key])
    .filter(Boolean)
    .sort((a,b)=>{
      const ra = rarOrder.indexOf(a.rar);
      const rb = rarOrder.indexOf(b.rar);
      if (ra !== rb) return ra - rb;
      return a.name.localeCompare(b.name,'ja');
    });
  if (!sorted.length){
    const empty = document.createElement('div');
    empty.className = 'preGameEmpty';
    empty.textContent = 'キャラを入手するとここに表示されます。';
    preGameCharList.appendChild(empty);
    return;
  }
  sorted.forEach(ch => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'preCharCard';
    if (ch.key === preGameSelectedKey){ btn.classList.add('isSelected'); }
    btn.innerHTML = `<span class="emoji">${ch.emoji}</span><span class="name">${ch.name}</span><span class="rar">[${ch.rar}]</span>`;
    btn.addEventListener('click', ()=>{
      preGameSelectedKey = ch.key;
      [...preGameCharList.children].forEach(node => node.classList?.remove?.('isSelected'));
      btn.classList.add('isSelected');
      updatePreGameDetails();
    });
    preGameCharList.appendChild(btn);
  });
}

function updatePreGameDetails(){
  const key = preGameSelectedKey || currentCharKey;
  const ch = characters[key];
  if (!ch){ return; }
  const stats = [
    { label:'移動速度', value: `${Math.round(ch.move * 100)}%` },
    { label:'ジャンプ力', value: `${Math.round(ch.jump * 100)}%` },
    { label:'ショット', value: `${Math.round(ch.bullet * 100)}%` },
    { label:'必殺充填', value: `${Math.round(ch.ultRate * 100)}%` }
  ];
  const specials = Array.isArray(ch.special) ? ch.special : [];
  const ult = describeUlt(ch.ult);
  if (preGameSummary){
    preGameSummary.textContent = `${ch.emoji} ${ch.name}`;
  }
  if (preGameUlt){
    const ultInfo = describeUlt(ch.ult);
    preGameUlt.textContent = `${ultInfo.title} - ${ultInfo.text}`; // 「 ? 」→「 - 」
  }
  if (preGameSpecial){
    if (specials.length){
      preGameSpecial.innerHTML = specials.map(code => `<span>${SPECIAL_LABELS[code] || code}</span>`).join('');
    } else {
      preGameSpecial.innerHTML = '<span>特性なし</span>';
    }
  }
  if (preGameStats){
    preGameStats.innerHTML = stats.map(stat => `<li><span>${stat.label}</span><span class="value">${stat.value}</span></li>`).join('');
  }
}

function openPreGame(mode='start'){
  if (!preGameOverlay || !preGameStart){
    startGame();
    return;
  }
  preGameSelectedKey = currentCharKey;
  preGameStart.textContent = mode === 'retry' ? 'リトライ開始' : 'ゲームスタート';
  buildPreGameList();
  updatePreGameDetails();
  preGameOverlay.dataset.mode = mode;
  openOverlay(preGameOverlay);
  setTimeout(()=>{ try { preGameStart.focus(); } catch {} }, 60);
}

function closePreGame(){
  if (preGameOverlay){
    closeOverlay(preGameOverlay);
  }
  preGameSelectedKey = null;
}

function handlePreGameStart(){
  if (preGameSelectedKey && preGameSelectedKey !== currentCharKey){
    setCurrentChar(preGameSelectedKey);
  }
  closePreGame();
  startGame();
}

function requestStart(mode='start'){
  // ブート未完了でも開始を許可。ただしログは出す。
  if (!window.PSRUN_BOOT_READY) {
    console.warn('[PSR] Boot not marked ready yet — proceeding to preGame anyway.');
    // presentation.js 側が既に読み込まれている場合に備え、念のため強制ブートイベントも投げる
    try { window.dispatchEvent(new Event('psr:forceBoot')); } catch {}
  }
  if (gameOn) return;
  openPreGame(mode);
}

function refreshHUD(){
  const remain = gameOn ? (GAME_TIME - (now()-t0)) : 0;
  setHUD(remain);
}
//const now = ()=>performance.now();
//const rand = (a,b)=> a + Math.random()*(b-a);
//const AABB = (a,b)=> a.x<b.x+b.w && a.x+a.w>b.x && a.y<b.y+b.h && a.y+a.h>b.y;
//const clamp = (v,min,max)=> Math.max(min, Math.min(max,v));

function createRunStats(){
  const itemStats = {};
  ITEM_CATALOG.forEach(item=>{
    itemStats[item.key] = { count:0, total:0 };
  });
  return {
    items: itemStats,
    enemies: {
      totalCount:0,
      totalScore:0,
      types:{}
    }
  };
}

function resetRunStats(){
  runStats = createRunStats();
}

function registerItemGain(key, gained){
  if (!runStats?.items?.[key]) return;
  runStats.items[key].count += 1;
  runStats.items[key].total += gained;
}

function awardEnemyDefeat(enemy){
  score += enemyBonus;
  coins += 2;
  if (!runStats?.enemies) return;
  runStats.enemies.totalCount += 1;
  runStats.enemies.totalScore += enemyBonus;
  const type = enemy?.type || 'other';
  if (!runStats.enemies.types[type]){
    runStats.enemies.types[type] = { count:0, total:0 };
  }
  runStats.enemies.types[type].count += 1;
  runStats.enemies.types[type].total += enemyBonus;
}

function buildItemBreakdown(){
  return ITEM_CATALOG.map(item=>{
    const data = runStats?.items?.[item.key] || { count:0, total:0 };
    const count = data.count || 0;
    const base = item.base || 0;
    const total = Number(data.total || 0);
    const baseTotal = count * base;
    const bonus = Math.max(0, total - baseTotal);
    return {
      key:item.key,
      icon:item.icon,
      name:item.name,
      count,
      base,
      total,
      bonus,
      note: base===0 ? item.effect : ''
    };
  });
}

function buildEnemyBreakdown(){
  const enemyStats = runStats?.enemies || { totalCount:0, totalScore:0, types:{} };
  const breakdown = [];
  const seen = new Set();
  Object.entries(enemyTypeMeta).forEach(([type, meta])=>{
    const data = enemyStats.types?.[type] || { count:0, total:0 };
    const count = data.count || 0;
    const total = Number(data.total || 0);
    const baseScore = meta?.base ?? enemyBonus;
    const bonus = Math.max(0, total - baseScore * count);
    breakdown.push({
      type,
      icon: meta.icon,
      name: meta.label,
      count,
      base: baseScore,
      total,
      bonus
    });
    seen.add(type);
  });
  Object.entries(enemyStats.types || {}).forEach(([type, data])=>{
    if (seen.has(type)) return;
    const count = data.count || 0;
    const total = Number(data.total || 0);
    const meta = enemyTypeMeta[type];
    const baseScore = meta?.base ?? enemyBonus;
    const bonus = Math.max(0, total - baseScore * count);
    const label = meta?.label || (type === 'other' ? 'Other' : `Other (${type})`);
    const icon = meta?.icon || enemyTypeIcons[type] || '?';
    breakdown.push({
      type,
      icon,
      name: label,
      count,
      base: baseScore,
      total,
      bonus
    });
  });
  return {
    totalCount: enemyStats.totalCount || 0,
    totalScore: enemyStats.totalScore || 0,
    types: breakdown
  };
}

function buildScoreBreakdownLines(){
  const lines = [];
  const itemBreakdown = buildItemBreakdown();
  itemBreakdown.forEach(entry=>{
    const totalText = Number(entry.total || 0).toLocaleString('ja-JP');
    if (entry.base === 0){
      const note = entry.count>0 && entry.note ? `（${entry.note}）` : '';
      lines.push(`${entry.icon} ${entry.name}: ${entry.count}個 ×0 = 0pt${note ? note : ''}`);
    }else{
      let line = `${entry.icon} ${entry.name}: ${entry.count}個 ×${entry.base} = ${totalText}pt`;
      if (entry.bonus>0){
        line += `（ボーナス+${entry.bonus.toLocaleString('ja-JP')}）`;
      }
      lines.push(line);
    }
  });
  const enemyBreak = buildEnemyBreakdown();
  const counted = enemyBreak.types.filter(entry=>entry.count>0);
  if (counted.length){
    counted.forEach(entry=>{
      let line = `${entry.icon} ${entry.name}: ${entry.count}体 ×${entry.base} = ${Number(entry.total || 0).toLocaleString('ja-JP')}pt`;
      if (entry.bonus>0){
        line += `（ボーナス+${entry.bonus.toLocaleString('ja-JP')}）`;
      }
      lines.push(line);
    });
  }else{
    lines.push('⚔ 敵撃破: 0体 ×0 = 0pt');
  }
  return lines;
}

function populateResultOverlay(result){
  if (!resultOverlay) return;
  if (resultSummary){
    const ch = characters[currentCharKey];
    const summaryRows = [
      { label:'SCORE', value:(Number(result?.score) || 0).toLocaleString('ja-JP') },
      { label:'LEVEL', value:`${Number(result?.level) || 1}` },
      { label:'COINS', value:`🪙${(Number(result?.coins) || 0).toLocaleString('ja-JP')}` },
      { label:'CHAR', value:`${ch.emoji} ${ch.name}` },
      { label:'BEST', value:(Number.isFinite(bestScore) ? bestScore : 0).toLocaleString('ja-JP') }
    ];
    resultSummary.innerHTML = '';
    summaryRows.forEach(row=>{
      const div = document.createElement('div');
      div.className = 'resultSummaryRow';
      const strong = document.createElement('strong');
      strong.textContent = row.label;
      const span = document.createElement('span');
      span.textContent = row.value;
      div.appendChild(strong);
      div.appendChild(span);
      resultSummary.appendChild(div);
    });
  }

  if (resultItemList){
    resultItemList.innerHTML = '';
    const items = buildItemBreakdown();
    items.forEach(entry=>{
      const li = document.createElement('li');
      li.className = 'resultItem';
      const label = document.createElement('span');
      label.className = 'label';
      label.textContent = `${entry.icon} ${entry.name}`;
      const value = document.createElement('span');
      value.className = 'value';
      value.textContent = `${entry.count}個 ×${entry.base} = ${Number(entry.total || 0).toLocaleString('ja-JP')}pt`;
      if (entry.bonus>0){
        const bonus = document.createElement('small');
        bonus.textContent = `ボーナス+${entry.bonus.toLocaleString('ja-JP')}`;
        value.appendChild(bonus);
      }else if (entry.base===0 && entry.note && entry.count>0){
        const note = document.createElement('span');
        note.className = 'note';
        note.textContent = entry.note;
        value.appendChild(note);
      }
      li.appendChild(label);
      li.appendChild(value);
      resultItemList.appendChild(li);
    });
  }

  if (resultEnemyList){
    resultEnemyList.innerHTML = '';
    const enemyData = buildEnemyBreakdown();
    const entries = enemyData.types;
    if (!entries.length){
      const li = document.createElement('li');
      li.className = 'resultEmpty';
      li.textContent = '敵データなし';
      resultEnemyList.appendChild(li);
    }else{
      const allZero = entries.every(entry=>entry.count===0);
      entries.forEach(entry=>{
        const li = document.createElement('li');
        if (!entry.count) li.classList.add('muted');
        const label = document.createElement('span');
        label.className = 'label';
        label.textContent = `${entry.icon} ${entry.name}`;
        const value = document.createElement('span');
        value.className = 'value';
        value.textContent = `${entry.count}個 ×${entry.base} = ${Number(entry.total || 0).toLocaleString('ja-JP')}pt`;
        if (entry.bonus>0){
          const bonus = document.createElement('small');
          bonus.textContent = `ボーナス+${entry.bonus.toLocaleString('ja-JP')}`;
          value.appendChild(bonus);
        }
        li.appendChild(label);
        li.appendChild(value);
        resultEnemyList.appendChild(li);
      });
      if (allZero){
        const note = document.createElement('li');
        note.className = 'resultEmpty';
        note.textContent = '敵を撃破していません';
        resultEnemyList.appendChild(note);
      }
    }
  }
}

function hideResultOverlay(){
  if (resultOverlay){
    closeOverlay(resultOverlay);
  }
}

function showResultOverlay(result){
  if (!resultOverlay) return;
  populateResultOverlay(result);
  openOverlay(resultOverlay);
}

if (resultClose){
  resultClose.addEventListener('click', hideResultOverlay);
}
if (resultOverlay){
  resultOverlay.addEventListener('click', (ev)=>{
    if (ev.target === resultOverlay) hideResultOverlay();
  });
}
if (resultRetry){
  resultRetry.addEventListener('click', ()=>{
    hideResultOverlay();
    openPreGame('retry');
  });
}
if (resultMenu){
  resultMenu.addEventListener('click', ()=>{
    hideResultOverlay();
    btnStart.style.display = 'inline-block';
    btnRestart.style.display = 'none';
  });
}
if (resultLeaderboardBtn){
  resultLeaderboardBtn.addEventListener('click', ()=>{
    hideResultOverlay();
    try { LeaderboardModule?.open?.(); }
    catch (err){ console.error(err); }
  });
}
if (resultCommentBtn){
  resultCommentBtn.addEventListener('click', ()=>{
    hideResultOverlay();
    try { CommentsModule?.open?.(); }
    catch (err){ console.error(err); }
  });
}

if (preGameClose){
  preGameClose.addEventListener('click', closePreGame);
}
if (preGameOverlay){
  preGameOverlay.addEventListener('click', (ev)=>{
    if (ev.target === preGameOverlay) closePreGame();
  });
}
if (preGameStart){
  preGameStart.addEventListener('click', handlePreGameStart);
}
if (btnJump){
  btnJump.addEventListener('click', ()=>{ jump(); });
  btnJump.addEventListener('touchstart', (ev)=>{ ev.preventDefault(); jump(); }, { passive:false });
}
if (btnUlt){
  btnUlt.addEventListener('touchstart', (ev)=>{
    if (btnUlt.disabled){ return; }
    ev.preventDefault();
    tryUlt();
  }, { passive:false });
}

// ====== スポーン ======
function spawnItem(){
  const isParfait = Math.random()<0.5;
  items.push({
    x: cv.width+24,
    y: cv.height - GROUND - 44 - rand(0, 95),
    w: 30, h: 30,
    v: 3.0 + rand(.6,1.8) + (level-1)*.22,
    char: isParfait ? '🍨' : '🐟',
    score: isParfait ? 2 : 1
  });
}
const enemyTypeMeta = {
  straight:{ icon:'👾', label:'直進型' },
  zigzag:{ icon:'🐍', label:'蛇行型' },
  dash:{ icon:'💥', label:'突進型' },
  hover:{ icon:'🛸', label:'浮遊型' },
  'boss-meadow':{ icon: stageBosses.meadow.icon || '👑', label:'Boss - Meadow Monarch', base: stageBosses.meadow.rewardScore || enemyBonus },
  'boss-dunes': { icon: stageBosses.dunes.icon || '👑', label:'Boss - Dune Typhoon', base: stageBosses.dunes.rewardScore || enemyBonus },
  'boss-sky':   { icon: stageBosses.sky.icon || '👑', label:'Boss - Stratos Ranger', base: stageBosses.sky.rewardScore || enemyBonus },
  'boss-abyss': { icon: stageBosses.abyss.icon || '👑', label:'Boss - Abyss Sovereign', base: stageBosses.abyss.rewardScore || enemyBonus }
};
const enemyTypeIcons = Object.fromEntries(Object.entries(enemyTypeMeta).map(([type, meta])=>[type, meta.icon]));

function pickEnemyType(lv){
  const r = Math.random();
  if (lv < 3){
    return r < 0.75 ? 'straight' : 'zigzag';
  }
  if (lv < 6){
    if (r < 0.55) return 'straight';
    if (r < 0.8) return 'zigzag';
    return 'hover';
  }
  if (r < 0.4) return 'straight';
  if (r < 0.65) return 'zigzag';
  if (r < 0.85) return 'hover';
  return 'dash';
}

function spawnEnemy(offset=0){
  const st = stageForLevel(level);
  const baseSpeed = (2.7 + (level-1)*.35) * st.enemyMul;
  const type = pickEnemyType(level);
  const baseY = cv.height - GROUND - 36;
  const enemy = {
    x: cv.width+30 + offset,
    y: baseY,
    w: 36,
    h: 36,
    vx: baseSpeed,
    type,
    icon: enemyTypeIcons[type] || '??',
    spawnAt: now(),
    phase: Math.random()*Math.PI*2,
    baseY
  };

  if (type === 'zigzag'){
    enemy.vx = baseSpeed*0.9;
    enemy.amplitude = rand(28, 68);
    enemy.frequency = rand(0.08, 0.14);
    enemy.baseY = baseY - rand(10, 50);
  } else if (type === 'dash'){
    enemy.vx = baseSpeed*0.75;
    enemy.maxV = baseSpeed*1.9;
    enemy.accel = baseSpeed*0.045;
    enemy.charge = rand(260, 460);
    enemy.boosted = false;
  } else if (type === 'hover'){
    enemy.vx = baseSpeed*0.85;
    enemy.hoverRange = rand(28, 92);
    enemy.hoverSpeed = rand(0.02, 0.035);
    enemy.baseY = baseY - rand(40, 120);
  }

  enemies.push(enemy);
}
function spawnPower(){
  powers.push({
    x: cv.width+26,
    y: cv.height - GROUND - 44 - rand(0, 120),
    w: 26, h: 26,
    v: 3.0 + (level-1)*.25,
    char: '⭐'          // ← 追加
  });
}

function spawnBossForStage(stageKey, t){
  const config = stageBosses[stageKey];
  if (!config) return;
  bossProjectiles.length = 0;
  const baseY = Math.min(cv.height - GROUND - config.height, Math.max(24, cv.height - GROUND - config.height - config.groundOffset));
  bossState = {
    stageKey,
    config,
    x: cv.width + config.width + 40,
    y: baseY,
    baseY,
    w: config.width,
    h: config.height,
    vx: config.speed,
    targetX: Math.max(cv.width - (config.targetOffset || (config.width + 200)), cv.width * 0.34),
    state:'enter',
    hp: config.hp,
    maxHp: config.hp,
    floatPhase: Math.random()*Math.PI*2,
    nextAttack: t + config.attackInterval,
    hitFlashUntil:0,
    opacity:1,
    defeatedAt:0,
    contactCooldown:0
  };
  showStageTitle(config.displayName + ' appears!');
  speedSE();
}

function bossFireVolley(boss, time){
  const config = boss.config;
  const count = Math.max(1, config.volley || 3);
  const speed = config.projectileSpeed || 3;
  const baseX = boss.x + boss.w * 0.15;
  const launchY = boss.y + boss.h * 0.65;
  const targetX = player.x + player.w * 0.5;
  const distanceX = Math.max(32, Math.abs(baseX - targetX));
  const travelFrames = Math.max(12, distanceX / speed);
  for (let i=0; i<count; i++){
    const offset = i - (count - 1)/2;
    const laneOffset = offset * (player.h * 0.22);
    const desiredY = player.y + player.h * 0.7 + laneOffset;
    const targetY = clamp(desiredY, player.y + 12, cv.height - GROUND - 18);
    const vy = (targetY - launchY) / travelFrames;
    bossProjectiles.push({
      x: baseX,
      y: launchY,
      w: 30,
      h: 30,
      vx: speed,
      vy,
      gravity: 0,
      createdAt: time
    });
  }
}


function awardBossDefeat(config){
  const rewardScore = Number(config.rewardScore || 150);
  const rewardCoins = Number(config.rewardCoins || 10);
  score += rewardScore;
  coins += rewardCoins;
  if (runStats?.enemies){
    runStats.enemies.totalCount += 1;
    runStats.enemies.totalScore += rewardScore;
    const key = config.key || 'boss';
    if (!runStats.enemies.types[key]){
      runStats.enemies.types[key] = { count:0, total:0 };
    }
    runStats.enemies.types[key].count += 1;
    runStats.enemies.types[key].total += rewardScore;
  }
}

function damageBoss(amount){
  if (!bossState || bossState.state === 'defeated') return;
  const dmg = Number.isFinite(amount) ? amount : 1;
  bossState.hp = Math.max(0, bossState.hp - dmg);
  bossState.hitFlashUntil = now() + 140;
  if (bossState.hp <= 0){
    bossState.state = 'defeated';
    bossState.defeatedAt = now();
    bossProjectiles.length = 0;
    defeatedBossStages.add(bossState.stageKey);
    awardBossDefeat(bossState.config);
    floatText('BOSS DOWN!', bossState.x + bossState.w/2 - 54, bossState.y - 16, '#fde68a');
    cameraShake(10, 320);
  }
}

function updateBoss(t){
  if (!bossState) return;
  const config = bossState.config;
  if (bossState.state === 'enter'){
    bossState.x -= bossState.vx;
    if (bossState.x <= bossState.targetX){
      bossState.x = bossState.targetX;
      bossState.state = 'battle';
      bossState.nextAttack = t + config.attackInterval;
      bossState.floatPhase = Math.random()*Math.PI*2;
    }
  } else if (bossState.state === 'battle'){
    bossState.floatPhase += config.floatSpeed || 0.02;
    bossState.y = bossState.baseY + Math.sin(bossState.floatPhase) * (config.floatRange || 28);
    if (t >= bossState.nextAttack){
      bossFireVolley(bossState, t);
      bossState.nextAttack = t + config.attackInterval;
    }
  } else if (bossState.state === 'defeated'){
    bossState.opacity = Math.max(0, bossState.opacity - 0.025);
    bossState.y -= 1.2;
    if (bossState.opacity <= 0){
      bossState = null;
      bossProjectiles.length = 0;
    }
  }
}

function updateBossProjectiles(){
  if (!bossProjectiles.length) return;
  bossProjectiles = bossProjectiles.filter((shot)=>{
    shot.x -= shot.vx;
    shot.y += shot.vy;
    if (shot.gravity) shot.vy += shot.gravity;
    if (shot.y > cv.height + 120 || shot.x + shot.w < -80 || shot.y + shot.h < -120){
      return false;
    }
    if (AABB(player, shot)){
      if (now() < invUntil){
        return false;
      }
      const hasGuard = characters[currentCharKey].special?.includes('oneGuard');
      if (hasGuard && now() - guardReadyTime > 7000){
        guardReadyTime = now();
        return false;
      }
      if (now() > hurtUntil){
        lives = Math.max(0, lives-1);
        hurtUntil = now()+900;
        playSfx('hit');
        if (lives === 0){
          endGame();
          return false;
        }
      }
      return false;
    }
    return true;
  });
}

// ====== 入力 ======
let canDouble = false, guardReadyTime = 0;
function jump(){
  if (!gameOn) return;
  // 二段ジャンプ判定
  const hasDouble = characters[currentCharKey].special?.includes('doubleJump');
  if (player.onGround){
    player.vy = currentStats.jump; player.onGround=false;
    canDouble = hasDouble; // 地上離陸時に2段目権利付与
    playSfx('jump');
  } else if (hasDouble && canDouble){
    player.vy = currentStats.jump * 0.9; // 2段目はやや弱め
    canDouble = false;
    playSfx('jump');
  }
}
function shoot(){
  if (!gameOn) return;
  const t=now(); if (t-lastShot<shootCD) return; lastShot=t;
  const pierce = characters[currentCharKey].special?.includes('pierce');
  const v = 9+level*.6 + (now()<bulletBoostUntil? 4:0);
  bullets.push({ x:player.x+player.w, y:player.y+player.h/2-3, w:12, h:6, v: v*currentStats.bullet, hitsLeft: pierce? 2 : 1 });
}
function tryUlt(){
  if (!gameOn||!ultReady) return;
  ultReady=false; ult=0;
  const type = characters[currentCharKey].ult;
  ultProjectiles.length = 0;
  if (type==='storm') {
    ultActiveUntil = now()+1600;
  } else if (type==='ncha') {
    ultActiveUntil = now()+1500;
  } else if (type==='yadon') {
    ultActiveUntil = now()+2600;
    const baseY = player.y + player.h/2;
    const count = 6;
    for (let i=0;i<count;i++){
      const spread = i - (count-1)/2;
      ultProjectiles.push({
        x: player.x + player.w - 8,
        y: baseY + spread*20,
        w: 32,
        h: 32,
        vx: 5.4 + Math.abs(spread)*0.6,
        vy: spread*0.28,
        gravity: 0.08,
        hits: 2,
        char: '??',
        expires: now()+2800,
        dead: false,
      });
    }
  } else {
    ultActiveUntil = now()+2000; // rainbowデフォ
  }
}

// PCキー
function bindActionButton(button, handler){
  if (!button) return;
  const activate = e => {
    e.preventDefault();
    handler();
  };
  button.addEventListener('pointerdown', activate);
  button.addEventListener('click', e => e.preventDefault());
}

window.addEventListener('keydown', e=>{
  if (e.code==='Space' || e.code==='ArrowUp') jump();
  if (e.key==='z'||e.key==='x'||e.key==='Z'||e.key==='X') shoot();
  if (e.key==='c' || e.key==='C') tryUlt();
});

// タッチ（左右分割：ジャンプ/アタック or 長押しで必殺）
let pressTimer=null, pressedRight=false;
cv.addEventListener('touchstart', e=>{
  e.preventDefault();
  const rect=cv.getBoundingClientRect();
  const x=e.changedTouches[0].clientX - rect.left;
  const isLeft = x < rect.width/2;
  if (isLeft){ jump(); pressedRight=false; }
  else {
    pressedRight=true;
    pressTimer=setTimeout(()=>{ if(pressedRight) tryUlt(); }, 350);
    shoot();
  }
},{passive:false});
cv.addEventListener('touchend', ()=>{ pressedRight=false; clearTimeout(pressTimer); }, {passive:true});
bindActionButton(btnJump, jump);
bindActionButton(btnAttack, shoot);
bindActionButton(btnUlt, tryUlt);

// ====== キャラ適用 ======
let currentStats = getEffectiveStats(currentCharKey);
function getEffectiveStats(key){
  // 基本
  const ch = characters[key];
  const lb = collection.owned[key]?.limit || 0; // 小数の累積
  // 限界突破ぶんを等倍増加（例：+0.03 なら +3%）
  return {
    move:   ch.move   * (1+lb),
    jump:   BASE_JUMP * ch.jump * (1+lb*0.5), // ジャンプは控えめに反映
    bullet: ch.bullet * (1+lb),
    inv:    Math.min(INVINCIBILITY_DURATION, Math.floor(ch.inv * (1+lb*0.5))),
    ultRate:ch.ultRate* (1+lb*0.5),
    special: ch.special,
    ult: ch.ult,
  };
}
function setCurrentChar(key){
  currentCharKey = key;
  collection.current = key;
  saveCollection();
  currentStats = getEffectiveStats(key);
  updateCharInfo();
}
function updateCharInfo(){
  const ch = characters[currentCharKey];
  const own = collection.owned[currentCharKey];
  const lb = own?.limit? own.limit : 0;
  charInfo.textContent = `CHAR: ${ch.emoji} ${ch.name} [${ch.rar}]  LB:${lb}`;
}

// ====== 更新 ======
function update(t){
  if(!gameOn) return;
  const elapsed=t-t0, remain=GAME_TIME-elapsed;
  const delta = lastPlayerAnimTick===null ? 0 : t - lastPlayerAnimTick;
  lastPlayerAnimTick = t;
  updatePlayerAnimation(delta);
  if (remain<=0) return endGame();

  // レベル
  level = Math.max(1, Math.floor(score/itemLv)+1);
  const st = stageForLevel(level);

  if (st.key && st.key !== currentStageKey){
    currentStageKey = st.key;
    bossNextSpawnAt = 0;
  }
  const stageBoss = stageBosses[st.key];
  if (!bossState && stageBoss && !defeatedBossStages.has(st.key)){
    if (!bossNextSpawnAt){
      bossNextSpawnAt = t + stageBoss.spawnDelay;
    } else if (t >= bossNextSpawnAt){
      spawnBossForStage(st.key, t);
      bossNextSpawnAt = 0;
    }
  }
  if (bossState){
    updateBoss(t);
  }
  const bossBattleActive = bossState && bossState.state !== 'defeated';

  // 生成間隔
  const itemIv  = clamp(1200 - (level-1)*100, 480, 1200);
  const enemyIv = clamp(1600 - (level-1)*120, 520, 1600);
  const powerIv = 11000;

  if(t-lastItem  > itemIv)  { spawnItem();  lastItem=t; }
  if(!bossBattleActive && t-lastEnemy > enemyIv) {
    spawnEnemy();
    const extraChance = clamp(0.06 + level*0.018, 0.06, 0.45);
    if (Math.random()<extraChance){
      spawnEnemy(rand(36, 120));
    }
    lastEnemy=t;
  }
  if(t-lastPower > powerIv) { spawnPower(); lastPower=t; }

  // 物理
  player.vy += G; player.y += player.vy;
  if (player.y+player.h >= cv.height-GROUND){
    player.y=cv.height-GROUND-player.h; player.vy=0; player.onGround=true; canDouble = characters[currentCharKey].special?.includes('doubleJump');
  }

  // オート射撃（ガチャ効果など将来用）
  if (now()<autoShootUntil && t-lastShot>shootCD*0.6){ shoot(); }

  // 弾
  bullets = bullets.filter(b=> {
    b.x += b.v;
    if (bossState && bossState.state !== 'defeated' && AABB(bossState, b)){
      damageBoss(1);
      b.hitsLeft -= 1;
      if (b.hitsLeft <= 0) return false;
    }
    return (b.x < cv.width+24) && b.hitsLeft>0;
  });

  // アイテム（Mythic magnet）
  const hasMagnet = characters[currentCharKey].special?.includes('magnet');
  items = items.filter(it=>{
    if (hasMagnet){
      const dx = (player.x - it.x), dy = (player.y - it.y);
      const dist = Math.hypot(dx,dy);
      if (dist < 160){
        it.x += dx*0.18; it.y += dy*0.18;
      }
    }
    it.x -= it.v;
    if (AABB(player,it)){
      const mul = now()<scoreMulUntil ? 2 : 1;
      const gained = it.score*mul;
      score += gained; coins += 1 * mul;
      // items フィルタ内
      const itemKey = it.char === '🍨' ? 'parfait' : 'fish';  // '??' ではなく実際の絵文字で判定
      registerItemGain(itemKey, gained);
      ult = clamp(ult + (it.char === '🍨' ? 10 : 6) * currentStats.ultRate, 0, 100);
      return false;
    }
    return it.x+it.w>0;
  });

  // ?（パワーUP）
  powers = powers.filter(pw=>{
    pw.x -= pw.v;
    if (AABB(player,pw)){
      registerItemGain('star', 0);
      invUntil=now()+Math.max(powerMillis,currentStats.inv);
      ult=Math.min(100,ult+12*currentStats.ultRate);
      return false;
    }
    return pw.x+pw.w>0;
  });

  updateBossProjectiles();

  // 必殺投射体（ヤドン砲）
  ultProjectiles.forEach(p=>{
    p.x += p.vx;
    p.y += p.vy;
    p.vy += p.gravity;
  });

  // 必殺準備
  if (ult>=100) ultReady=true;

  // 敵
  const hasSlow = characters[currentCharKey].special?.includes('slowEnemy');
  enemies = enemies.filter(en=>{
    const spawnAt = en.spawnAt ?? (en.spawnAt = now());
    if (!Number.isFinite(en.vx)) en.vx = en.v ?? 0;
    if (!Number.isFinite(en.baseY)) en.baseY = en.y;
    if (!Number.isFinite(en.phase)) en.phase = 0;

    if (en.type === 'zigzag'){
      const freq = en.frequency ?? 0.1;
      en.phase += freq;
      const amp = en.amplitude ?? 36;
      en.y = en.baseY + Math.sin(en.phase) * amp;
    } else if (en.type === 'hover'){
      const speed = en.hoverSpeed ?? 0.028;
      const range = en.hoverRange ?? 52;
      en.phase += speed;
      en.y = en.baseY + Math.sin(en.phase) * range;
    } else if (en.type === 'dash'){
      const charge = en.charge ?? 320;
      if (!en.boosted && (t - spawnAt) >= charge){
        en.boosted = true;
      }
      if (en.boosted){
        const accel = en.accel ?? (en.vx*0.05);
        const maxV = en.maxV ?? (en.vx*2.1);
        en.vx = Math.min(maxV, en.vx + accel);
      }
    }

    en.y = clamp(en.y, 18, cv.height - GROUND - en.h + 6);
    en.x -= en.vx;

    // 必殺
    if (now()<ultActiveUntil){
      const type = characters[currentCharKey].ult;
      if (type==='storm'){
        const cx = player.x+player.w/2, cy = player.y+player.h/2;
        const ex = en.x+en.w/2, ey = en.y+en.h/2;
        const hit = Math.hypot(cx-ex, cy-ey) <= 120;
        if (hit){ awardEnemyDefeat(en); return false; }
      } else if (type==='ncha'){
        const beamX = player.x + player.w - 6;
        const beamTop = player.y - 36;
        const beamBottom = player.y + player.h + 36;
        const hit = (en.x+en.w) >= beamX && en.x <= cv.width && en.y <= beamBottom && (en.y+en.h) >= beamTop;
        if (hit){ awardEnemyDefeat(en); return false; }
      } else {
        const lanes = [player.y + player.h/2, player.y + player.h/2 - 36, player.y + player.h/2 + 36];
        const hit = lanes.some(y=> en.y-6 <= y && y <= en.y+en.h+6);
        if (hit){ awardEnemyDefeat(en); return false; }
      }
      if (bossBattleActive){
        if (type==='storm'){
          const cx = player.x+player.w/2, cy = player.y+player.h/2;
          const bx = bossState.x + bossState.w/2;
          const by = bossState.y + bossState.h/2;
          if (Math.hypot(cx-bx, cy-by) <= 120){ damageBoss(0.5); }
        } else if (type==='ncha'){
          const beamX = player.x + player.w - 6;
          const beamTop = player.y - 36;
          const beamBottom = player.y + player.h + 36;
          const hitBoss = (bossState.x+bossState.w) >= beamX && bossState.x <= cv.width && bossState.y <= beamBottom && (bossState.y+bossState.h) >= beamTop;
          if (hitBoss){ damageBoss(0.8); }
        } else {
          const lanes = [player.y + player.h/2, player.y + player.h/2 - 36, player.y + player.h/2 + 36];
          const hitBoss = lanes.some(y=> bossState.y-12 <= y && y <= bossState.y+bossState.h+12);
          if (hitBoss){ damageBoss(0.6); }
        }
      }
    }

    if (characters[currentCharKey].ult==='yadon'){
      for (let i=0;i<ultProjectiles.length;i++){
        const shot = ultProjectiles[i];
        if (!shot || shot.dead) continue;
        if (AABB(en, shot)){
          awardEnemyDefeat(en);
          shot.hits--;
          if (shot.hits<=0) shot.dead=true;
          return false;
        }
      }
      if (bossBattleActive && bossState){
        for (let i=0;i<ultProjectiles.length;i++){
          const proj = ultProjectiles[i];
          if (!proj || proj.dead) continue;
          if (AABB(bossState, proj)){
            damageBoss(1.4);
            proj.hits--;
            if (proj.hits<=0) proj.dead = true;
          }
        }
      }
    }

    for (let i=0;i<bullets.length;i++){
      if (AABB(en,bullets[i])){
        awardEnemyDefeat(en);
        bullets[i].hitsLeft--;
        if (hasSlow){
          en.vx = Math.max(en.vx*0.6, 1.6);
        }
        if (bullets[i].hitsLeft<=0) bullets.splice(i,1);
        return false;
      }
    }

    if (AABB(player,en)){
      if (now()<invUntil){ awardEnemyDefeat(en); return false; }
      const hasGuard = characters[currentCharKey].special?.includes('oneGuard');
      if (hasGuard && now() - guardReadyTime > 7000){
        guardReadyTime = now();
        return false;
      }
      if (now()>hurtUntil){
        lives=Math.max(0,lives-1); hurtUntil=now()+900;
        playSfx('hit');
        if (lives===0){ endGame(); return false; }
      }
    }
    return en.x+en.w>0 && en.y < cv.height;
  });

  if (bossState && bossState.state !== 'defeated'){
    const touchAt = now();
    if (touchAt > (bossState.contactCooldown || 0) && AABB(player, bossState)){
      if (touchAt < invUntil){
        damageBoss(2);
        bossState.contactCooldown = touchAt + 400;
      } else {
        const hasGuard = characters[currentCharKey].special?.includes('oneGuard');
        if (hasGuard && touchAt - guardReadyTime > 7000){
          guardReadyTime = touchAt;
          damageBoss(1);
          bossState.contactCooldown = touchAt + 800;
        } else if (touchAt > hurtUntil){
          lives = Math.max(0, lives-1);
          hurtUntil = touchAt + 900;
          playSfx('hit');
          bossState.contactCooldown = touchAt + 900;
          if (lives === 0){
            endGame();
            return;
          }
        }
      }
    }
  }

  ultProjectiles = ultProjectiles.filter(p=> !p.dead && now()<p.expires && p.x<cv.width+60 && p.y>-80 && p.y<cv.height+80 && p.hits>0);

  draw(remain, st);
  requestAnimationFrame(update);
}

// ====== 描画 ======
function draw(remain, st){
  const g=c.createLinearGradient(0,0,0,cv.height);
  g.addColorStop(0, st.bg1); g.addColorStop(1, st.bg2);
  c.fillStyle=g; c.fillRect(0,0,cv.width,cv.height);
  c.fillStyle=st.ground; c.fillRect(0, cv.height-GROUND, cv.width, GROUND);

  if (now()<invUntil){ c.strokeStyle='#f5c542'; c.lineWidth=4; c.strokeRect(player.x-2,player.y-2,player.w+4,player.h+4); }
  const blink = now()<hurtUntil && Math.floor(now()/60)%2===0;
  if (!blink){
    if (playerSprite.loaded && playerSprite.frameWidth && playerSprite.frameHeight){
      const smoothingBackup = c.imageSmoothingEnabled;
      c.imageSmoothingEnabled = true;
      const frame = playerAnimation.currentFrame;
      const frameCol = frame % PLAYER_SPRITE_COLUMNS;
      const frameRow = Math.floor(frame / PLAYER_SPRITE_COLUMNS);
      const sx = frameCol * playerSprite.frameWidth;
      const sy = frameRow * playerSprite.frameHeight;
      c.drawImage(
        playerSprite.image,
        sx,
        sy,
        playerSprite.frameWidth,
        playerSprite.frameHeight,
        player.x,
        player.y,
        player.w,
        player.h
      );
      c.imageSmoothingEnabled = smoothingBackup;
    } else {
      c.fillStyle=player.color; c.fillRect(player.x,player.y,player.w,player.h);
    }
  }

  // 必殺描画
  if (now()<ultActiveUntil){
    const type = characters[currentCharKey].ult;
    if (type==='storm'){
      const cx = player.x+player.w/2, cy = player.y+player.h/2;
      c.fillStyle='rgba(80,160,255,.25)'; c.beginPath(); c.arc(cx,cy,120,0,Math.PI*2); c.fill();
      c.strokeStyle='rgba(200,230,255,.7)'; c.lineWidth=3; c.beginPath(); c.arc(cx,cy,88,0,Math.PI*2); c.stroke();
    } else if (type==='ncha'){
      const beamX = player.x + player.w - 6;
      const beamTop = player.y - 36;
      const beamH = player.h + 72;
      const intensity = 0.45 + 0.25 * ((Math.sin(now()/90)+1)/2);
      c.fillStyle=`rgba(255,235,59,${intensity})`; c.fillRect(beamX, beamTop, cv.width-beamX, beamH);
      c.fillStyle='rgba(255,255,255,0.8)'; c.fillRect(beamX, beamTop + beamH/2 - 6, cv.width-beamX, 12);
    } else if (type==='yadon'){
      const auraPulse = 40 + Math.sin(now()/140)*6;
      c.strokeStyle='rgba(255,192,203,0.7)';
      c.lineWidth=6;
      c.beginPath(); c.arc(player.x+player.w/2, player.y+player.h/2, auraPulse, 0, Math.PI*2); c.stroke();
    } else {
      const laneYs = [player.y + player.h/2, player.y + player.h/2 - 36, player.y + player.h/2 + 36];
      laneYs.forEach((y,idx)=>{
        c.fillStyle=`rgba(${180+idx*25},${80+idx*50},255,.65)`; c.fillRect(player.x, y-6, cv.width-player.x, 12);
        c.fillStyle='rgba(255,255,255,.55)'; c.fillRect(player.x, y-2, cv.width-player.x, 4);
      });
    }
  }

  // 弾
  if (bullets.length){
    c.save();
    c.lineJoin = 'round';
    c.lineCap = 'round';
    bullets.forEach(b=>{
      const grad = c.createLinearGradient(b.x, b.y, b.x + b.w, b.y + b.h);
      grad.addColorStop(0, '#fef3c7');
      grad.addColorStop(1, '#f97316');
      c.fillStyle = grad;
      c.fillRect(b.x, b.y, b.w, b.h);
      c.strokeStyle = 'rgba(124,45,18,0.75)';
      c.lineWidth = 1.2;
      c.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
    });
    c.restore();
  }

  // アイテム
  c.font='28px serif'; c.textBaseline='top';
  items.forEach(it=> c.fillText(it.char,it.x,it.y));

  // ヤドン砲の群れ
  if (ultProjectiles.length){
    c.font='32px serif';
    ultProjectiles.forEach(p=>{
      const fade = Math.max(0.35, Math.min(1, (p.expires - now())/400));
      c.save();
      c.globalAlpha = fade;
      c.fillText(p.char, p.x, p.y);
      c.restore();
    });
  }

  // スターピース(パワー)
  powers.forEach(pw=>{ c.font='28px serif'; c.fillText(pw.char || '⭐', pw.x, pw.y); });

  if (bossState){
    const bodyColor = bossState.config.bodyColor || '#1e3a8a';
    const displayIcon = bossState.config.icon || '??';
    c.save();
    c.globalAlpha = (typeof bossState.opacity === 'number') ? bossState.opacity : 1;
    c.fillStyle = bodyColor;
    c.fillRect(bossState.x, bossState.y, bossState.w, bossState.h);
    c.fillStyle = '#fff';
    c.font = '48px serif';
    c.textAlign = 'center';
    c.fillText(displayIcon, bossState.x + bossState.w/2, bossState.y + bossState.h/2 + 18);
    c.restore();

    const barWidth = 260;
    const barHeight = 12;
    const hpRatio = bossState.maxHp ? Math.max(0, bossState.hp / bossState.maxHp) : 0;
    const barX = cv.width/2 - barWidth/2;
    const barY = 64;
    c.save();
    c.fillStyle = 'rgba(0,0,0,0.45)';
    c.fillRect(barX, barY, barWidth, barHeight);
    c.fillStyle = '#f87171';
    c.fillRect(barX, barY, barWidth * hpRatio, barHeight);
    c.strokeStyle = '#fde68a';
    c.lineWidth = 2;
    c.strokeRect(barX, barY, barWidth, barHeight);
    c.fillStyle = '#fff';
    c.font = '12px sans-serif';
    c.textAlign = 'center';
    c.fillText(`${bossState.config.displayName} HP ${Math.max(0, Math.ceil(bossState.hp))}/${bossState.maxHp}`, barX + barWidth/2, barY - 6);
    c.restore();
    c.textAlign = 'start';
  }

  if (bossProjectiles.length){
    c.save();
    c.fillStyle = 'rgba(248,113,113,0.85)';
    bossProjectiles.forEach(shot=>{
      c.beginPath();
      c.ellipse(shot.x + shot.w/2, shot.y + shot.h/2, shot.w/2, shot.h/2, 0, 0, Math.PI*2);
      c.fill();
    });
    c.restore();
  }

  // 敵
  enemies.forEach(en=>{ c.font='32px serif'; c.fillText(en.icon || '??', en.x, en.y-4); });

  setHUD(remain);
}

function endGame(){
  if(!gameOn) return; gameOn=false;
  stopBgm();
  bossState = null;
  bossProjectiles.length = 0;
  bossNextSpawnAt = 0;
  const st = stageForLevel(level);
  draw(0, st);
  c.fillStyle='rgba(0,0,0,.55)'; c.fillRect(0,0,cv.width,cv.height);
  c.fillStyle='#fff'; c.textAlign='center';
  c.font='36px sans-serif'; c.fillText('ゲーム終了！', cv.width/2, cv.height/2 - 24);
  c.font='24px sans-serif'; c.fillText(`最終スコア: ${score}　レベル: ${level}　コイン: 🪙${coins}`, cv.width/2, cv.height/2 + 10);
  c.font='18px sans-serif';
  const breakdown = buildScoreBreakdownLines();
  breakdown.forEach((line, idx)=>{
    c.fillText(line, cv.width/2, cv.height/2 + 46 + idx*24);
  });
  const finalResult = { score, level, coins, char: currentCharKey };
  const didUpdateBest = updateBestScore(finalResult.score);
  finalResult.didUpdateBest = didUpdateBest;
  setHUD(0);
  showResultOverlay(finalResult);
  setStartScreenVisible(true);
  c.textAlign='start'; btnRestart.style.display='inline-block';
  setTimeout(()=>{
    try {
      LeaderboardModule?.handleAfterGame?.(finalResult);
    } catch (err){
      console.error(err);
    }
  }, 200);
}

// ====== ボタン ======
btnStart.addEventListener('click', ()=> requestStart('start'));
btnRestart.addEventListener('click', ()=> requestStart('retry'));

// ====== スポーンと攻撃トリガ ======
function shootIfAuto(t){ /* 予備フック */ }

// ====== ガチャボタン ======
if (btnGacha)   btnGacha.onclick   = ()=> doGacha(1);
if (btnGacha10) btnGacha10.onclick = ()=> doGacha(10);

// ====== ストレージ ======
function loadCollection(){
  try{
    const s = localStorage.getItem(STORE_KEY);
    if (s) return JSON.parse(s);
  }catch{}
  return { current:'parfen', owned: { parfen:{owned:true,dup:0,limit:0} } };
}
function saveCollection(){ try{ localStorage.setItem(STORE_KEY, JSON.stringify(collection)); }catch{} }
function loadPity(){
  try{ const s = localStorage.getItem(pityKey); if(s) return JSON.parse(s); }catch{}
  return { sinceL:0, sinceM:0 };
}
function savePity(){ try{ localStorage.setItem(pityKey, JSON.stringify(pity)); }catch{} }

function loadBestScore(){
  try{
    const raw = localStorage.getItem(BEST_SCORE_KEY);
    if (raw !== null){
      const value = Number(raw);
      if (Number.isFinite(value)) return Math.max(0, Math.floor(value));
    }
  }catch{}
  return 0;
}

function saveBestScore(){
  try{ localStorage.setItem(BEST_SCORE_KEY, `${bestScore}`); }catch{}
}

function updateBestScore(latestScore){
  const normalized = Math.max(0, Math.floor(Number(latestScore) || 0));
  if (normalized > bestScore){
    bestScore = normalized;
    saveBestScore();
    refreshHUD();
    return true;
  }
  return false;
}

// ====== 初期HUD ======
LeaderboardModule?.init?.();
CommentsModule?.init?.();
HowtoModule?.init?.({
  onStartGame: () => requestStart('start'),
  isGameRunning: () => gameOn
});

setHUD(GAME_TIME);
updateCharInfo();
setStartScreenVisible(true);
LeaderboardModule?.load?.(false);

})();
