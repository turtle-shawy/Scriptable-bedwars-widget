// --- CONFIGURATION ---
const API_KEY = "PASTE_YOUR_PERMANENT_KEY_HERE"; // <--- Put your key here
const USERNAME = "Players username"; 
const UUID = "Players UUID"; 

const FONT_NAME = "Minecraft"; 
// ---------------------

const fm = FileManager.local();
const cachePath = fm.joinPath(fm.documentsDirectory(), `bw_stats_${UUID}.json`);

let statsData = {
  stars: 0,
  finalKills: 0,
  finalDeaths: 0,
  fkdr: "0.00",
  rawRank: "MVP_PLUS",
  guildTag: ""
};

// Load cached data if network fails
if (fm.fileExists(cachePath)) {
  try {
    statsData = JSON.parse(fm.readString(cachePath));
  } catch (e) {}
}

// Fetch official live data using your permanent key
try {
  const reqPlayer = new Request(`https://api.hypixel.net/v2/player?uuid=${UUID}`);
  const reqGuild = new Request(`https://api.hypixel.net/v2/guild?player=${UUID}`);
  
  const headers = { "API-Key": API_KEY };
  reqPlayer.headers = headers;
  reqGuild.headers = headers;
  reqPlayer.timeoutInterval = 8;
  reqGuild.timeoutInterval = 8;

  const [playerRes, guildRes] = await Promise.all([
    reqPlayer.loadJSON().catch(() => null),
    reqGuild.loadJSON().catch(() => null)
  ]);

  if (playerRes && playerRes.success && playerRes.player) {
    const player = playerRes.player;
    const bw = player?.stats?.Bedwars || {};

    statsData.stars = player?.achievements?.bedwars_level || statsData.stars;

    if (player?.monthlyPackageRank && player.monthlyPackageRank !== "NONE") {
      statsData.rawRank = "SUPERSTAR"; 
    } else if (player?.newPackageRank) {
      statsData.rawRank = player.newPackageRank; 
    } else if (player?.rank && player.rank !== "NORMAL") {
      statsData.rawRank = player.rank;
    }

    statsData.finalKills = bw.final_kills_bedwars || 0;
    statsData.finalDeaths = bw.final_deaths_bedwars || 0;
    statsData.fkdr = statsData.finalDeaths > 0 
      ? (statsData.finalKills / statsData.finalDeaths).toFixed(2) 
      : statsData.finalKills.toFixed(2);
  }

  if (guildRes && guildRes.success && guildRes.guild) {
    statsData.guildTag = guildRes.guild.tag ? `[${guildRes.guild.tag}]` : "";
  }

  // Save successful fetch locally
  fm.writeString(cachePath, JSON.stringify(statsData));
} catch (e) {
  // Uses cache if offline or temporary rate limit
}

const { stars, finalKills, finalDeaths, fkdr, rawRank, guildTag } = statsData;

function getStarColor(level) {
  if (level < 100) return "#AAAAAA"; 
  if (level < 200) return "#FFFFFF"; 
  if (level < 300) return "#FFAA00"; 
  if (level < 400) return "#55FFFF"; 
  if (level < 500) return "#55FF55"; 
  if (level < 600) return "#00AAAA"; 
  if (level < 700) return "#AA00AA"; 
  if (level < 800) return "#FF55FF"; 
  if (level < 900) return "#5555FF"; 
  if (level < 1000) return "#AA00AA"; 
  return "#FFAA00"; 
}

const starColor = getStarColor(stars);

function getPixelFont(size) {
  try {
    return new Font(FONT_NAME, size);
  } catch (e) {
    return Font.boldSystemFont(size);
  }
}

function drawPixelStar(hexColor, scale = 3) {
  const matrix = [
    [0, 0, 0, 1, 1, 0, 0, 0],
    [0, 0, 1, 1, 1, 1, 0, 0],
    [1, 1, 1, 1, 1, 1, 1, 1],
    [0, 1, 1, 1, 1, 1, 1, 0],
    [0, 0, 1, 1, 1, 1, 0, 0],
    [0, 1, 1, 0, 0, 1, 1, 0],
    [1, 1, 0, 0, 0, 0, 1, 1]
  ];

  const width = 8 * scale;
  const height = 7 * scale;
  const ctx = new DrawContext();
  ctx.size = new Size(width, height);
  ctx.opaque = false;
  ctx.setFillColor(new Color(hexColor));

  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 8; c++) {
      if (matrix[r][c] === 1) {
        ctx.fillRect(new Rect(c * scale, r * scale, scale, scale));
      }
    }
  }

  return ctx.getImage();
}

function addSegment(stack, text, color, font) {
  const t = stack.addText(text);
  t.font = font;
  t.textColor = new Color(color);
  t.lineLimit = 1;
}

// --- UI LAYOUT ---
const widget = new ListWidget();
widget.backgroundColor = new Color("#0c0c10"); 
widget.refreshAfterDate = new Date(Date.now() + 15 * 60 * 1000);
widget.setPadding(6, 2, 6, 2);

const headerFont = getPixelFont(15);

// 1. Username Stack
const nameStack = widget.addStack();
nameStack.layoutHorizontally();
nameStack.centerAlignContent();
nameStack.addSpacer(); 

if (rawRank === "SUPERSTAR" || rawRank === "MVP_PLUS_PLUS") {
  addSegment(nameStack, "[MVP", "#FFAA00", headerFont);
  addSegment(nameStack, "++", "#55FFFF", headerFont);
  addSegment(nameStack, "] ", "#FFAA00", headerFont);
  addSegment(nameStack, USERNAME, "#FFAA00", headerFont);
} else if (rawRank === "MVP_PLUS") {
  addSegment(nameStack, "[MVP", "#55FFFF", headerFont);
  addSegment(nameStack, "+", "#55FF55", headerFont);
  addSegment(nameStack, "] ", "#55FFFF", headerFont);
  addSegment(nameStack, USERNAME, "#55FFFF", headerFont);
} else if (rawRank === "MVP") {
  addSegment(nameStack, `[MVP] ${USERNAME}`, "#55FFFF", headerFont);
} else if (rawRank === "VIP_PLUS") {
  addSegment(nameStack, "[VIP", "#55FF55", headerFont);
  addSegment(nameStack, "+", "#FFAA00", headerFont);
  addSegment(nameStack, "] ", "#55FF55", headerFont);
  addSegment(nameStack, USERNAME, "#55FF55", headerFont);
} else if (rawRank === "VIP") {
  addSegment(nameStack, `[VIP] ${USERNAME}`, "#55FF55", headerFont);
} else {
  addSegment(nameStack, USERNAME, "#AAAAAA", headerFont);
}

nameStack.addSpacer(); 

// 2. Guild Tag
if (guildTag) {
  widget.addSpacer(2);
  const guildStack = widget.addStack();
  guildStack.layoutHorizontally();
  guildStack.centerAlignContent();
  guildStack.addSpacer(); 
  
  addSegment(guildStack, guildTag, "#FFFF55", headerFont);
  guildStack.addSpacer(); 
}

widget.addSpacer(6);

// 3. Middle Star Display
const levelDigits = stars.toString().length;
let starFontSize = levelDigits >= 3 ? 32 : 38;
let starImgSize = levelDigits >= 3 ? { w: 22, h: 19 } : { w: 26, h: 23 };

const midStack = widget.addStack();
midStack.layoutHorizontally();
midStack.centerAlignContent();
midStack.addSpacer(); 

const leftStar = midStack.addText(`[${stars}`);
leftStar.font = getPixelFont(starFontSize);
leftStar.textColor = new Color(starColor);

midStack.addSpacer(2);

const starImg = midStack.addImage(drawPixelStar(starColor, 3));
starImg.imageSize = new Size(starImgSize.w, starImgSize.h);

midStack.addSpacer(2);

const rightStar = midStack.addText("]");
rightStar.font = getPixelFont(starFontSize);
rightStar.textColor = new Color(starColor);

midStack.addSpacer(); 

widget.addSpacer(6);

// 4. Bottom Stats
const fontBot = getPixelFont(11);

const finalsRow = widget.addStack();
finalsRow.layoutHorizontally();
finalsRow.centerAlignContent();
finalsRow.addSpacer();
addSegment(finalsRow, "Finals: ", "#AAAAAA", fontBot);
addSegment(finalsRow, `${finalKills}/${finalDeaths}`, "#FFFFFF", fontBot);
finalsRow.addSpacer();

widget.addSpacer(2);

const fkdrRow = widget.addStack();
fkdrRow.layoutHorizontally();
fkdrRow.centerAlignContent();
fkdrRow.addSpacer();
addSegment(fkdrRow, "FKDR: ", "#AAAAAA", fontBot);
addSegment(fkdrRow, `${fkdr}`, "#FF5555", fontBot);
fkdrRow.addSpacer();

if (config.runsInWidget) {
  Script.setWidget(widget);
} else {
  widget.presentSmall();
}
Script.complete();
