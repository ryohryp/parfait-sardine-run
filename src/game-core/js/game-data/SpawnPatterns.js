/**
 * SpawnPatterns.js
 * Defines wave patterns for enemy spawning.
 * 
 * Structure:
 * - id: Unique identifier
 * - minLevel: Minimum level required for this pattern to appear
 * - weight: Relative probability (higher = more frequent)
 * - duration: Total duration of the wave in ms (before next wave logic starts)
 * - spawns: Array of spawn events
 *   - time: Time in ms from start of wave
 *   - type: Enemy type ('straight', 'zigzag', 'dash', etc.) or 'random'
 *   - yOffset: Optional vertical offset from standard spawn height (0 = ground/low)
 *   - count: Optional, for simple repetition (defaults to 1)
 *   - interval: Optional, interval if count > 1
 */

export const SPAWN_PATTERNS = [
    // --- BASIC PATTERNS (Level 1+) ---
    {
        id: 'SINGLE_RANDOM',
        minLevel: 1,
        weight: 50,
        duration: 2000,
        spawns: [
            { time: 0, type: 'random' }
        ]
    },
    {
        id: 'DOUBLE_PARALLEL',
        minLevel: 1,
        weight: 20,
        duration: 2500,
        spawns: [
            { time: 0, type: 'straight', yOffset: 0 },
            { time: 0, type: 'straight', yOffset: 120 } // One ground, one air
        ]
    },
    {
        id: 'TRIPLE_STREAM',
        minLevel: 2,
        weight: 20,
        duration: 3500,
        spawns: [
            { time: 0, type: 'random' },
            { time: 800, type: 'random' },
            { time: 1600, type: 'random' }
        ]
    },

    // --- INTERMEDIATE PATTERNS (Level 3+) ---
    {
        id: 'V_FORMATION',
        minLevel: 3,
        weight: 15,
        duration: 3000,
        spawns: [
            { time: 0, type: 'hover', yOffset: 100 }, // Top Left
            { time: 400, type: 'hover', yOffset: 50 }, // Center Low
            { time: 800, type: 'hover', yOffset: 100 }  // Top Right
        ]
    },
    {
        id: 'DASH_SQUAD',
        minLevel: 3,
        weight: 15,
        duration: 3000,
        spawns: [
            { time: 0, type: 'dash', yOffset: 0 },
            { time: 600, type: 'dash', yOffset: 0 }
        ]
    },
    {
        id: 'ZIGZAG_STORM',
        minLevel: 3,
        weight: 15,
        duration: 4000,
        spawns: [
            { time: 0, type: 'zigzag', yOffset: 60 },
            { time: 500, type: 'zigzag', yOffset: 60 },
            { time: 1000, type: 'zigzag', yOffset: 60 }
        ]
    },

    // --- ADVANCED PATTERNS (Level 5+) ---
    {
        id: 'BOMBER_COVER',
        minLevel: 5,
        weight: 12,
        duration: 3500,
        spawns: [
            { time: 0, type: 'shield', yOffset: 0 }, // Shield in front
            { time: 300, type: 'bomber', yOffset: 80 } // Bomber behind/above
        ]
    },
    {
        id: 'CHASER_AMBUSH',
        minLevel: 5,
        weight: 12,
        duration: 3000,
        spawns: [
            { time: 0, type: 'chaser', yOffset: 20 },
            { time: 0, type: 'chaser', yOffset: 150 },
            { time: 1000, type: 'straight', yOffset: 0 } // Distraction
        ]
    },
    {
        id: 'SPLITTER_RAIN',
        minLevel: 6,
        weight: 10,
        duration: 4000,
        spawns: [
            { time: 0, type: 'splitter', yOffset: 100 },
            { time: 1200, type: 'splitter', yOffset: 50 }
        ]
    },

    // --- HARD PATTERNS (Level 8+) ---
    {
        id: 'WALL_OF_DOOM',
        minLevel: 8,
        weight: 8,
        duration: 4000,
        spawns: [
            { time: 0, type: 'obstacle', yOffset: 0 },
            { time: 0, type: 'hover', yOffset: 140 }, // High flyer over wall
            { time: 800, type: 'chaser', yOffset: 60 }
        ]
    },
    {
        id: 'MIXED_ASSAULT',
        minLevel: 8,
        weight: 10,
        duration: 4500,
        spawns: [
            { time: 0, type: 'dash', yOffset: 0 },
            { time: 500, type: 'bomber', yOffset: 100 },
            { time: 1000, type: 'zigzag', yOffset: 50 },
            { time: 1500, type: 'shield', yOffset: 0 }
        ]
    }
];
