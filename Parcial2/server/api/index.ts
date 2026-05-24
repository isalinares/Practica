import { Hono } from "hono";
import { cors } from "hono/cors";
import { getDb } from "./services/db.js";
import { calcBattleStats, generateIVs, calcDamage, applyStatusEffect, processEndOfTurn, randomInt } from "./services/battleEngine.js";
import type { BattleAction, Battle, BattlePokemon, Move } from "./models/index.js";

const app = new Hono();

app.use("/*", cors({
  origin: "*",
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type"],
}));

app.get("/api/pokemon", async (c) => {
  const db = await getDb();
  const pokemon = await db.collection("pokemon").find({}).toArray();
  return c.json(pokemon);
});

app.get("/api/pokemon/:id", async (c) => {
  const db = await getDb();
  const pokemon = await db.collection("pokemon").findOne({ _id: c.req.param("id") });
  if (!pokemon) return c.json({ error: "Pokemon not found" }, 404);
  return c.json(pokemon);
});

app.get("/api/moves", async (c) => {
  const db = await getDb();
  const moves = await db.collection("moves").find({}).toArray();
  return c.json(moves);
});

app.get("/api/type-relations", async (c) => {
  const db = await getDb();
  const relations = await db.collection("typeRelations").find({}).toArray();
  const typeMap: Record<string, Record<string, number>> = {};
  for (const rel of relations) {
    typeMap[rel.typeName] = {};
    for (const t of rel.doubleDamageTo || []) typeMap[rel.typeName][t] = 2;
    for (const t of rel.halfDamageTo || []) typeMap[rel.typeName][t] = 0.5;
    for (const t of rel.noDamageTo || []) typeMap[rel.typeName][t] = 0;
  }
  return c.json(typeMap);
});

app.post("/api/rooms", async (c) => {
  const db = await getDb();
  const body = await c.req.json();
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  const room = {
    code,
    status: "waiting",
    players: {
      player1: { name: body.playerName || "Player 1" },
    },
    createdAt: new Date(),
  };
  await db.collection("rooms").insertOne(room);
  return c.json({ code });
});

app.get("/api/rooms/:code", async (c) => {
  const db = await getDb();
  const room = await db.collection("rooms").findOne({ code: c.req.param("code") });
  if (!room) return c.json({ error: "Room not found" }, 404);
  return c.json(room);
});

app.post("/api/rooms/:code/join", async (c) => {
  const db = await getDb();
  const body = await c.req.json();
  const code = c.req.param("code");
  const result = await db.collection("rooms").updateOne(
    { code, status: "waiting" },
    { $set: { "players.player2": { name: body.playerName || "Player 2" } } },
  );
  if (result.matchedCount === 0) return c.json({ error: "Room not available" }, 404);
  return c.json({ success: true });
});

app.post("/api/rooms/:code/ready", async (c) => {
  const db = await getDb();
  const body = await c.req.json();
  const code = c.req.param("code");
  const playerKey = body.playerId === "player1" ? "players.player1" : "players.player2";
  const teamKey = `${playerKey}.team`;
  await db.collection("rooms").updateOne(
    { code },
    { $set: { [teamKey]: body.team, status: "ready" } },
  );
  const room = await db.collection("rooms").findOne({ code });
  return c.json(room);
});

app.post("/api/rooms/:code/start", async (c) => {
  const db = await getDb();
  const code = c.req.param("code");
  const room = await db.collection("rooms").findOne({ code });
  if (!room || !room.players.player1?.team || !room.players.player2?.team) {
    return c.json({ error: "Both players must select teams" }, 400);
  }

  const pokemonCollection = db.collection("pokemon");
  const movesCollection = db.collection("moves");
  const typeRelations = await db.collection("typeRelations").find({}).toArray();
  const typeMap: Record<string, Record<string, number>> = {};
  for (const rel of typeRelations) {
    typeMap[rel.typeName] = {};
    for (const t of rel.doubleDamageTo || []) typeMap[rel.typeName][t] = 2;
    for (const t of rel.halfDamageTo || []) typeMap[rel.typeName][t] = 0.5;
    for (const t of rel.noDamageTo || []) typeMap[rel.typeName][t] = 0;
  }

  async function buildBattlePokemon(pokemonIds: string[]): Promise<BattlePokemon[]> {
    const result: BattlePokemon[] = [];
    for (const pid of pokemonIds) {
      const pkmn = await pokemonCollection.findOne({ _id: pid });
      if (!pkmn) continue;
      const ivs = generateIVs();
      const stats = calcBattleStats(pkmn.baseStats, ivs);
      const pkmnMoves = await movesCollection.find({ moveId: { $in: pkmn.moveIds } }).limit(4).toArray();
      result.push({
        pokemonId: pid,
        currentHp: stats.hp,
        maxHp: stats.hp,
        attack: stats.attack,
        defense: stats.defense,
        specialAttack: stats.specialAttack,
        specialDefense: stats.specialDefense,
        speed: stats.speed,
        types: pkmn.types,
        name: pkmn.name,
        spriteUrl: pkmn.spriteUrl,
        moves: pkmnMoves.map((m) => m._id!.toString()),
        statuses: [],
        statStages: { attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 },
        ivs,
      });
    }
    return result;
  }

  const p1Team = await buildBattlePokemon(room.players.player1.team);
  const p2Team = await buildBattlePokemon(room.players.player2.team);

  const battle: Battle = {
    roomCode: code,
    turn: 1,
    status: "active",
    players: [
      { playerId: "player1", name: room.players.player1.name, team: p1Team, activePokemonIndex: 0 },
      { playerId: "player2", name: room.players.player2.name, team: p2Team, activePokemonIndex: 0 },
    ],
    battleLog: ["Battle started!"],
    winnerPlayerId: null,
    level: 50,
  };

  await db.collection("battles").insertOne(battle);
  await db.collection("rooms").updateOne({ code }, { $set: { status: "battle" } });

  return c.json(battle);
});

app.get("/api/battles/:code", async (c) => {
  const db = await getDb();
  const battle = await db.collection("battles").findOne({ roomCode: c.req.param("code") });
  if (!battle) return c.json({ error: "Battle not found" }, 404);
  return c.json(battle);
});

app.post("/api/battles/:code/action", async (c) => {
  const db = await getDb();
  const code = c.req.param("code");
  const body = await c.req.json();
  const { playerId, action }: { playerId: string; action: BattleAction } = body;

  const battle = await db.collection("battles").findOne({ roomCode: code, status: "active" });
  if (!battle) return c.json({ error: "Battle not found or finished" }, 404);

  const playerIndex = playerId === "player1" ? 0 : 1;
  const opponentIndex = playerIndex === 0 ? 1 : 0;
  const player = battle.players[playerIndex];
  const opponent = battle.players[opponentIndex];
  const activePlayer = player.team[player.activePokemonIndex];
  const activeOpponent = opponent.team[opponent.activePokemonIndex];

  if (!activePlayer || activePlayer.currentHp <= 0) {
    return c.json({ error: "Active Pokemon is fainted" }, 400);
  }

  const typeRelations = await db.collection("typeRelations").find({}).toArray();
  const typeMap: Record<string, Record<string, number>> = {};
  for (const rel of typeRelations) {
    typeMap[rel.typeName] = {};
    for (const t of rel.doubleDamageTo || []) typeMap[rel.typeName][t] = 2;
    for (const t of rel.halfDamageTo || []) typeMap[rel.typeName][t] = 0.5;
    for (const t of rel.noDamageTo || []) typeMap[rel.typeName][t] = 0;
  }

  const logs: string[] = [];

  if (action.type === "switch" && action.switchToIndex !== undefined) {
    const newActive = player.team[action.switchToIndex];
    if (!newActive || newActive.currentHp <= 0) {
      return c.json({ error: "Cannot switch to fainted Pokemon" }, 400);
    }
    logs.push(`${player.name} switched to ${newActive.name}!`);
    activePlayer.statStages = { attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 };
    activePlayer.statuses = [];
    player.activePokemonIndex = action.switchToIndex;
  } else if (action.type === "move" && action.moveIndex !== undefined) {
    const moveId = activePlayer.moves[action.moveIndex];
    const movesCollection = db.collection("moves");
    const move = await movesCollection.findOne({ _id: moveId }) as Move;
    if (!move) return c.json({ error: "Move not found" }, 400);

    const paralyzed = activePlayer.statuses.find((s) => s.name === "paralysis");
    if (paralyzed && Math.random() < 0.25) {
      logs.push(`${activePlayer.name} is paralyzed and can't move!`);
    } else {
      logs.push(`${activePlayer.name} used ${move.name}!`);

      const result = calcDamage(activePlayer, activeOpponent, move, typeMap);

      if (!result.hit) {
        logs.push(`${move.name} missed!`);
      } else if (result.damage === 0 && result.effectiveness === 0) {
        logs.push(`It doesn't affect ${activeOpponent.name}...`);
      } else {
        activeOpponent.currentHp = Math.max(0, activeOpponent.currentHp - result.damage);

        if (result.effectiveness > 1) logs.push("It's super effective!");
        else if (result.effectiveness < 1 && result.effectiveness > 0) logs.push("It's not very effective...");

        if (result.critical) logs.push("Critical hit!");

        const statusApplied = applyStatusEffect(move, activeOpponent);
        if (statusApplied) {
          logs.push(`${activeOpponent.name} is now ${statusApplied}!`);
        }
      }
    }
  }

  const endOfTurnLogs = processEndOfTurn(activeOpponent);
  logs.push(...endOfTurnLogs);
  const playerEndLogs = processEndOfTurn(activePlayer);
  logs.push(...playerEndLogs);

  if (activeOpponent.currentHp <= 0) {
    logs.push(`${activeOpponent.name} fainted!`);
    const allFainted = opponent.team.every((p: BattlePokemon) => p.currentHp <= 0);
    if (allFainted) {
      battle.status = "finished";
      battle.winnerPlayerId = playerId;
      logs.push(`${player.name} wins the battle!`);
    } else {
      for (let i = 0; i < opponent.team.length; i++) {
        if (opponent.team[i].currentHp > 0) {
          opponent.activePokemonIndex = i;
          logs.push(`${opponent.name} sent out ${opponent.team[i].name}!`);
          break;
        }
      }
    }
  }

  if (activePlayer.currentHp <= 0 && battle.status === "active") {
    logs.push(`${activePlayer.name} fainted!`);
    const allFainted = player.team.every((p: BattlePokemon) => p.currentHp <= 0);
    if (allFainted) {
      battle.status = "finished";
      battle.winnerPlayerId = playerId === "player1" ? "player2" : "player1";
      logs.push(`${opponent.name} wins the battle!`);
    }
  }

  battle.turn += 1;
  battle.battleLog.push(...logs);

  await db.collection("battles").updateOne({ _id: battle._id }, { $set: battle });

  return c.json(battle);
});

export default app;
