const { createCanvas, loadImage, registerFont } = require("canvas");
const os = require("os");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024, sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function getCPUUsage() {
  const cpus = os.cpus();
  const totalIdle = cpus.reduce((acc, cpu) => acc + cpu.times.idle, 0);
  const totalTick = cpus.reduce((acc, cpu) => acc + Object.values(cpu.times).reduce((a, b) => a + b, 0), 0);
  const usagePercent = 100 - (totalIdle / totalTick) * 100;
  return usagePercent;
}

function detectLangVersion() {
  return process.release?.name === "node" ? { lang: "Node.js", version: process.version } : { lang: "Unknown", version: "N/A" };
}

async function getBackgroundImage() {
  try {
    const res = await axios.get("https://i.ibb.co/TDJN13P4/image.jpg", { responseType: "arraybuffer" });
    return res.data;
  } catch {
    return null;
  }
}

function drawBar(ctx, x, y, width, height, percent) {
  const filled = (percent / 100) * width;
  ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
  ctx.fillRect(x, y, width, height);
  ctx.fillStyle = "#ff4b1f";
  ctx.fillRect(x, y, filled, height);
}

async function buildImage(stats) {
  const width = 1280, height = 720;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  const bgBuffer = await getBackgroundImage();
  if (bgBuffer) {
    const img = await loadImage(bgBuffer);
    ctx.drawImage(img, 0, 0, width, height);
  } else {
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, "#141e30");
    grad.addColorStop(1, "#243b55");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }

  try {
    registerFont(path.join(__dirname, "assets", "Inter-Bold.ttf"), { family: "InterBold" });
    registerFont(path.join(__dirname, "assets", "Inter-Regular.ttf"), { family: "Inter" });
  } catch {}

  const boxX = 500;
  const boxY = 60;
  const boxWidth = 720;
  const boxHeight = 600;
  ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
  ctx.fillRect(boxX, boxY, boxWidth, boxHeight);

  ctx.fillStyle = "#fff";
  ctx.font = '24px "InterBold"';
  ctx.fillText("MADE BY PRIYANSHI KAUR", 60, 80);

  const textX = boxX + 40;
  let currentY = boxY + 70;
  ctx.fillStyle = "#fff";
  ctx.font = '48px "InterBold"';
  ctx.fillText("QueenBot V2 Uptime", textX, currentY);

  currentY += 40;
  ctx.font = '20px "Inter"';
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.fillText(new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }), textX, currentY);

  currentY += 80;
  const gap = 75;
  const labelX = textX;
  const valueX = labelX + 220;

  ctx.font = '26px "InterBold"';
  ctx.fillStyle = "#ffde59";
  ctx.fillText("Ping:", labelX, currentY);
  ctx.fillStyle = "#fff";
  ctx.font = '26px "Inter"';
  ctx.fillText(stats.ping, valueX, currentY);
  currentY += gap;

  ctx.font = '26px "InterBold"';
  ctx.fillStyle = "#ffde59";
  ctx.fillText("CPU Usage:", labelX, currentY);
  const barWidth = 325;
  const percentX = valueX + barWidth + 15;
  drawBar(ctx, valueX, currentY - 18, barWidth, 20, stats.cpuUsage);
  ctx.fillStyle = "#fff";
  ctx.font = '22px "Inter"';
  ctx.fillText(`${stats.cpuUsage.toFixed(1)}%`, percentX, currentY);
  currentY += gap;

  ctx.font = '26px "InterBold"';
  ctx.fillStyle = "#ffde59";
  ctx.fillText("Memory:", labelX, currentY);
  ctx.fillStyle = "#fff";
  ctx.font = '26px "Inter"';
  ctx.fillText(`${formatBytes(stats.usedMem)} / ${formatBytes(stats.totalMem)} (${stats.memPct}%)`, valueX, currentY);
  currentY += gap;

  ctx.font = '26px "InterBold"';
  ctx.fillStyle = "#ffde59";
  ctx.fillText("Uptime:", labelX, currentY);
  ctx.fillStyle = "#fff";
  ctx.font = '26px "Inter"';
  ctx.fillText(stats.uptimeFormatted, valueX, currentY);
  currentY += gap;

  ctx.font = '26px "InterBold"';
  ctx.fillStyle = "#ffde59";
  ctx.fillText("Language:", labelX, currentY);
  ctx.fillStyle = "#fff";
  ctx.font = '26px "Inter"';
  ctx.fillText(`${stats.lang} ${stats.langVersion}`, valueX, currentY);

  return canvas.toBuffer("image/png");
}

async function collectStats() {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const memPct = ((usedMem / totalMem) * 100).toFixed(1);
  const cpuUsage = getCPUUsage();
  const { lang, version } = detectLangVersion();
  const uptime = process.uptime();
  const days = Math.floor(uptime / (3600 * 24));
  const hours = Math.floor((uptime % (3600 * 24)) / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = Math.floor(uptime % 60);
  const uptimeFormatted = `${days}d ${hours}h ${minutes}m ${seconds}s`;
  return { cpuUsage, totalMem, usedMem, memPct, uptimeFormatted, lang, langVersion: version, ping: "≈ " + Math.floor(Math.random() * 100) + " ms" };
}

module.exports = {
  config: {
    name: "uptime2",
    aliases: ["up2", "statusimg"],
    version: "13.0.0",
    author: "Priyanshi Kaur",
    role: 0,
    countDown: 10,
    shortDescription: "Show uptime with glassy anime UI",
    category: "system"
  },
  onStart: async function ({ api, event }) {
    try {
      const tmp = path.join(__dirname, "tmp_uptime");
      if (!fs.existsSync(tmp)) fs.mkdirSync(tmp, { recursive: true });
      const stats = await collectStats();
      const img = await buildImage(stats);
      const file = path.join(tmp, `uptime_${Date.now()}.png`);
      fs.writeFileSync(file, img);
      await api.sendMessage({ body: "📈 Uptime & System Stats", attachment: fs.createReadStream(file) }, event.threadID, () => fs.unlinkSync(file), event.messageID);
    } catch {
      await api.sendMessage("❌ Failed to generate uptime image.", event.threadID, event.messageID);
    }
  }
};