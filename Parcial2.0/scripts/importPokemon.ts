import { MongoClient } from "mongodb";

const MONGO_URI = process.env.MONGODB_URI || "mongodb://admin:admin123@localhost:27017/pokemon_battle?authSource=admin";
const POKEAPI_BASE = "https://pokeapi.co/api/v2";

const client = new MongoClient(MONGO_URI);

async function fetchJson(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.statusText}`);
  return res.json();
}

async function importTypeRelations(db: any) {
  console.log("Importing type relations...");
  const typesData = await fetchJson(`${POKEAPI_BASE}/type`);
  const collection = db.collection("typeRelations");
  await collection.deleteMany({});

  for (const typeEntry of typesData.results) {
    const typeDetail = await fetchJson(typeEntry.url);
    const damageRelations = typeDetail.damage_relations;
    await collection.insertOne({
      typeName: typeDetail.name,
      doubleDamageTo: damageRelations.double_damage_to.map((t: any) => t.name),
      doubleDamageFrom: damageRelations.double_damage_from.map((t: any) => t.name),
      halfDamageTo: damageRelations.half_damage_to.map((t: any) => t.name),
      halfDamageFrom: damageRelations.half_damage_from.map((t: any) => t.name),
      noDamageTo: damageRelations.no_damage_to.map((t: any) => t.name),
      noDamageFrom: damageRelations.no_damage_from.map((t: any) => t.name),
    });
  }
  console.log(`Imported ${typesData.results.length} type relations`);
}

async function importMoves(db: any, moveIds: number[]) {
  console.log(`Importing ${moveIds.length} moves...`);
  const collection = db.collection("moves");
  const existing = await collection.find({}).toArray();
  const existingIds = new Set(existing.map((m: any) => m.moveId));
  const toImport = moveIds.filter((id) => !existingIds.has(id));

  let imported = 0;
  for (const moveId of toImport) {
    try {
      const moveData = await fetchJson(`${POKEAPI_BASE}/move/${moveId}`);
      const power = moveData.power;
      const damageClass = moveData.damage_class?.name || "status";

      let statusEffect: string | undefined;
      if (moveData.meta?.ailment) {
        statusEffect = moveData.meta.ailment.name;
      }

      await collection.insertOne({
        moveId,
        name: moveData.name,
        type: moveData.type.name,
        power: power || 0,
        accuracy: moveData.accuracy || 100,
        priority: moveData.priority || 0,
        damageClass,
        effect: moveData.flavor_text_entries?.[0]?.flavor_text || "",
        statusEffect,
      });
      imported++;
      if (imported % 50 === 0) console.log(`Imported ${imported} moves...`);
    } catch (e) {
      console.log(`Failed to import move ${moveId}: ${e}`);
    }
  }
  console.log(`Imported ${imported} new moves`);
}

async function importPokemon(db: any, limit: number = 300) {
  console.log(`Importing ${limit} Pokemon...`);
  const collection = db.collection("pokemon");
  await collection.deleteMany({});
  await db.collection("userShiny").deleteMany({});

  const listData = await fetchJson(`${POKEAPI_BASE}/pokemon?limit=${limit}&offset=0`);
  const moveIdsSet = new Set<number>();
  const pokemonData: any[] = [];

  for (let i = 0; i < listData.results.length; i++) {
    const entry = listData.results[i];
    try {
      const detail = await fetchJson(entry.url);
      const types = detail.types.map((t: any) => t.type.name);
      const stats: Record<string, number> = {};
      for (const s of detail.stats) {
        stats[s.stat.name] = s.base_stat;
      }

      const moves = detail.moves
        .filter((m: any) => {
          const versionDetails = m.version_group_details;
          return versionDetails.some((v: any) => v.move_learn_method.name === "level-up");
        })
        .slice(0, 20);

      const moveIds = moves.map((m: any) => {
        const urlParts = m.move.url.split("/").filter(Boolean);
        return parseInt(urlParts[urlParts.length - 1]);
      });

      moveIds.forEach((id: number) => moveIdsSet.add(id));

      const spriteUrl = detail.sprites.other?.["official-artwork"]?.front_default
        || detail.sprites.front_default
        || "";

      const shinySpriteUrl = detail.sprites.other?.["official-artwork"]?.front_shiny
        || detail.sprites.front_shiny
        || spriteUrl;

      pokemonData.push({
        pokedexId: detail.id,
        name: detail.name,
        types,
        baseStats: {
          hp: stats.hp || 0,
          attack: stats.attack || 0,
          defense: stats.defense || 0,
          specialAttack: stats["special-attack"] || 0,
          specialDefense: stats["special-defense"] || 0,
          speed: stats.speed || 0,
        },
        spriteUrl,
        shinySpriteUrl,
        moveIds,
      });

      if ((i + 1) % 50 === 0) console.log(`Fetched ${i + 1} Pokemon...`);
    } catch (e) {
      console.log(`Failed to import Pokemon ${entry.name}: ${e}`);
    }
  }

  if (pokemonData.length > 0) {
    await collection.insertMany(pokemonData);
  }
  console.log(`Imported ${pokemonData.length} Pokemon`);

  await importMoves(db, Array.from(moveIdsSet));
}

async function main() {
  try {
    await client.connect();
    console.log("Connected to MongoDB");
    const db = client.db("pokemon_battle");

    await importTypeRelations(db);
    await importPokemon(db, 300);

    console.log("Import complete!");
  } catch (e) {
    console.error("Import failed:", e);
  } finally {
    await client.close();
  }
}

main();
