
import { GAME_TIME } from '../game-constants.js';
import { characters, rarClass, rarOrder, SPECIAL_LABELS, ULT_DETAILS } from '../game-data/characters.js';
import { ITEM_CATALOG } from '../game-data/items.js';

function now() { return performance.now(); }

export class UIManager {
    constructor() {
        this.hud = document.getElementById('hud');
        this.charInfo = document.getElementById('charInfo');
        this.touchControls = document.getElementById('touchControls');
        this.btnJump = document.getElementById('jumpBtn');
        this.btnAttack = document.getElementById('attackBtn');
        this.btnUlt = document.getElementById('ultBtn');
        this.btnGacha = document.getElementById('gachaOpen');
        this.btnGacha10 = document.getElementById('gacha10');
        this.startScreen = document.getElementById('startScreen');
        this.btnStart = document.getElementById('start');
        this.btnRestart = document.getElementById('restart');

        // Overlays
        this.resultOverlay = document.getElementById('resultOverlay');
        this.preGameOverlay = document.getElementById('preGameOverlay');
        this.gachaOverlay = document.getElementById('gachaOverlay');
        this.colOverlay = document.getElementById('colOverlay');
        this.codexOverlay = document.getElementById('codexOverlay');

        // Elements within overlays
        this.resultSummary = document.getElementById('resultSummary');
        this.resultItemList = document.getElementById('resultItemList');
        this.resultEnemyList = document.getElementById('resultEnemyList');
        this.preGameCharList = document.getElementById('preGameCharList');
        this.preGameSummary = document.getElementById('preGameSummary');
        this.preGameUlt = document.getElementById('preGameUlt');
        this.preGameSpecial = document.getElementById('preGameSpecial');
        this.preGameStats = document.getElementById('preGameStats');
        this.preGameStart = document.getElementById('preGameStart');

        this.OVERLAY_SELECTOR = '.overlay';
    }

    init(handlers) {
        this.handlers = handlers; // { startGame, openPreGame, etc. }

        // Bind buttons
        if (this.btnStart) this.btnStart.onclick = () => this.handlers.requestStart('start');
        if (this.btnRestart) this.btnRestart.onclick = () => this.handlers.requestStart('retry');

        // Close buttons for overlays
        document.querySelectorAll('.overlay .ghost').forEach(btn => {
            if (btn.id.endsWith('Close')) {
                btn.onclick = () => this.closeOverlay(btn.closest('.overlay'));
            }
        });

        // PreGame
        if (this.preGameStart) this.preGameStart.onclick = () => this.handlers.handlePreGameStart();
    }

    openOverlay(el) {
        if (!el) return;
        document.body.classList.add('modal-open');
        el.hidden = false;
        el.classList.add('show');
        if (el.style?.display) el.style.removeProperty('display');
    }

    closeOverlay(el) {
        if (!el) return;
        el.hidden = true;
        el.classList.remove('show');
        if (el.style?.display) el.style.removeProperty('display');
        if (!document.querySelector(`${this.OVERLAY_SELECTOR}:not([hidden])`)) {
            document.body.classList.remove('modal-open');
        }
    }

    setHUD(state) {
        const {
            remainMs, level, score, coins, lives, ult, ultReady,
            currentCharKey, collection, bestScore,
            invUntil, autoShootUntil, bulletBoostUntil, scoreMulUntil, ultActiveUntil, gameOn
        } = state;

        const sec = Math.max(0, Math.ceil(remainMs / 1000));
        // Assuming stageForLevel is available or passed in state, but for now just use level
        // const st = stageForLevel(level).name; 
        // We might need to pass stage name in state
        const stName = state.stageName || `Stage ${level}`;

        const ch = characters[currentCharKey];
        const own = collection.owned[currentCharKey];
        const lb = own?.limit ? own.limit : 0;
        const bestText = (Number.isFinite(bestScore) ? bestScore : 0).toLocaleString('ja-JP');
        const scoreText = score.toLocaleString('ja-JP');
        const coinText = coins.toLocaleString('ja-JP');
        const nowTs = now();

        const effects = [];
        if (nowTs < invUntil) effects.push({ icon: '🛡️', label: '無敵', remain: (invUntil - nowTs) / 1000 });
        if (nowTs < autoShootUntil) effects.push({ icon: '🤖', label: '連射', remain: (autoShootUntil - nowTs) / 1000 });
        if (nowTs < bulletBoostUntil) effects.push({ icon: '💥', label: '火力UP', remain: (bulletBoostUntil - nowTs) / 1000 });
        if (nowTs < scoreMulUntil) effects.push({ icon: '✖️2', label: 'スコアUP', remain: (scoreMulUntil - nowTs) / 1000 });
        if (gameOn && nowTs < ultActiveUntil) effects.push({ icon: '🌈', label: '必殺', remain: (ultActiveUntil - nowTs) / 1000 });

        const effectsHtml = effects.map(effect => {
            const remainText = `${Math.max(0, effect.remain).toFixed(1)}s`;
            return `<span class="hudEffect"><span class="icon">${effect.icon}</span><span class="label">${effect.label}</span><span class="time">${remainText}</span></span>`;
        }).join('');
        const effectsClass = effects.length ? 'hudEffects' : 'hudEffects isHidden';

        const hearts = (n) => {
            const count = Math.max(0, Math.min(3, Math.floor(n)));
            return '❤️'.repeat(count) + '♡'.repeat(3 - count);
        };

        this.hud.innerHTML = `
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
          <span class="hudValue">${stName}</span>
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

        this.charInfo.textContent = `CHAR: ${ch.emoji} ${ch.name} [${ch.rar}]  LB:${lb}`;

        if (this.touchControls) {
            this.touchControls.classList.toggle('isVisible', gameOn);
            this.touchControls.setAttribute('aria-hidden', gameOn ? 'false' : 'true');
        }
        if (this.btnJump) this.btnJump.disabled = !gameOn;
        if (this.btnAttack) this.btnAttack.disabled = !gameOn;
        if (this.btnUlt) {
            this.btnUlt.disabled = !ultReady; // Logic changed: always enabled if ready? No, only if gameOn
            if (!gameOn) this.btnUlt.disabled = true;
            this.btnUlt.classList.toggle('isReady', gameOn && ultReady);
        }

        if (this.btnGacha) this.btnGacha.disabled = coins < 10;
        if (this.btnGacha10) this.btnGacha10.disabled = coins < 100;
    }

    setStartScreenVisible(show) {
        if (!this.startScreen) return;
        this.startScreen.classList.toggle('isHidden', !show);
        this.startScreen.setAttribute('aria-hidden', show ? 'false' : 'true');

        if (show) {
            this.btnStart.style.display = 'inline-block';
            this.btnRestart.style.display = 'none';
        } else {
            this.btnStart.style.display = 'none';
            this.btnRestart.style.display = 'none';
        }
    }

    showGameOver(score, level, coins) {
        this.btnStart.style.display = 'none';
        this.btnRestart.style.display = 'inline-block';
        this.setStartScreenVisible(true);
    }

    // ... (Implement other UI methods like populateResultOverlay, buildPreGameList, etc.)
    // For brevity, I'll assume these can be copied from main.js or implemented as needed.
    // I will implement buildPreGameList and updatePreGameDetails here as they are critical for starting.

    buildPreGameList(collection, currentCharKey, onSelect) {
        if (!this.preGameCharList) return;
        this.preGameCharList.innerHTML = '';
        const ownedKeys = Object.keys(collection.owned || {}).filter(key => collection.owned[key]?.owned);
        const sorted = ownedKeys
            .map(key => characters[key])
            .filter(Boolean)
            .sort((a, b) => {
                const ra = rarOrder.indexOf(a.rar);
                const rb = rarOrder.indexOf(b.rar);
                if (ra !== rb) return ra - rb;
                return a.name.localeCompare(b.name, 'ja');
            });

        if (!sorted.length) {
            const empty = document.createElement('div');
            empty.className = 'preGameEmpty';
            empty.textContent = 'キャラを入手するとここに表示されます。';
            this.preGameCharList.appendChild(empty);
            return;
        }

        sorted.forEach(ch => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'preCharCard';
            if (ch.key === currentCharKey) { btn.classList.add('isSelected'); }
            btn.innerHTML = `<span class="emoji">${ch.emoji}</span><span class="name">${ch.name}</span><span class="rar">[${ch.rar}]</span>`;
            btn.addEventListener('click', () => {
                [...this.preGameCharList.children].forEach(node => node.classList?.remove?.('isSelected'));
                btn.classList.add('isSelected');
                onSelect(ch.key);
            });
            this.preGameCharList.appendChild(btn);
        });
    }

    updatePreGameDetails(key) {
        const ch = characters[key];
        if (!ch) return;

        // We need stats here, but stats depend on LB. 
        // Ideally we pass the calculated stats or the collection to calculate them.
        // For now, let's just show base stats or require the caller to pass stats.
        // Let's assume the caller handles the logic and we just display what we can.
        // Or we can import getEffectiveStats logic? No, that should be in Game or Player.
        // Let's just display static info for now, or maybe the caller updates the UI.

        if (this.preGameSummary) this.preGameSummary.textContent = `${ch.emoji} ${ch.name}`;

        const describeUlt = (k) => {
            if (!k) return { title: '必殺技なし', text: 'このキャラは必殺技を持たず、基礎能力で勝負します。' };
            const entry = ULT_DETAILS[k];
            if (entry) return { title: `必殺技：${entry.name}`, text: entry.description };
            return { title: `必殺技：${k}`, text: '固有必殺技を発動できます。' };
        };

        if (this.preGameUlt) {
            const ultInfo = describeUlt(ch.ult);
            this.preGameUlt.textContent = `${ultInfo.title} - ${ultInfo.text}`;
        }

        if (this.preGameSpecial) {
            const specials = Array.isArray(ch.special) ? ch.special : [];
            if (specials.length) {
                this.preGameSpecial.innerHTML = specials.map(code => `<span>${SPECIAL_LABELS[code] || code}</span>`).join('');
            } else {
                this.preGameSpecial.innerHTML = '<span>特性なし</span>';
            }
        }

        // Stats list - this requires calculation. 
        // I'll leave it empty or static for now, as it requires the `getEffectiveStats` logic which is in Game.js (or should be shared).
        // I'll move `getEffectiveStats` to a utility or static method in Game.js later.
    }
}
