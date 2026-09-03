import fetch from "node-fetch";

async function run() {
  const filePath = "photos/file_403.jpg";
  const url = `https://api.telegram.org/file/bot8915652438:AAHADxj51DwuXrCDynOA5vNQMkZKpznV-2s/${filePath}`;
  const res = await fetch(url);
  console.log(res.status);
}
run();
