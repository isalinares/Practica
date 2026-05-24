import { BattlePokemon, Move, BattleStatus } from "../models/index.js";

const LEVEL = 50;

export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function calcBattleStats(baseStats: { hp: number; attack: number; defense: number; specialAttack: number; specialDefense: number; speed: number }, ivs: { hp: number; attack: number; defense: number; specialAttack: number; specialDefense: number; speed: number }) {
  const hp = Math.floor(((2 * baseStats.hp + ivs.hp) * LEVEL) / 100) + LEVEL + 10;
  const atk = Math.floor(((2 * baseStats.attack + ivs.attack) * LEVEL) / 100) + 5;
  const def = Math.floor(((2 * baseStats.defense + ivs.defense) * LEVEL) / 100) + 5;
  const spa = Math.floor(((2 * baseStats.specialAttack + ivs.specialAttack) * LEVEL) / 100) + 5;
  const spd = Math.floor(((2 * baseStats.specialDefense + ivs.specialDefense) * LEVEL) / 100) + 5;
  const spe = Math.floor(((2 * baseStats.speed + ivs.speed) * LEVEL) / 100) + 5;
  return { hp, attack: atk, defense: def, specialAttack: spa, specialDefense: spd, speed: spe };
}

export function generateIVs() {
  return {
    hp: randomInt(0, 31),
    attack: randomInt(0, 31),
    defense: randomInt(0, 31),
    specialAttack: randomInt(0, 31),
    specialDefense: randomInt(0, 31),
    speed: randomInt(0, 31),
  };
}

export function getEffectiveStat(baseStat: number, stage: number): number {
  const clamped = Math.max(-6, Math.min(6, stage));
  let multiplier: number;
  if (clamped >= 0) {
    multiplier = (2 + clamped) / 2;
  } else {
    multiplier = 2 / (2 - clamped);
  }
  return Math.floor(baseStat * multiplier);
}

export function calcDamage(
  attacker: BattlePokemon,
  defender: BattlePokemon,
  move: Move,
  typeRelations: Record<string, Record<string, number>>,
) {
  if (move.damageClass === "status" || !move.power) {
    return { damage: 0, effectiveness: 1, critical: false, hit: true };
  }

  const accuracy = move.accuracy ?? 100;
  const hitRoll = randomInt(1, 100);
  if (hitRoll > accuracy) {
    return { damage: 0, effectiveness: 1, critical: false, hit: false };
  }

  const atkStat = move.damageClass === "physical"
    ? getEffectiveStat(attacker.attack, attacker.statStages.attack)
    : getEffectiveStat(attacker.specialAttack, attacker.statStages.specialAttack);

  const defStat = move.damageClass === "physical"
    ? getEffectiveStat(defender.defense, defender.statStages.defense)
    : getEffectiveStat(defender.specialDefense, defender.statStages.specialDefense);

  const baseDamage = Math.floor(Math.floor(Math.floor((2 * LEVEL) / 5 + 2) * move.power * atkStat / defStat) / 50) + 2;

  const randomFactor = randomInt(85, 100) / 100;

  const stab = attacker.types.includes(move.type) ? 1.5 : 1;

  let typeMultiplier = 1;
  for (const defType of defender.types) {
    const rel = typeRelations[move.type]?.[defType] ?? 1;
    typeMultiplier *= rel;
  }

  if (typeMultiplier === 0) {
    return { damage: 0, effectiveness: 0, critical: false, hit: true };
  }

  const isCritical = Math.random() < 1 / 24;
  const critical = isCritical ? 1.5 : 1;

  let burnModifier = 1;
  const burnStatus = attacker.statuses.find((s) => s.name === "burn");
  if (burnStatus && move.damageClass === "physical") {
    burnModifier = 0.5;
  }

  const modifier = randomFactor * stab * typeMultiplier * critical * burnModifier;
  const finalDamage = Math.max(1, Math.floor(baseDamage * modifier));

  return { damage: finalDamage, effectiveness: typeMultiplier, critical: isCritical, hit: true };
}

export function applyStatusEffect(move: Move, defender: BattlePokemon): string | null {
  if (!move.statusEffect || move.damageClass === "status" && !move.power) return null;
  if (Math.random() > 0.3) return null;

  const existingStatus = defender.statuses.find((s) => s.name === move.statusEffect);
  if (existingStatus) return null;

  const newStatus: BattleStatus = {
    name: move.statusEffect,
    remainingTurns: 3,
    effect: move.statusEffect,
  };
  defender.statuses.push(newStatus);
  return move.statusEffect;
}

export function processEndOfTurn(pokemon: BattlePokemon): string[] {
  const logs: string[] = [];

  for (let i = pokemon.statuses.length - 1; i >= 0; i--) {
    const status = pokemon.statuses[i];
    if (status.name === "burn" || status.name === "poison") {
      const dmg = Math.floor(pokemon.maxHp * 0.05);
      pokemon.currentHp = Math.max(0, pokemon.currentHp - dmg);
      logs.push(`${pokemon.name} takes ${dmg} damage from ${status.name}!`);
    }
    if (status.name === "paralysis" && Math.random() < 0.25) {
      logs.push(`${pokemon.name} is paralyzed and can't move!`);
    }

    status.remainingTurns -= 1;
    if (status.remainingTurns <= 0) {
      logs.push(`${pokemon.name} is no longer ${status.name}!`);
      pokemon.statuses.splice(i, 1);
    }
  }

  return logs;
}
