import { MongoClient } from "mongodb";

const MONGO_URI = process.env.MONGODB_URI || "mongodb://admin:admin123@localhost:27017/pokemon_battle?authSource=admin";

let client: MongoClient | null = null;

export async function getDb() {
  if (!client) {
    client = new MongoClient(MONGO_URI);
    await client.connect();
  }
  return client.db("pokemon_battle");
}

export async function closeDb() {
  if (client) {
    await client.close();
    client = null;
  }
}
