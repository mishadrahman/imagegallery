import fetch from "node-fetch";

async function run() {
  const fileId = "AgACAgUAAyEGAATpMRfVAAIBLWqYBhc97f5VVUohNReDcmB3jDbVAAIxFWsbdevAVJKcWGwWMPSsAQADAgADdwADPQQ";
  let promises = [];
  for(let i=0; i<40; i++) {
    promises.push(fetch("http://localhost:3000/api/telegram/image/" + fileId));
  }
  const results = await Promise.all(promises);
  console.log(results.map(r => r.status));
}
run();
