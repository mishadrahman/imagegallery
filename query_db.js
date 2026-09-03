import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, limit, query } from "firebase/firestore";
import fs from "fs";

const configPath = "firebase-applet-config.json";
if (fs.existsSync(configPath)) {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const app = initializeApp(config.webConfig);
  const db = getFirestore(app);
  
  async function run() {
    const q = query(collection(db, "images"), limit(5));
    const snap = await getDocs(q);
    snap.forEach(doc => {
      console.log(doc.id, doc.data());
    });
  }
  run();
} else {
  console.log("No firebase config");
}
