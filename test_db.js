import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, limit, query } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDjRqxml8UB0lNWynMIZxKdd1ejurpbRRA",
  authDomain: "tapping-game-79706.firebaseapp.com",
  projectId: "tapping-game-79706",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  const q = query(collection(db, "gallery_images"), limit(3));
  const snapshot = await getDocs(q);
  snapshot.forEach(doc => {
    console.log(JSON.stringify(doc.data(), null, 2));
  });
  process.exit(0);
}
run();
