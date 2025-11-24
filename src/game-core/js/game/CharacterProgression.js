
import { ErrorHandler } from '../utils/ErrorHandler.js';
import { logger } from '../utils/Logger.js';

const PROGRESSION_KEY = 'psrun_character_progression_v1';
const EQUIPMENT_INVENTORY_KEY = 'psrun_equipment_inventory_v1';

/**
 * CharacterProgression System
 * Manages character levels, experience, skills, and equipment
 */
export class CharacterProgression {
    constructor() {
        this.progression = {}; // { [charKey]: CharacterProgressionData }
        this.equipmentInventory = {}; // { [itemId]: { owned: boolean, count: number } }
        this.load();
    }

    /**
     * Load progression data from localStorage
     */
    load() {
        ErrorHandler.safely(() => {
            const savedProgression = localStorage.getItem(PROGRESSION_KEY);
            if (savedProgression) {
                this.progression = JSON.parse(savedProgression);
                logger.info('Character progression loaded', {
                    characters: Object.keys(this.progression).length
                });
            }

            const savedEquipment = localStorage.getItem(EQUIPMENT_INVENTORY_KEY);
            if (savedEquipment) {
                this.equipmentInventory = JSON.parse(savedEquipment);
                logger.info('Equipment inventory loaded', {
                    items: Object.keys(this.equipmentInventory).length
                });
            }
        }, 'CharacterProgression.load');
    }

    /**
     * Save progression data to localStorage
     */
    save() {
        ErrorHandler.safely(() => {
            localStorage.setItem(PROGRESSION_KEY, JSON.stringify(this.progression));
            localStorage.setItem(EQUIPMENT_INVENTORY_KEY, JSON.stringify(this.equipmentInventory));
            logger.debug('Character progression saved');
        }, 'CharacterProgression.save');
    }

    /**
     * Initialize character progression data if it doesn't exist
     * @param {string} charKey 
     */
    initializeCharacter(charKey) {
        if (!this.progression[charKey]) {
            this.progression[charKey] = {
                level: 1,
                exp: 0,
                expToNext: this.calculateExpToNext(1),
                skillPoints: 0,
                skills: {
                    attack: 0,
                    defense: 0,
                    special: 0
                },
                limitBreak: 0,
                equippedItems: []
            };
            this.save();
            logger.info('Initialized character progression', { charKey });
        }
    }

    /**
     * Get character progression data
     * @param {string} charKey 
     * @returns {Object}
     */
    getCharacterData(charKey) {
        this.initializeCharacter(charKey);
        return this.progression[charKey];
    }
    /**
     * Calculate experience needed for next level
     * @param {number} level 
     * @returns {number}
     */
    calculateExpToNext(level) {
        return Math.floor(100 + (level * 50) + Math.pow(level, 1.5) * 10);
    }

    /**
     * Get current level cap based on limit breaks
     * @param {number} limitBreak 
     * @returns {number}
     */
    getLevelCap(limitBreak) {
        // Ensure integer calculation
        return 20 + Math.floor(Number(limitBreak) || 0);
    }

    /**
     * Add experience to a character
     * @param {string} charKey 
     * @param {number} exp 
     * @returns {Object} { leveledUp: boolean, newLevel: number }
     */
    addExperience(charKey, exp) {
        this.initializeCharacter(charKey);
        const data = this.progression[charKey];

        data.exp += exp;
        let leveledUp = false;
        let levelsGained = 0;

        const levelCap = this.getLevelCap(data.limitBreak);

        // Check for level ups
        while (data.exp >= data.expToNext && data.level < levelCap) {
            data.exp -= data.expToNext;
            data.level++;
            levelsGained++;
            leveledUp = true;

            // Grant skill point every 10 levels
            if (data.level % 10 === 0) {
                data.skillPoints++;
            }

            data.expToNext = this.calculateExpToNext(data.level);
        }

        // If at level cap, cap the exp
        if (data.level >= levelCap) {
            data.exp = Math.min(data.exp, data.expToNext - 1);
        }

        this.save();

        if (leveledUp) {
            logger.info('Character leveled up', {
                charKey,
                newLevel: data.level,
                levelsGained
            });
        }

        return {
            leveledUp,
            newLevel: data.level,
            levelsGained
        };
    }

    /**
     * Perform a limit break (called when duplicate character is obtained)
     * Directly increases character level by 1
     * @param {string} charKey 
     * @returns {boolean} Whether limit break was successful
     */
    limitBreak(charKey) {
        // Initialize character if needed
        this.initializeCharacter(charKey);
        const data = this.progression[charKey];

        // Directly increase level by 1
        data.level++;

        // Safely increment limitBreak
        const currentLimitBreak = Math.floor(Number(data.limitBreak) || 0);
        data.limitBreak = currentLimitBreak + 1;

        data.exp = 0; // Reset EXP
        data.expToNext = this.calculateExpToNext(data.level);

        // Grant skill point every 10 levels
        if (data.level % 10 === 0) {
            data.skillPoints++;
        }

        this.save();

        logger.info('Limit break performed - Level +1', {
            charKey,
            newLevel: data.level,
            totalLimitBreaks: data.limitBreak,
            levelCap: this.getLevelCap(data.limitBreak)
        });

        return true;
    }

    /**
     * Allocate a skill point
     * @param {string} charKey 
     * @param {'attack'|'defense'|'special'} tree 
     * @returns {boolean} Success
     */
    allocateSkillPoint(charKey, tree) {
        this.initializeCharacter(charKey);
        const data = this.progression[charKey];

        if (data.skillPoints <= 0) {
            logger.warn('No skill points available', { charKey });
            return false;
        }

        if (data.skills[tree] >= 10) {
            logger.warn('Skill tree already maxed', { charKey, tree });
            return false;
        }

        data.skills[tree]++;
        data.skillPoints--;
        this.save();

        logger.info('Skill point allocated', { charKey, tree, newValue: data.skills[tree] });
        return true;
    }

    /**
     * Reset all skills (costs coins)
     * @param {string} charKey 
     * @returns {number} Total skill points refunded
     */
    resetSkills(charKey) {
        this.initializeCharacter(charKey);
        const data = this.progression[charKey];

        const totalPoints = data.skills.attack + data.skills.defense + data.skills.special;

        data.skills.attack = 0;
        data.skills.defense = 0;
        data.skills.special = 0;
        data.skillPoints += totalPoints;

        this.save();

        logger.info('Skills reset', { charKey, pointsRefunded: totalPoints });
        return totalPoints;
    }

    /**
     * Calculate skill bonuses from allocated points
     * @param {string} charKey 
     * @returns {Object} SkillBonuses
     */
    calculateSkillBonuses(charKey) {
        this.initializeCharacter(charKey);
        const skills = this.progression[charKey].skills;

        return {
            // Attack tree
            bulletSpeedBonus: Math.min(skills.attack, 3) * 0.05,
            bulletDamageBonus: Math.max(0, Math.min(skills.attack - 3, 3)) * 0.10,
            criticalRate: Math.max(0, Math.min(skills.attack - 6, 3)) * 0.05,
            hasPiercingBullets: skills.attack >= 10,

            // Defense tree
            maxHpBonus: Math.min(skills.defense, 3) * 10, // +10/+20/+30 HP
            invincibilityBonus: Math.max(0, Math.min(skills.defense - 3, 3)) * 0.10,
            damageReduction: Math.max(0, Math.min(skills.defense - 6, 3)) * 0.05,
            hasAutoRevive: skills.defense >= 10,

            // Special tree
            ultChargeBonus: Math.min(skills.special, 3) * 0.10,
            coinBonus: Math.max(0, Math.min(skills.special - 3, 3)) * 0.10,
            expBonus: Math.max(0, Math.min(skills.special - 6, 3)) * 0.15,
            hasItemMagnet: skills.special >= 10
        };
    }

    /**
     * Equip an item to a character
     * @param {string} charKey 
     * @param {string} itemId 
     * @returns {boolean} Success
     */
    equipItem(charKey, itemId) {
        this.initializeCharacter(charKey);
        const data = this.progression[charKey];

        // Check if item is owned
        if (!this.equipmentInventory[itemId]?.owned) {
            logger.warn('Item not owned', { charKey, itemId });
            return false;
        }

        // Check if already equipped
        if (data.equippedItems.includes(itemId)) {
            logger.warn('Item already equipped', { charKey, itemId });
            return false;
        }

        // Check max slots
        if (data.equippedItems.length >= 3) {
            logger.warn('All equipment slots full', { charKey });
            return false;
        }

        data.equippedItems.push(itemId);
        this.save();

        logger.info('Item equipped', { charKey, itemId });
        return true;
    }

    /**
     * Unequip an item from a character
     * @param {string} charKey 
     * @param {string} itemId 
     * @returns {boolean} Success
     */
    unequipItem(charKey, itemId) {
        this.initializeCharacter(charKey);
        const data = this.progression[charKey];

        const index = data.equippedItems.indexOf(itemId);
        if (index === -1) {
            logger.warn('Item not equipped', { charKey, itemId });
            return false;
        }

        data.equippedItems.splice(index, 1);
        this.save();

        logger.info('Item unequipped', { charKey, itemId });
        return true;
    }

    /**
     * Add an equipment item to inventory
     * @param {string} itemId 
     * @returns {boolean} isNew
     */
    addEquipmentToInventory(itemId) {
        const isNew = !this.equipmentInventory[itemId]?.owned;

        if (!this.equipmentInventory[itemId]) {
            this.equipmentInventory[itemId] = {
                owned: true,
                count: 1
            };
        } else {
            this.equipmentInventory[itemId].count++;
        }

        this.save();
        logger.info('Equipment added to inventory', { itemId, isNew });
        return isNew;
    }

    /**
     * Get all progression data
     * @returns {Object}
     */
    getAllData() {
        return {
            progression: this.progression,
            equipmentInventory: this.equipmentInventory
        };
    }
}
