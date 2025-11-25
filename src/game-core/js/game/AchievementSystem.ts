import { GachaSystem } from './GachaSystem';

export interface Achievement {
    id: string;
    icon: string;
    titleKey: string;
    descKey: string;
    reward: number;
    condition: (stats: UserStats, gacha: GachaSystem) => boolean;
}

export interface UserStats {
    totalRuns: number;
    totalCoins: number;
    maxScore: number;
    totalGachaPulls: number;
    enemiesDefeated: number;
    bossesDefeated: number;
}

export class AchievementSystem {
    private unlockedIds: Set<string>;
    private stats: UserStats;
    private readonly STORAGE_KEY_UNLOCKS = 'psrun_achievements_v1';
    private readonly STORAGE_KEY_STATS = 'psrun_user_stats_v1';

    public readonly achievements: Achievement[] = [
        {
            id: 'first_run',
            icon: '🏃',
            titleKey: 'ach_first_run_title',
            descKey: 'ach_first_run_desc',
            reward: 100,
            condition: (stats) => stats.totalRuns >= 1
        },
        {
            id: 'score_1000',
            icon: '🥉',
            titleKey: 'ach_score_1000_title',
            descKey: 'ach_score_1000_desc',
            reward: 200,
            condition: (stats) => stats.maxScore >= 1000
        },
        {
            id: 'score_5000',
            icon: '🥈',
            titleKey: 'ach_score_5000_title',
            descKey: 'ach_score_5000_desc',
            reward: 500,
            condition: (stats) => stats.maxScore >= 5000
        },
        {
            id: 'score_10000',
            icon: '🥇',
            titleKey: 'ach_score_10000_title',
            descKey: 'ach_score_10000_desc',
            reward: 1000,
            condition: (stats) => stats.maxScore >= 10000
        },
        {
            id: 'gacha_10',
            icon: '🎰',
            titleKey: 'ach_gacha_10_title',
            descKey: 'ach_gacha_10_desc',
            reward: 300,
            condition: (stats) => stats.totalGachaPulls >= 10
        },
        {
            id: 'collector_5',
            icon: '👥',
            titleKey: 'ach_collector_5_title',
            descKey: 'ach_collector_5_desc',
            reward: 500,
            condition: (_, gacha) => Object.keys(gacha.collection.owned).length >= 5
        },
        {
            id: 'boss_killer',
            icon: '⚔️',
            titleKey: 'ach_boss_killer_title',
            descKey: 'ach_boss_killer_desc',
            reward: 500,
            condition: (stats) => stats.bossesDefeated >= 1
        },
        {
            id: 'enemy_hunter',
            icon: '🏹',
            titleKey: 'ach_enemy_hunter_title',
            descKey: 'ach_enemy_hunter_desc',
            reward: 300,
            condition: (stats) => stats.enemiesDefeated >= 100
        },
        {
            id: 'rich',
            icon: '💰',
            titleKey: 'ach_rich_title',
            descKey: 'ach_rich_desc',
            reward: 1000,
            condition: (stats) => stats.totalCoins >= 10000
        },
        {
            id: 'veteran',
            icon: '🎖️',
            titleKey: 'ach_veteran_title',
            descKey: 'ach_veteran_desc',
            reward: 500,
            condition: (stats) => stats.totalRuns >= 50
        },
        {
            id: 'collector_10',
            icon: '👑',
            titleKey: 'ach_collector_10_title',
            descKey: 'ach_collector_10_desc',
            reward: 2000,
            condition: (_, gacha) => Object.keys(gacha.collection.owned).length >= 10
        }
    ];

    constructor() {
        this.unlockedIds = new Set<string>();
        this.stats = {
            totalRuns: 0,
            totalCoins: 0,
            maxScore: 0,
            totalGachaPulls: 0,
            enemiesDefeated: 0,
            bossesDefeated: 0
        };
        this.load();
    }

    private load() {
        try {
            const savedUnlocks = localStorage.getItem(this.STORAGE_KEY_UNLOCKS);
            if (savedUnlocks) {
                this.unlockedIds = new Set(JSON.parse(savedUnlocks));
            }

            const savedStats = localStorage.getItem(this.STORAGE_KEY_STATS);
            if (savedStats) {
                this.stats = { ...this.stats, ...JSON.parse(savedStats) };
            }
        } catch (e) {
            console.error('Failed to load achievement data', e);
        }
    }

    private save() {
        try {
            localStorage.setItem(this.STORAGE_KEY_UNLOCKS, JSON.stringify(Array.from(this.unlockedIds)));
            localStorage.setItem(this.STORAGE_KEY_STATS, JSON.stringify(this.stats));
        } catch (e) {
            console.error('Failed to save achievement data', e);
        }
    }

    public updateStats(newStats: Partial<UserStats>) {
        this.stats = {
            ...this.stats,
            ...newStats,
            // Max score should only update if higher
            maxScore: Math.max(this.stats.maxScore, newStats.maxScore || 0),
            // Others are cumulative (need to be handled by caller properly or logic here)
            // For simplicity, let's assume the caller passes INCREMENTS for cumulative stats, except maxScore
        };

        // Actually, let's make updateStats handle increments for safety
        if (newStats.totalRuns) this.stats.totalRuns += newStats.totalRuns;
        if (newStats.totalCoins) this.stats.totalCoins += newStats.totalCoins;
        if (newStats.totalGachaPulls) this.stats.totalGachaPulls += newStats.totalGachaPulls;
        if (newStats.enemiesDefeated) this.stats.enemiesDefeated += newStats.enemiesDefeated;
        if (newStats.bossesDefeated) this.stats.bossesDefeated += newStats.bossesDefeated;

        this.save();
    }

    public checkUnlocks(gachaSystem: GachaSystem): Achievement[] {
        const newUnlocks: Achievement[] = [];

        for (const ach of this.achievements) {
            if (!this.unlockedIds.has(ach.id)) {
                if (ach.condition(this.stats, gachaSystem)) {
                    this.unlockedIds.add(ach.id);
                    newUnlocks.push(ach);

                    // Auto-claim reward
                    gachaSystem.addCoins(ach.reward);
                }
            }
        }

        if (newUnlocks.length > 0) {
            this.save();
        }

        return newUnlocks;
    }

    public isUnlocked(id: string): boolean {
        return this.unlockedIds.has(id);
    }

    public getProgress() {
        return {
            unlockedCount: this.unlockedIds.size,
            totalCount: this.achievements.length,
            stats: { ...this.stats }
        };
    }
}
