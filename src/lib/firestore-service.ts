
import { collection, getDocs, query } from "firebase/firestore";
import { db } from "./firebase";
import type { Player } from "./types"; // We can reuse our existing types

// A read-only array of players, for use in client components
// We should not need to fetch this data on every render.
export const players = await getPlayers();

async function getPlayers(): Promise<Omit<Player, 'data'>[]> {
  try {
    const playersCollection = collection(db, "players");
    const q = query(playersCollection);
    const querySnapshot = await getDocs(q);
    const players = querySnapshot.docs.map(doc => ({
      id: parseInt(doc.id, 10),
      ...doc.data()
    })) as Omit<Player, 'data'>[];
    
    // The dummy data generation will be used until we move that to Firestore as well.
    return players;
  } catch (error) {
    console.error("Error fetching players from Firestore:", error);
    // Return an empty array or some default data in case of an error
    return [];
  }
}
