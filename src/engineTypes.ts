// Typed access to the rules engine (src/engine.ts) for the React Native screens.
import * as raw from './engine';

export type ActionKind = 'skip' | 'swap' | 'force' | 'trim' | 'shield' | 'lower' | 'raise' | 'peek' | 'reverse';
export type Card = { id: number; t: 'n' | 'a'; v: number; k: ActionKind };
export type Player = {
  name: string; human: boolean; points: number; cards: Card[]; actions: Card[];
  stood: boolean; bust: boolean; skip: boolean; shield: boolean; peeked: Set<number>;
};
export type RoundResult = {
  rows: { p: Player; total: number; bust: boolean }[]; winner: Player | null; pts: number; msg: string; target: number;
};
export type Screen = 'shop' | 'wardrobe' | 'stats' | 'table' | 'menu' | 'rules' | null;
export type State = {
  players: Player[]; deck: Card[]; target: number; dir: number; cur: number; round: number;
  phase: 'intro' | 'play' | 'reveal' | 'roundEnd' | 'matchEnd';
  humanTurn: boolean; acted: boolean; pending: { k: ActionKind } | null; log: string[]; roundEnded: boolean;
  result: RoundResult | null; champ: Player | null; say: string; screen: Screen; stake: number; potWon: number;
  oddsOn: boolean; storeState: 'loading' | 'ready' | 'unavailable'; buying: string; onb: number;
  reward: { chips: number; match: number } | null; toast: { m: string; id: number } | null; twistN: number; v: number;
};
export type LookKind = 'felt' | 'back' | 'dealer';
export type Save = {
  bank: number; owned: Record<LookKind, string[]>; eq: Record<LookKind, string>; boot: number; onboarded: boolean;
  stats: { matches: number; wins: number; rounds: number; roundWins: number; streak: number; best: number; earned: number };
};
export type CatalogItem = { id: string; name: string; cost: number; sw: string };

export const S = raw.S as unknown as State;
export const SAVE = raw.SAVE as unknown as Save;
export const CATALOG = raw.CATALOG as unknown as Record<LookKind, CatalogItem[]>;
export const ACTIONS = raw.ACTIONS as unknown as Record<ActionKind, { name: string; desc: string }>;
export const ORDER = raw.ORDER as unknown as ActionKind[];
export const TABLES = raw.TABLES as unknown as number[];
export const SEATS = raw.SEATS as unknown as number;
export const ODDS_COST = raw.ODDS_COST as unknown as number;
export const WIN_POINTS = raw.WIN_POINTS as unknown as number;
export const PRIVACY_URL = raw.PRIVACY_URL as unknown as string;
export const TERMS_URL = raw.TERMS_URL as unknown as string;
export const SUPPORT_URL = raw.SUPPORT_URL as unknown as string;

export const subscribe = raw.subscribe as (fn: () => void) => () => void;
export const version = raw.version as () => number;
export const act = raw.act as (a: string, arg?: string | number | null, arg2?: string) => void;
export const grantPack = raw.grantPack as (id: string) => boolean;
export const setOffers = raw.setOffers as (list: { id: string; price: string }[]) => void;
export const setStoreReady = raw.setStoreReady as (on: boolean) => void;
export const buyDone = raw.buyDone as () => void;
export const hydrate = raw.hydrate as (json: string) => boolean;
export const setSaveHook = raw.setSaveHook as (fn: (json: string) => void) => void;
export const initMatch = raw.initMatch as () => void;
export const total = raw.total as (p: Player) => number;
export const visTotal = raw.visTotal as (p: Player) => number;
export const active = raw.active as (p: Player) => boolean;
export const idxOf = raw.idxOf as (p: Player) => number;
export const valid = raw.valid as (p: Player, k: ActionKind) => boolean;
export const targetsFor = raw.targetsFor as (p: Player, k: ActionKind) => Player[] | null;
export const bustRisk = raw.bustRisk as (p: Player) => number;
export const fmt = raw.fmt as (n: number) => string;
export const statusText = raw.statusText as () => string;
export const tableLine = raw.tableLine as () => string;
export const dailyReady = raw.dailyReady as () => boolean;
export const dailyAmount = raw.dailyAmount as () => { amount: number; streak: number };
