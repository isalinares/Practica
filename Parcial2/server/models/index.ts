export interface Pokemon {
  _id?: string;
  pokedexId: number;
  name: string;
  types: string[];
  baseStats: {
    hp: number;
    attack: number;
    defense: number;
    specialAttack: number;
    specialDefense: number;
    speed: number;
  };
  spriteUrl: string;
  moveIds: number[];
}

export interface Move {
  _id?: string;
  moveId: number;
  name: string;
  type: string;
  power: number;
  accuracy: number;
  priority: number;
  damageClass: "physical" | "special" | "status";
  effect?: string;
  statusEffect?: string;
}

export interface TypeRelations {
  _id?: string;
  typeName: string;
  doubleDamageTo: string[];
  doubleDamageFrom: string[];
  halfDamageTo: string[];
  halfDamageFrom: string[];
  noDamageTo: string[];
  noDamageFrom: string[];
}

export interface Room {
  _id?: string;
  code: string;
  status: "waiting" | "ready" | "battle" | "finished";
  players: {
    player1?: { name: string; team?: string[] };
    player2?: { name: string; team?: string[] };
  };
  createdAt: Date;
}

export interface BattleStatus {
  name: string;
  remainingTurns: number;
  effect: string;
}

export interface BattlePokemon {
  pokemonId: string;
  currentHp: number;
  maxHp: number;
  attack: number;
  defense: number;
  specialAttack: number;
  specialDefense: number;
  speed: number;
  types: string[];
  name: string;
  spriteUrl: string;
  moves: string[];
  statuses: BattleStatus[];
  statStages: {
    attack: number;
    defense: number;
    specialAttack: number;
    specialDefense: number;
    speed: number;
  };
  ivs: {
    hp: number;
    attack: number;
    defense: number;
    specialAttack: number;
    specialDefense: number;
    speed: number;
  };
}

export interface BattlePlayer {
  playerId: string;
  name: string;
  team: BattlePokemon[];
  activePokemonIndex: number;
}

export interface Battle {
  _id?: string;
  roomCode: string;
  turn: number;
  status: "active" | "finished";
  players: [BattlePlayer, BattlePlayer];
  battleLog: string[];
  winnerPlayerId: string | null;
  level: number;
}

export interface BattleAction {
  type: "move" | "switch";
  moveIndex?: number;
  switchToIndex?: number;
}
