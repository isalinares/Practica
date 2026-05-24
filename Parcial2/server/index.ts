import { Hono } from "hono";
import { cors } from "hono/cors";
import { ObjectId } from "mongodb";
import { getDb } from "./services/db.js";
import { calcBattleStats, generateIVs, calcDamage, applyStatusEffect, processEndOfTurn } from "./services/battleEngine.js";
import { getUser } from "./services/auth.js";
import { createCheckoutSession, handleWebhook } from "./services/stripe.js";

const app = new Hono();

const CLERK_KEY = process.env.CLERK_PUBLISHABLE_KEY || "";
console.log("Clerk key loaded:", CLERK_KEY ? "Yes (starts with " + CLERK_KEY.slice(0, 10) + "...)" : "No");

app.use("/*", cors({
  origin: "*",
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
}));

app.get("/api/pokemon", async (c) => {
  const db = await getDb();
  const pokemon = await db.collection("pokemon").find({}).toArray();
  return c.json(pokemon);
});

app.get("/api/user/shiny", async (c) => {
  const user = await getUser(c.req.raw);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  
  const db = await getDb();
  const shiny = await db.collection("userShiny").find({ userId: user.id }).toArray();
  return c.json({ shiny: shiny.map(s => s.pokemonId) });
});

app.get("/api/moves", async (c) => {
  const db = await getDb();
  const moves = await db.collection("moves").find({}).toArray();
  return c.json(moves);
});

app.get("/api/type-relations", async (c) => {
  const db = await getDb();
  const relations = await db.collection("typeRelations").find({}).toArray();
  const typeMap = {};
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
    players: { player1: { name: body.playerName || "Player 1" } },
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
  await db.collection("rooms").updateOne({ code }, { $set: { [teamKey]: body.team } });
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

  async function buildBattlePokemon(pokemonIds) {
    const result = [];
    for (const pid of pokemonIds) {
      const pkmn = await pokemonCollection.findOne({ _id: new ObjectId(pid) });
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
        moves: pkmnMoves.map((m) => m._id.toString()),
        statuses: [],
        statStages: { attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 },
        ivs,
      });
    }
    return result;
  }

  const p1Team = await buildBattlePokemon(room.players.player1.team);
  const p2Team = await buildBattlePokemon(room.players.player2.team);

  const coin = Math.random() < 0.5;
  const firstPlayer = coin ? "player1" : "player2";

  const battle = {
    roomCode: code,
    turn: 1,
    status: "active",
    players: [
      { playerId: "player1", name: room.players.player1.name, team: p1Team, activePokemonIndex: 0 },
      { playerId: "player2", name: room.players.player2.name, team: p2Team, activePokemonIndex: 0 },
    ],
    battleLog: ["Battle started!", `${room.players[firstPlayer === "player1" ? "player1" : "player2"].name} goes first!`],
    winnerPlayerId: null,
    level: 50,
    pendingActions: {},
    turnOrder: [firstPlayer, firstPlayer === "player1" ? "player2" : "player1"],
    currentTurnIndex: 0,
    turnPhase: "waiting",
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
  const { playerId, action } = body;

  const battle = await db.collection("battles").findOne({ roomCode: code, status: "active" });
  if (!battle) return c.json({ error: "Battle not found or finished" }, 404);

  if (battle.pendingActions[playerId]) {
    return c.json({ error: "You already made an action this turn" }, 400);
  }

  const playerIndex = playerId === "player1" ? 0 : 1;
  const opponentIndex = playerIndex === 0 ? 1 : 0;
  const player = battle.players[playerIndex];
  const opponent = battle.players[opponentIndex];
  const activePlayer = player.team[player.activePokemonIndex];
  const activeOpponent = opponent.team[opponent.activePokemonIndex];

  if (!activePlayer || activePlayer.currentHp <= 0) {
    return c.json({ error: "Active Pokemon is fainted" }, 400);
  }

  battle.pendingActions[playerId] = action;

  const allPlayersActed = battle.turnOrder.every((pid) => battle.pendingActions[pid]);

  if (!allPlayersActed) {
    await db.collection("battles").updateOne({ _id: battle._id }, { $set: battle });
    return c.json(battle);
  }

  const logs = [];
  const typeRelations = await db.collection("typeRelations").find({}).toArray();
  const typeMap = {};
  for (const rel of typeRelations) {
    typeMap[rel.typeName] = {};
    for (const t of rel.doubleDamageTo || []) typeMap[rel.typeName][t] = 2;
    for (const t of rel.halfDamageTo || []) typeMap[rel.typeName][t] = 0.5;
    for (const t of rel.noDamageTo || []) typeMap[rel.typeName][t] = 0;
  }

  function executeAction(pid, actionData) {
    const pIdx = pid === "player1" ? 0 : 1;
    const oIdx = pIdx === 0 ? 1 : 0;
    const p = battle.players[pIdx];
    const o = battle.players[oIdx];
    const activeP = p.team[p.activePokemonIndex];
    const activeO = o.team[o.activePokemonIndex];

    if (!activeP || activeP.currentHp <= 0) return;

    if (actionData.type === "switch" && actionData.switchToIndex !== undefined) {
      const newActive = p.team[actionData.switchToIndex];
      if (!newActive || newActive.currentHp <= 0) return;
      logs.push(`${p.name} switched to ${newActive.name}!`);
      activeP.statStages = { attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 };
      activeP.statuses = [];
      p.activePokemonIndex = actionData.switchToIndex;
    } else if (actionData.type === "move" && actionData.moveIndex !== undefined) {
      const moveId = activeP.moves[actionData.moveIndex];
      const move = db.collection("moves").findOne({ _id: new ObjectId(moveId) });
      return move.then((m) => {
        if (!m) return;

        const paralyzed = activeP.statuses.find((s) => s.name === "paralysis");
        if (paralyzed && Math.random() < 0.25) {
          logs.push(`${activeP.name} is paralyzed and can't move!`);
          return;
        }

        logs.push(`${activeP.name} used ${m.name}!`);
        const result = calcDamage(activeP, activeO, m, typeMap);

        if (!result.hit) {
          logs.push(`${m.name} missed!`);
        } else if (result.damage === 0 && result.effectiveness === 0) {
          logs.push(`It doesn't affect ${activeO.name}...`);
        } else {
          activeO.currentHp = Math.max(0, activeO.currentHp - result.damage);
          if (result.effectiveness > 1) logs.push("It's super effective!");
          else if (result.effectiveness < 1 && result.effectiveness > 0) logs.push("It's not very effective...");
          if (result.critical) logs.push("Critical hit!");
          const statusApplied = applyStatusEffect(m, activeO);
          if (statusApplied) logs.push(`${activeO.name} is now ${statusApplied}!`);
        }
      });
    }
    return Promise.resolve();
  }

  const p1Action = battle.pendingActions["player1"];
  const p2Action = battle.pendingActions["player2"];

  const promises = [];

  if (p1Action) {
    promises.push(executeAction("player1", p1Action));
  }
  if (p2Action) {
    promises.push(executeAction("player2", p2Action));
  }

  await Promise.all(promises);

  logs.push(...processEndOfTurn(battle.players[0].team[battle.players[0].activePokemonIndex]));
  logs.push(...processEndOfTurn(battle.players[1].team[battle.players[1].activePokemonIndex]));

  for (const player of battle.players) {
    const active = player.team[player.activePokemonIndex];
    if (active && active.currentHp <= 0) {
      logs.push(`${active.name} fainted!`);
      if (player.team.every((p) => p.currentHp <= 0)) {
        battle.status = "finished";
        battle.winnerPlayerId = player.playerId === "player1" ? "player2" : "player1";
        logs.push(`${battle.players[battle.winnerPlayerId === "player1" ? 0 : 1].name} wins the battle!`);
      } else {
        for (let i = 0; i < player.team.length; i++) {
          if (player.team[i].currentHp > 0) {
            player.activePokemonIndex = i;
            logs.push(`${player.name} sent out ${player.team[i].name}!`);
            break;
          }
        }
      }
    }
  }

  battle.turn += 1;
  battle.battleLog.push(...logs);
  battle.pendingActions = {};
  
  const nextFirst = battle.turnOrder[1];
  const nextSecond = battle.turnOrder[0];
  battle.turnOrder = [nextFirst, nextSecond];
  battle.currentTurnIndex = 0;

  await db.collection("battles").updateOne({ _id: battle._id }, { $set: battle });
  return c.json(battle);
});

app.post("/api/stripe/create-checkout", async (c) => {
  const user = await getUser(c.req.raw);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  
  const { pokemonId, pokemonName } = await c.req.json();
  
  try {
    const session = await createCheckoutSession(user.id, pokemonId, pokemonName);
    return c.json({ url: session.url });
  } catch (e) {
    return c.json({ error: e.message }, 500);
  }
});

app.post("/api/stripe/webhook", async (c) => {
  const body = await c.req.raw.text();
  const signature = c.req.header("stripe-signature");
  
  try {
    await handleWebhook(body, signature);
    return c.json({ received: true });
  } catch (e) {
    return c.json({ error: e.message }, 400);
  }
});

app.get("/api/user", async (c) => {
  const user = await getUser(c.req.raw);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  return c.json(user);
});

const port = 3001;

Bun.serve({
  port,
  async fetch(req) {
    const url = new URL(req.url);
    if (url.pathname.startsWith("/api/")) {
      return app.fetch(req);
    }
    if (url.pathname === "/" || url.pathname === "/index.html") {
      let html = await Bun.file("./public/index.html").text();
      html = html.replace("CLERK_KEY_PLACEHOLDER", CLERK_KEY);
      return new Response(html, { headers: { "Content-Type": "text/html" } });
    }
    if (url.pathname.endsWith(".css")) {
      const file = Bun.file(`./public${url.pathname}`);
      return new Response(file, { headers: { "Content-Type": "text/css" } });
    }
    if (url.pathname.endsWith(".js")) {
      const file = Bun.file(`./public${url.pathname}`);
      return new Response(file, { headers: { "Content-Type": "application/javascript" } });
    }
    return new Response("Not Found", { status: 404 });
  },
});

console.log(`Server running on http://localhost:${port}`);
