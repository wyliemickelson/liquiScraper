import { MongoClient } from "mongodb";
import * as dotenv from 'dotenv'
dotenv.config();

const uri = process.env.MONGO_URI;

const client = new MongoClient(uri);

export async function saveTournament(tournament) {
  try {
    const database = client.db("tournaments");
    const haiku = database.collection("test");
    // create a document to insert
    const doc = tournament
    const result = await haiku.insertOne(doc);
    console.log(`A document was inserted with the _id: ${result.insertedId}`);
  } finally {
    await client.close();
  }
}