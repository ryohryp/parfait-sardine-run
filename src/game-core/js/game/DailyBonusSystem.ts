import { GachaSystem } from './GachaSystem';

export interface DailyBonusState {
    lastClaimDate: string | null; // ISO date string (YYYY-MM-DD)
    consecutiveDays: number;
}

export class DailyBonusSystem {
    private readonly STORAGE_KEY = 'psrun_daily_bonus_v1';
    private state: DailyBonusState;

    // Rewards for 7 days cycle
    private readonly REWARDS = [50, 100, 150, 200, 300, 400, 1000];

    constructor() {
        this.state = this.load();
    }

    private load(): DailyBonusState {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY);
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (e) {
            console.error('Failed to load daily bonus data', e);
        }
        return {
            lastClaimDate: null,
            consecutiveDays: 0
        };
    }

    private save() {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.state));
        } catch (e) {
            console.error('Failed to save daily bonus data', e);
        }
    }

    public checkAvailability(): { available: boolean; day: number; reward: number } {
        const today = new Date().toISOString().split('T')[0];

        if (this.state.lastClaimDate === today) {
            return { available: false, day: this.state.consecutiveDays, reward: 0 };
        }

        let nextDay = this.state.consecutiveDays + 1;

        // Check if streak is broken (more than 1 day gap)
        if (this.state.lastClaimDate) {
            const last = new Date(this.state.lastClaimDate);
            const current = new Date(today);
            const diffTime = Math.abs(current.getTime() - last.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays > 1) {
                nextDay = 1; // Reset streak
            }
        }

        // Cycle through 7 days
        const rewardIndex = (nextDay - 1) % 7;

        return {
            available: true,
            day: nextDay,
            reward: this.REWARDS[rewardIndex]
        };
    }

    public claim(gachaSystem: GachaSystem): { day: number; reward: number } {
        const availability = this.checkAvailability();

        if (!availability.available) {
            throw new Error('Daily bonus already claimed for today');
        }

        const today = new Date().toISOString().split('T')[0];

        this.state = {
            lastClaimDate: today,
            consecutiveDays: availability.day
        };

        this.save();

        // Add coins
        gachaSystem.addCoins(availability.reward);

        return {
            day: availability.day,
            reward: availability.reward
        };
    }

    public getStreak(): number {
        return this.state.consecutiveDays;
    }
}
