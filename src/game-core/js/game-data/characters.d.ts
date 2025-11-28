export interface SpriteConfig {
    cols: number;
    rows: number;
    walkFrames: number[];
    jumpFrames: number[];
}

export interface Character {
    key: string;
    name: string;
    emoji: string;
    rar: 'C' | 'R' | 'E' | 'L' | 'M';
    move: number;
    jump: number;
    bullet: number;
    inv: number;
    ultRate: number;
    special: string[];
    ult: string | null;
    image?: string;
    spriteConfig?: SpriteConfig;
}

export const characters: Record<string, Character>;

export const rarOrder: readonly string[];

export function rarClass(r: string): string;

export const SPECIAL_LABELS: Readonly<Record<string, string>>;

export interface UltimateDetail {
    name: string;
    description: string;
}

export const ULT_DETAILS: Readonly<Record<string, UltimateDetail>>;
