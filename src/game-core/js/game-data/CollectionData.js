
export const COLLECTION_ITEMS = {
    parfait: {
        id: 'parfait',
        name: 'パフェ',
        icon: '🍨',
        desc: '甘くて美味しいパフェ。スコアがアップする。'
    },
    sardine: {
        id: 'sardine',
        name: 'イワシ',
        icon: '🐟',
        desc: '新鮮なイワシ。スコアが少しアップする。'
    },
    star: {
        id: 'star',
        name: 'スター',
        icon: '⭐',
        desc: '無敵になれるスター。一定時間ダメージを受けない。'
    }
};

export const COLLECTION_ENEMIES = {
    straight: {
        id: 'straight',
        name: '直進型',
        icon: '👾',
        image: 'assets/sprite/enemy_cupcake.png',
        desc: 'まっすぐに進んでくる敵。'
    },
    zigzag: {
        id: 'zigzag',
        name: '蛇行型',
        icon: '🐍',
        image: 'assets/sprite/enemy_cupcake.png',
        desc: 'ゆらゆらと蛇行しながら近づいてくる。'
    },
    dash: {
        id: 'dash',
        name: '突進型',
        icon: '💥',
        image: 'assets/sprite/enemy_cupcake.png',
        desc: '力を溜めてから急加速してくる。'
    },
    hover: {
        id: 'hover',
        name: '浮遊型',
        icon: '🛸',
        image: 'assets/sprite/enemy_cupcake.png',
        desc: '空中に留まりながら上下に動く。'
    },
    chaser: {
        id: 'chaser',
        name: '追跡型',
        icon: '🎯',
        image: 'assets/sprite/enemy_chaser.png',
        desc: 'プレイヤーを執拗に追いかけてくる。'
    },
    bomber: {
        id: 'bomber',
        name: '爆弾型',
        icon: '💣',
        image: 'assets/sprite/enemy_bomber.png',
        desc: '近づくと爆発する危険な敵。'
    },
    splitter: {
        id: 'splitter',
        name: '分裂型',
        icon: '🔷',
        image: 'assets/sprite/enemy_splitter.png',
        desc: '倒すと分裂して増える厄介な敵。'
    },
    obstacle: {
        id: 'obstacle',
        name: '障害物',
        icon: '🧱',
        desc: '動かないが、接触するとダメージを受ける。'
    },
    shield: {
        id: 'shield',
        name: 'シールド型',
        icon: '🛡️',
        image: 'assets/sprite/enemy_shield.png',
        desc: '耐久力が高く、何度か攻撃しないと倒せない。'
    }
};

export const COLLECTION_BOSSES = {
    'boss-meadow': {
        id: 'boss-meadow',
        name: 'Meadow Monarch',
        icon: '🦌',
        image: 'assets/sprite/boss_meadow.png',
        desc: '草原の支配者。優雅だが強力な攻撃を繰り出す。'
    },
    'boss-dunes': {
        id: 'boss-dunes',
        name: 'Dune Typhoon',
        icon: '🦂',
        image: 'assets/sprite/boss_dunes_v2.png',
        desc: '砂漠の暴君。素早い動きで獲物を追い詰める。'
    },
    'boss-sky': {
        id: 'boss-sky',
        name: 'Stratos Ranger',
        icon: '🦅',
        image: 'assets/sprite/boss_sky_v2.png',
        desc: '天空の狩人。上空からの急降下攻撃が得意。'
    },
    'boss-volcano': {
        id: 'boss-volcano',
        name: 'Inferno Dragon',
        icon: '🐉',
        image: 'assets/sprite/boss_volcano.png',
        desc: '火山の主。灼熱の炎で全てを焼き尽くす。'
    },
    'boss-ocean': {
        id: 'boss-ocean',
        name: 'Leviathan',
        icon: '🐋',
        image: 'assets/sprite/boss_ocean.png',
        desc: '深海の巨獣。圧倒的な質量で押し潰してくる。'
    },
    'boss-abyss': {
        id: 'boss-abyss',
        name: 'Abyss Sovereign',
        icon: '🐙',
        image: 'assets/sprite/boss_abyss_v2.png',
        desc: '深淵の王。未知の力で空間を歪める。'
    }
};
