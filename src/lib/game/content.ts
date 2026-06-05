import wizardImg from "@/assets/tower-wizard.png";
import druidImg from "@/assets/tower-druid.png";
import elfImg from "@/assets/tower-elf.png";
import golemImg from "@/assets/tower-golem.png";
import orcImg from "@/assets/enemy-orc.png";
import goblinImg from "@/assets/enemy-goblin.png";
import skeletonImg from "@/assets/enemy-skeleton.png";
import shadowImg from "@/assets/enemy-shadow.png";
import trollImg from "@/assets/enemy-troll.png";
import wyvernImg from "@/assets/enemy-wyvern.png";

export type Element = "arcane" | "nature" | "pierce" | "earth";

export interface TowerDef {
  id: string;
  name: string;
  desc: string;
  cost: number;
  range: number;
  fireRate: number; // shots per second
  damage: number;
  projectileSpeed: number;
  splash?: number; // AoE radius
  dotDps?: number; // poison damage per sec
  dotDuration?: number;
  slow?: { factor: number; duration: number };
  canHitFlying: boolean;
  element: Element;
  color: string;
  glow: string;
  img: string;
  upgrades: { name: string; desc: string; apply: (t: TowerStats) => void }[][];
}

export interface TowerStats {
  damage: number;
  range: number;
  fireRate: number;
  splash: number;
  dotDps: number;
  dotDuration: number;
  slowFactor: number;
  slowDuration: number;
  chain: number;
  pierce: number;
}

export interface EnemyDef {
  id: string;
  name: string;
  hp: number;
  speed: number;
  bounty: number;
  damage: number; // to sanctum
  flying?: boolean;
  img: string;
  scale: number;
  tint?: string;
}

export const TOWERS: TowerDef[] = [
  {
    id: "wizard", name: "Apprentice Wizard",
    desc: "Single-target arcane bolts. Reliable damage.",
    cost: 80, range: 180, fireRate: 1.2, damage: 28, projectileSpeed: 520,
    canHitFlying: true, element: "arcane",
    color: "#7aa2ff", glow: "rgba(122,162,255,0.7)", img: wizardImg,
    upgrades: [
      [
        { name: "Chain Lightning", desc: "Bolts arc to 2 nearby enemies (50% dmg).", apply: t => { t.chain = 2; } },
        { name: "Greater Bolt", desc: "+60% damage.", apply: t => { t.damage *= 1.6; } },
      ],
      [
        { name: "Manaweave", desc: "+50% fire rate.", apply: t => { t.fireRate *= 1.5; } },
        { name: "Far Sight", desc: "+45% range, +20% damage.", apply: t => { t.range *= 1.45; t.damage *= 1.2; } },
      ],
    ],
  },
  {
    id: "druid", name: "Druid Grove",
    desc: "Splash poison. Strong against swarms.",
    cost: 110, range: 150, fireRate: 0.9, damage: 18, projectileSpeed: 380,
    splash: 60, dotDps: 14, dotDuration: 3,
    canHitFlying: false, element: "nature",
    color: "#7ed957", glow: "rgba(126,217,87,0.7)", img: druidImg,
    upgrades: [
      [
        { name: "Virulent Spores", desc: "Poison +120% damage over time.", apply: t => { t.dotDps *= 2.2; } },
        { name: "Wider Bloom", desc: "Splash +60%, damage +25%.", apply: t => { t.splash *= 1.6; t.damage *= 1.25; } },
      ],
      [
        { name: "Entangle", desc: "Slow enemies 35% for 2s.", apply: t => { t.slowFactor = 0.35; t.slowDuration = 2; } },
        { name: "Wild Growth", desc: "+50% fire rate.", apply: t => { t.fireRate *= 1.5; } },
      ],
    ],
  },
  {
    id: "elf", name: "Elven Archer",
    desc: "Fast, long-range pierce. Hits flying.",
    cost: 70, range: 220, fireRate: 2.4, damage: 14, projectileSpeed: 700,
    canHitFlying: true, element: "pierce",
    color: "#f5d774", glow: "rgba(245,215,116,0.7)", img: elfImg,
    upgrades: [
      [
        { name: "Pierce Shot", desc: "Arrows pierce up to 3 enemies.", apply: t => { t.pierce = 3; } },
        { name: "Eagle Eye", desc: "+70% range.", apply: t => { t.range *= 1.7; } },
      ],
      [
        { name: "Volley", desc: "Fire rate +80%.", apply: t => { t.fireRate *= 1.8; } },
        { name: "Heartseeker", desc: "+90% damage.", apply: t => { t.damage *= 1.9; } },
      ],
    ],
  },
  {
    id: "golem", name: "Stone Golem",
    desc: "Short range, heavy AoE slam.",
    cost: 140, range: 110, fireRate: 0.55, damage: 70, projectileSpeed: 300,
    splash: 80, canHitFlying: false, element: "earth",
    color: "#e08956", glow: "rgba(224,137,86,0.7)", img: golemImg,
    upgrades: [
      [
        { name: "Quake", desc: "Slam slows 40% for 2.5s.", apply: t => { t.slowFactor = 0.4; t.slowDuration = 2.5; } },
        { name: "Massive Boulders", desc: "+80% damage, +30% splash.", apply: t => { t.damage *= 1.8; t.splash *= 1.3; } },
      ],
      [
        { name: "Awakened", desc: "+70% fire rate.", apply: t => { t.fireRate *= 1.7; } },
        { name: "Crushing Blow", desc: "+120% damage.", apply: t => { t.damage *= 2.2; } },
      ],
    ],
  },
];

export const ENEMIES: Record<string, EnemyDef> = {
  goblin:   { id: "goblin",   name: "Goblin Scout",  hp: 35,  speed: 95, bounty: 6,  damage: 1, img: goblinImg,   scale: 0.18 },
  orc:      { id: "orc",      name: "Orc Grunt",     hp: 80,  speed: 60, bounty: 9,  damage: 1, img: orcImg,      scale: 0.22 },
  skeleton: { id: "skeleton", name: "Skeleton",      hp: 55,  speed: 70, bounty: 7,  damage: 1, img: skeletonImg, scale: 0.20 },
  shadow:   { id: "shadow",   name: "Shadow Beast",  hp: 130, speed: 80, bounty: 14, damage: 2, img: shadowImg,   scale: 0.22 },
  troll:    { id: "troll",    name: "Mossy Troll",   hp: 320, speed: 45, bounty: 28, damage: 3, img: trollImg,    scale: 0.28 },
  wyvern:   { id: "wyvern",   name: "Crimson Wyvern",hp: 170, speed: 110,bounty: 22, damage: 2, img: wyvernImg,   scale: 0.24, flying: true },
};

export interface WaveSpawn { enemy: string; count: number; interval: number; }
export interface Wave { name: string; spawns: WaveSpawn[]; reward: number; }

export const WAVES: Wave[] = [
  { name: "Scouts at the Treeline",        spawns: [{ enemy: "goblin", count: 10, interval: 0.7 }], reward: 30 },
  { name: "Orcish Probe",                  spawns: [{ enemy: "orc", count: 6, interval: 1.0 }, { enemy: "goblin", count: 6, interval: 0.5 }], reward: 35 },
  { name: "Restless Dead",                 spawns: [{ enemy: "skeleton", count: 12, interval: 0.7 }], reward: 40 },
  { name: "Mixed Vanguard",                spawns: [{ enemy: "orc", count: 10, interval: 0.8 }, { enemy: "skeleton", count: 8, interval: 0.6 }], reward: 45 },
  { name: "Shadows Stir",                  spawns: [{ enemy: "shadow", count: 6, interval: 1.0 }, { enemy: "goblin", count: 10, interval: 0.4 }], reward: 55 },
  { name: "Flight from the Cliffs",        spawns: [{ enemy: "wyvern", count: 4, interval: 1.4 }, { enemy: "skeleton", count: 10, interval: 0.6 }], reward: 60 },
  { name: "Troll Stomp",                   spawns: [{ enemy: "troll", count: 2, interval: 3.0 }, { enemy: "orc", count: 10, interval: 0.8 }], reward: 70 },
  { name: "Wyvern Wing",                   spawns: [{ enemy: "wyvern", count: 8, interval: 0.9 }], reward: 80 },
  { name: "Shadow Pact",                   spawns: [{ enemy: "shadow", count: 12, interval: 0.8 }, { enemy: "skeleton", count: 10, interval: 0.5 }], reward: 90 },
  { name: "The Iron Tide",                 spawns: [{ enemy: "orc", count: 20, interval: 0.5 }, { enemy: "troll", count: 3, interval: 2.5 }], reward: 100 },
  { name: "Plague of the Forest",          spawns: [{ enemy: "goblin", count: 30, interval: 0.25 }, { enemy: "shadow", count: 6, interval: 1.0 }], reward: 110 },
  { name: "Sky and Earth",                 spawns: [{ enemy: "wyvern", count: 8, interval: 1.0 }, { enemy: "troll", count: 4, interval: 2.0 }], reward: 120 },
  { name: "Necropolis Marches",            spawns: [{ enemy: "skeleton", count: 25, interval: 0.4 }, { enemy: "shadow", count: 10, interval: 0.7 }], reward: 140 },
  { name: "Warband",                       spawns: [{ enemy: "orc", count: 25, interval: 0.45 }, { enemy: "troll", count: 5, interval: 2.0 }, { enemy: "wyvern", count: 6, interval: 1.2 }], reward: 160 },
  { name: "The Wyrm Court",                spawns: [{ enemy: "wyvern", count: 12, interval: 0.7 }, { enemy: "troll", count: 8, interval: 1.5 }, { enemy: "shadow", count: 14, interval: 0.6 }], reward: 250 },
];

// Top-down path waypoints over the painterly battlefield (0..1 normalized)
export const PATH: Array<[number, number]> = [
  [-0.04, 0.10], [0.18, 0.22], [0.30, 0.36], [0.46, 0.42],
  [0.58, 0.55], [0.68, 0.68], [0.82, 0.76], [1.04, 0.84],
];

export const SANCTUM = { x: 1.0, y: 0.84 };

export const ABILITIES = [
  { id: "meteor", name: "Meteor", desc: "Crashing meteor: 220 dmg in 110px radius.", cooldown: 18, damage: 220, radius: 110, color: "#ff7a3a" },
  { id: "freeze", name: "Hoarfrost", desc: "Slow all enemies 60% for 4s.", cooldown: 25, slow: 0.6, duration: 4, color: "#7adfff" },
  { id: "heal",   name: "Mend Sanctum", desc: "Restore 5 lives.", cooldown: 60, heal: 5, color: "#9bff9b" },
] as const;

export type AbilityId = (typeof ABILITIES)[number]["id"];

// Skill tree nodes
export interface SkillNode {
  id: string; name: string; desc: string; cost: number; deps: string[]; col: number; row: number;
}
export const SKILL_TREE: SkillNode[] = [
  { id: "gold1",   name: "Coffers",        desc: "+50 starting gold.",                  cost: 1, deps: [],                col: 0, row: 0 },
  { id: "gold2",   name: "Treasury",       desc: "+100 starting gold.",                 cost: 2, deps: ["gold1"],         col: 0, row: 1 },
  { id: "life1",   name: "Warded Walls",   desc: "+5 sanctum lives.",                   cost: 1, deps: [],                col: 1, row: 0 },
  { id: "life2",   name: "Sanctified",     desc: "+10 sanctum lives.",                  cost: 2, deps: ["life1"],         col: 1, row: 1 },
  { id: "dmg1",    name: "Arcane Edge",    desc: "+10% global tower damage.",           cost: 2, deps: [],                col: 2, row: 0 },
  { id: "dmg2",    name: "Master's Touch", desc: "+20% global tower damage.",           cost: 3, deps: ["dmg1"],          col: 2, row: 1 },
  { id: "cd1",     name: "Quickened Sigils", desc: "Ability cooldowns -25%.",           cost: 2, deps: [],                col: 3, row: 0 },
  { id: "interest",name: "Patron's Favor", desc: "Earn +5 gold between waves.",         cost: 2, deps: ["gold1"],         col: 0, row: 2 },
  { id: "range1",  name: "Far Sight",      desc: "+10% global tower range.",            cost: 2, deps: ["dmg1"],          col: 2, row: 2 },
];

export interface MetaState {
  shards: number;
  unlockedSkills: string[];
  bestWave: number;
}

export function defaultMeta(): MetaState {
  return { shards: 0, unlockedSkills: [], bestWave: 0 };
}
