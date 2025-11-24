
export class MissionManager {
    constructor() {
        this.missions = [];
        this.lastGeneratedDate = null;
        this.load();
    }

    load() {
        try {
            const saved = localStorage.getItem('psrun_missions_v1');
            if (saved) {
                const data = JSON.parse(saved);
                this.missions = data.missions || [];
                this.lastGeneratedDate = data.lastGeneratedDate;
            }
        } catch (e) {
            console.error('Failed to load missions', e);
        }

        // Check if we need to generate new missions (daily)
        const today = new Date().toDateString();
        if (this.lastGeneratedDate !== today) {
            this.generateMissions();
        }
    }

    save() {
        try {
            localStorage.setItem('psrun_missions_v1', JSON.stringify({
                missions: this.missions,
                lastGeneratedDate: this.lastGeneratedDate
            }));
        } catch (e) {
            console.error('Failed to save missions', e);
        }
    }

    generateMissions() {
        this.missions = [
            {
                id: 'daily_enemy_1',
                type: 'defeat_enemy',
                target: 10,
                current: 0,
                reward: 100,
                completed: false,
                description: '敵を10体倒す'
            },
            {
                id: 'daily_coin_1',
                type: 'collect_coin',
                target: 50,
                current: 0,
                reward: 150,
                completed: false,
                description: 'コインを50枚集める'
            },
            {
                id: 'daily_score_1',
                type: 'score_points',
                target: 1000,
                current: 0,
                reward: 200,
                completed: false,
                description: 'スコア1000点達成'
            }
        ];
        this.lastGeneratedDate = new Date().toDateString();
        this.save();
    }

    updateProgress(type, amount = 1) {
        let updated = false;
        const newlyCompleted = [];

        this.missions.forEach(mission => {
            if (!mission.completed && mission.type === type) {
                const oldCurrent = mission.current;
                mission.current = Math.min(mission.target, mission.current + amount);

                if (mission.current !== oldCurrent) {
                    updated = true;
                    if (mission.current >= mission.target) {
                        mission.completed = true;
                        newlyCompleted.push(mission);
                    }
                }
            }
        });

        if (updated) {
            this.save();
        }

        return newlyCompleted;
    }

    getMissions() {
        return this.missions;
    }
}
