import express from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

// Increase body limits
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Telegram Configuration
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "8915652438:AAHADxj51DwuXrCDynOA5vNQMkZKpznV-2s";
const CHAT_ID = process.env.TELEGRAM_CHAT_ID || "-1003912308693";
const CHANNEL_URL = process.env.TELEGRAM_CHANNEL_URL || "https://t.me/+V3OkDk0rM_82MmRl";

// In-memory cache for telegram file_id -> file_path
const filePathCache = new Map<string, { path: string; fetchedAt: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// Multer memory storage for direct streaming to Telegram
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB per photo
    files: 30, // Up to 30 files in a single bulk request
  },
});

// Helper to resolve Telegram file_id to file_path
async function resolveTelegramFilePath(fileId: string): Promise<string | null> {
  const cached = filePathCache.get(fileId);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.path;
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${encodeURIComponent(fileId)}`);
    const data: any = await res.json();
    if (data.ok && data.result?.file_path) {
      const p = data.result.file_path;
      filePathCache.set(fileId, { path: p, fetchedAt: Date.now() });
      return p;
    }
    console.error("Telegram getFile error response:", data);
    return null;
  } catch (err) {
    console.error("Failed to fetch getFile from Telegram:", err);
    return null;
  }
}

// 1. Health check & Telegram status
app.get("/api/telegram/status", async (req, res) => {
  try {
    const meRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`);
    const meData: any = await meRes.json();

    let chatData: any = { ok: false };
    try {
      const chatRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getChat?chat_id=${encodeURIComponent(CHAT_ID)}`);
      chatData = await chatRes.json();
    } catch (e) {
      console.warn("Could not fetch getChat:", e);
    }

    res.json({
      ok: meData.ok,
      bot: meData.result || null,
      chat: chatData.result || { id: CHAT_ID, type: "channel" },
      channelUrl: CHANNEL_URL,
      configuredChatId: CHAT_ID,
      error: meData.description || null
    });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// 2. Upload Single Image
app.post("/api/upload-single", upload.single("image"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ ok: false, error: "No image file provided" });
    }

    const title = req.body.title || file.originalname || "Untitled";
    const caption = req.body.caption || "";
    const album = req.body.album || "Personal";
    const tagsRaw = req.body.tags;
    let tags: string[] = [];
    if (Array.isArray(tagsRaw)) {
      tags = tagsRaw;
    } else if (typeof tagsRaw === "string") {
      try {
        tags = JSON.parse(tagsRaw);
      } catch {
        tags = tagsRaw.split(",").map(t => t.trim()).filter(Boolean);
      }
    }

    // Build Telegram caption
    const tgCaptionParts = [
      `📸 ${title}`,
      caption ? `\n💬 ${caption}` : "",
      album ? `\n📁 Album: #${album.replace(/\s+/g, "_")}` : "",
      tags.length > 0 ? `\n🏷️ ${tags.map(t => `#${t.replace(/\s+/g, "_")}`).join(" ")}` : "",
      `\n⏰ ${new Date().toLocaleString()}`
    ].filter(Boolean).join("");

    let tgData: any = null;

    // Helper to send photo with retry on 429
    const sendPhotoWithRetry = async (retries = 3): Promise<any> => {
      const photoFormData = new FormData();
      const photoBlob = new Blob([file.buffer], { type: file.mimetype || "image/jpeg" });
      photoFormData.append("chat_id", CHAT_ID);
      photoFormData.append("photo", photoBlob, file.originalname || "image.jpg");
      photoFormData.append("caption", tgCaptionParts.slice(0, 1024));

      const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
        method: "POST",
        body: photoFormData,
      });

      const data = await response.json();
      if (!data.ok && data.error_code === 429 && retries > 0) {
        const retryAfter = data.parameters?.retry_after || 5;
        console.warn(`Telegram API rate limit hit. Retrying after ${retryAfter} seconds...`);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        return sendPhotoWithRetry(retries - 1);
      }
      return data;
    };

    tgData = await sendPhotoWithRetry();

    if (!tgData || !tgData.ok) {
      console.error("Telegram sendPhoto failed:", tgData);
      return res.status(500).json({
        ok: false,
        error: tgData.description || "Failed to upload file to Telegram channel",
      });
    }

    let fileId = "";
    let fileUniqueId = "";
    let width = 0;
    let height = 0;
    let fileSize = file.size;
    const messageId = tgData.result.message_id;

    if (tgData.result.photo && Array.isArray(tgData.result.photo) && tgData.result.photo.length > 0) {
      const photos = tgData.result.photo;
      const bestPhoto = photos[photos.length - 1];
      fileId = bestPhoto.file_id;
      fileUniqueId = bestPhoto.file_unique_id;
      width = bestPhoto.width || 0;
      height = bestPhoto.height || 0;
      fileSize = bestPhoto.file_size || file.size;
    } else {
      return res.status(500).json({ ok: false, error: "Telegram did not return photo object" });
    }

    // Retrieve file_path
    const filePath = await resolveTelegramFilePath(fileId);

    const imageDoc = {
      id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      title,
      caption,
      album,
      tags,
      fileId,
      fileUniqueId,
      filePath: filePath || "",
      directUrl: `/api/telegram/image/${fileId}`,
      telegramMessageId: messageId,
      channelUrl: CHANNEL_URL,
      width,
      height,
      fileSize,
      mimeType: file.mimetype || "image/jpeg",
      isFavorite: false,
      createdAt: Date.now(),
      uploadedAt: new Date().toISOString(),
    };

    res.json({ ok: true, image: imageDoc });
  } catch (err: any) {
    console.error("Upload single error:", err);
    res.status(500).json({ ok: false, error: err.message || "Internal server error" });
  }
});

// 3. Direct Permanent Image Proxy Streamer
app.get("/api/telegram/image/:fileId", async (req, res) => {
  const { fileId } = req.params;
  if (!fileId) {
    return res.status(400).send("Missing file_id");
  }

  try {
    const filePath = await resolveTelegramFilePath(fileId);
    if (!filePath) {
      return res.status(404).send("Image not found on Telegram");
    }

    const downloadUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;
    const imgRes = await fetch(downloadUrl);

    if (!imgRes.ok) {
      console.error(`Failed to download from telegram: ${imgRes.status} ${imgRes.statusText}`);
      return res.status(imgRes.status).send("Failed to stream image from Telegram");
    }

    // Determine best content type for browser rendering
    let contentType = imgRes.headers.get("content-type") || "image/jpeg";
    if (contentType === "application/octet-stream" || !contentType.startsWith("image/")) {
      const ext = path.extname(filePath).toLowerCase();
      if (ext === ".png") contentType = "image/png";
      else if (ext === ".webp") contentType = "image/webp";
      else if (ext === ".gif") contentType = "image/gif";
      else if (ext === ".svg") contentType = "image/svg+xml";
      else if (ext === ".jpg" || ext === ".jpeg") contentType = "image/jpeg";
      else contentType = "image/jpeg";
    }

    // Set cache headers for fast browser rendering
    res.setHeader("Content-Type", contentType);
    const contentLength = imgRes.headers.get("content-length");
    if (contentLength) {
      res.setHeader("Content-Length", contentLength);
    }
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");

    // Stream the body to client
    const arrayBuffer = await imgRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    res.end(buffer);
  } catch (err: any) {
    console.error("Proxy image error:", err);
    res.status(500).send("Error fetching image");
  }
});

// 4. Resolve direct Telegram Download Link
app.get("/api/telegram/direct-link/:fileId", async (req, res) => {
  const { fileId } = req.params;
  try {
    const filePath = await resolveTelegramFilePath(fileId);
    if (!filePath) {
      return res.status(404).json({ ok: false, error: "File ID could not be resolved" });
    }

    const rawUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;
    res.json({
      ok: true,
      fileId,
      filePath,
      permanentProxyUrl: `/api/telegram/image/${fileId}`,
      rawTelegramUrl: rawUrl,
    });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// 5. Import by Telegram File ID
app.post("/api/telegram/import-file-id", async (req, res) => {
  const { fileId, title, album, caption, tags } = req.body;
  if (!fileId) {
    return res.status(400).json({ ok: false, error: "fileId is required" });
  }

  try {
    const filePath = await resolveTelegramFilePath(fileId);
    if (!filePath) {
      return res.status(404).json({ ok: false, error: "Invalid Telegram File ID or file not accessible" });
    }

    const imageDoc = {
      id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      title: title || `Imported Photo ${new Date().toLocaleDateString()}`,
      caption: caption || "",
      album: album || "Personal",
      tags: Array.isArray(tags) ? tags : ["Imported"],
      fileId,
      filePath,
      directUrl: `/api/telegram/image/${fileId}`,
      channelUrl: CHANNEL_URL,
      isFavorite: false,
      createdAt: Date.now(),
      uploadedAt: new Date().toISOString(),
    };

    res.json({ ok: true, image: imageDoc });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// 6. Delete message from Telegram Channel (optional cleanup)
app.delete("/api/telegram/message/:messageId", async (req, res) => {
  const { messageId } = req.params;
  try {
    const tgRes = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/deleteMessage?chat_id=${encodeURIComponent(CHAT_ID)}&message_id=${messageId}`
    );
    const data: any = await tgRes.json();
    res.json({ ok: data.ok || false, result: data });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Start the Express + Vite application
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    app.use("*", async (req, res, next) => {
      const url = req.originalUrl;
      try {
        const indexPath = path.resolve(process.cwd(), "index.html");
        let template = fs.readFileSync(indexPath, "utf-8");
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 CloudPic Gallery Server running on http://localhost:${PORT}`);
  });
}

startServer();
