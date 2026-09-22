import { Client, TextChannel } from "discord.js";
import { google } from "googleapis";
import dayjs from "dayjs";
import "dayjs/locale/fr.js";
import tz from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";
import fs from "fs";
import path from "path";
import { isPublishingPaused } from "../state/tavernierState.js";
import { writeJsonAtomic } from "../utils/jsonFiles.js";

dayjs.locale("fr");
dayjs.extend(utc);
dayjs.extend(tz);

// --- CONFIG ---
const TZ = "Europe/Paris";
const DATA_DIR = path.join(process.cwd(), "data");
const CACHE_PATH = path.join(DATA_DIR, "anniv-cache.json");

const ANNIV_CHANNEL_ID = process.env.ANNIV_CHANNEL_ID || "";
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID || "";
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || "";
const CREDENTIALS_PATH = path.join(DATA_DIR, "credentials.json");

// --- Cache ---
type CacheFile = { lastDate: string; sent: string[] };
let cache: CacheFile = { lastDate: dayjs().tz(TZ).format("YYYY-MM-DD"), sent: [] };

function loadCache() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(CACHE_PATH)) {
      writeJsonAtomic(CACHE_PATH, cache);
      return;
    }
    cache = JSON.parse(fs.readFileSync(CACHE_PATH, "utf8")) as CacheFile;
  } catch {
    console.warn("[ANNIV] ⚠️ Cache illisible, reset.");
  }
}
function saveCache() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    writeJsonAtomic(CACHE_PATH, cache);
  } catch (e) {
    console.warn("[ANNIV] ⚠️ Impossible d’écrire le cache:", e);
  }
}

// --- Répliques ---
const REPLIQUES_AGE = [
  (userId: string, age: number) => `🍻 Bon anniversaire <@${userId}> ! Encore un an de plus au compteur, ça commence à sentir la poussière (tu as maintenant ${age} ans) !`,
  (userId: string, age: number) => `🎉 Santé <@${userId}> ! ${age} ans aujourd’hui… On ne dirait pas, et pourtant la bière ne ment jamais.`,
  (userId: string, age: number) => `🥳 Joyeux anniversaire <@${userId}> ! ${age} ans, et pas une ride (enfin presque). Passe boire ta pinte !`,
  (userId: string, age: number) => `🍰 Un an de plus pour <@${userId}>, ${age} ans, t’approches de la catégorie vétéran de la Taverne !`,
  (userId: string, age: number) => `🎂 <@${userId}>, ${age} ans aujourd’hui ! Tu gagnes le droit d’offrir ta tournée à tous les gueux présents.`
];
const REPLIQUES_SANS_AGE = [
  (userId: string) => `🍻 Bon anniversaire <@${userId}> ! L’âge, c’est dans la tête (et parfois dans le foie).`,
  (userId: string) => `🎉 <@${userId}>, la Taverne te souhaite un anniversaire mystérieux, comme ton âge.`,
  (userId: string) => `🥳 On ne connaît pas ton âge, mais joyeux anniversaire quand même <@${userId}> ! Profite bien !`,
  (userId: string) => `🍰 Bon anniversaire à notre gueux anonyme préféré, <@${userId}> !`,
  (userId: string) => `🎂 Tu refuses de donner ton âge, <@${userId}> ? Pas grave, t’as quand même le droit à une pinte offerte !`
];

// --- Date parser ---
function parseDateSmart(dateString: string) {
  if (!dateString) return null;
  const parts = dateString.replace(/\s+/g, "").replace(/\//g, "-").split("-");
  if (parts.length === 2) {
    let [a, b] = parts;
    const A = parseInt(a, 10), B = parseInt(b, 10);
    if (Number.isNaN(A) || Number.isNaN(B)) return null;
    if (A > 12) return { day: a.padStart(2, "0"), month: b.padStart(2, "0") };
    if (B > 12) return { day: b.padStart(2, "0"), month: a.padStart(2, "0") };
    return { day: a.padStart(2, "0"), month: b.padStart(2, "0") };
  }
  if (parts.length === 3) {
    let [a, b, c] = parts;
    if (c.length === 4) {
      const A = parseInt(a, 10), B = parseInt(b, 10);
      if ([A, B, parseInt(c, 10)].some(Number.isNaN)) return null;
      if (A > 12) return { day: a.padStart(2, "0"), month: b.padStart(2, "0"), year: c };
      if (B > 12) return { day: b.padStart(2, "0"), month: a.padStart(2, "0"), year: c };
      return { day: a.padStart(2, "0"), month: b.padStart(2, "0"), year: c };
    }
  }
  return null;
}

// --- Sheets client ---
function getSheetsClient() {
  if (fs.existsSync(CREDENTIALS_PATH)) {
    const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, "utf8"));
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });
    return google.sheets({ version: "v4", auth });
  }
  if (!GOOGLE_API_KEY) {
    throw new Error("[ANNIV] ❌ Pas d’API key ni credentials.json.");
  }
  return google.sheets({ version: "v4", auth: GOOGLE_API_KEY });
}

// --- Lecture Google Sheets ---
async function getAnniversaires() {
  try {
    console.log("[ANNIV] Lecture des données Google Sheets…");
    const sheets = getSheetsClient();
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: "Anniversaires!A2:C",
    });
    const rows = res.data.values || [];
    console.log(`[ANNIV] ${rows.length} anniversaires enregistrés.`);
    return rows
      .filter((row) => row.length >= 2 && row[0])
      .map((row) => ({
        userId: String(row[0]),
        date: String(row[1]),
        year: row[2] ? String(row[2]) : undefined,
      }));
  } catch (err) {
    console.error("[ANNIV] ❌ Erreur Google Sheets :", err);
    return [];
  }
}

// --- Récupération salon ---
async function getAnnivChannel(client: Client): Promise<TextChannel | null> {
  if (!ANNIV_CHANNEL_ID) return null;
  const cached = client.channels.cache.get(ANNIV_CHANNEL_ID);
  if (cached && cached.isTextBased()) return cached as TextChannel;
  try {
    const fetched = await client.channels.fetch(ANNIV_CHANNEL_ID);
    if (fetched && fetched.isTextBased()) return fetched as TextChannel;
  } catch {}
  return null;
}

// --- Vérif & envoi ---
async function checkAndSendAnniversaires(client: Client) {
  if (isPublishingPaused()) { console.log("[ANNIV] Publication bloquée (pause=ON)"); return; }

  const today = dayjs().tz(TZ);
  const todayKey = today.format("YYYY-MM-DD");
  const todayShort = today.format("DD/MM");
  console.log(`[ANNIV] Vérification pour le ${todayShort} (${TZ})…`);

  if (cache.lastDate !== todayKey) {
    cache.lastDate = todayKey;
    cache.sent = [];
    saveCache();
    console.log("[ANNIV] ♻️ Cache reset (nouvelle journée).");
  }

  const anniversaires = await getAnniversaires();
  if (!anniversaires.length) {
    console.log("[ANNIV] Aucun anniversaire à traiter.");
    return;
  }

  const channel = await getAnnivChannel(client);
  if (!channel) {
    console.warn("[DISCORD] ⚠️ Salon d'anniversaire introuvable !");
    return;
  }

  let count = 0;
  for (const anniv of anniversaires) {
    const parsed = parseDateSmart(anniv.date);
    if (!parsed) continue;

    const dateFormatee = `${parsed.day}/${parsed.month}`;
    if (dateFormatee !== todayShort) continue;
    if (cache.sent.includes(anniv.userId)) continue;

    let age: number | undefined;
    const year = parsed.year || anniv.year;
    if (year) {
      const birth = dayjs.tz(`${year}-${parsed.month}-${parsed.day}`, TZ);
      if (birth.isValid()) age = today.diff(birth, "year");
    }

    const msg = age !== undefined
      ? REPLIQUES_AGE[Math.floor(Math.random() * REPLIQUES_AGE.length)](anniv.userId, age)
      : REPLIQUES_SANS_AGE[Math.floor(Math.random() * REPLIQUES_SANS_AGE.length)](anniv.userId);

    try {
      await channel.send(msg);
      cache.sent.push(anniv.userId);
      saveCache();
      count++;
      console.log(`[DISCORD] 🎉 Anniversaire souhaité à <@${anniv.userId}>`);
    } catch (err) {
      console.error(`[DISCORD] ❌ Envoi impossible pour <@${anniv.userId}> :`, err);
    }
  }

  if (count === 0) {
    console.log("[ANNIV] Aucun nouvel anniversaire à souhaiter aujourd'hui.");
  }
}

// --- Planif reset ---
function scheduleMidnightReset() {
  const now = dayjs().tz(TZ);
  const nextMidnight = now.add(1, "day").startOf("day").add(5, "second");
  setTimeout(() => {
    cache.lastDate = dayjs().tz(TZ).format("YYYY-MM-DD");
    cache.sent = [];
    saveCache();
    console.log("[ANNIV] ♻️ Cache réinitialisé à minuit.");
    scheduleMidnightReset();
  }, nextMidnight.diff(now, "millisecond"));
}

// --- Init ---
export function initAnniversaires(client: Client) {
  loadCache();
  if (!ANNIV_CHANNEL_ID) console.warn("[ANNIV] ⚠️ ANNIV_CHANNEL_ID manquant !");
  if (!GOOGLE_SHEET_ID) console.warn("[ANNIV] ⚠️ GOOGLE_SHEET_ID manquant !");
  if (!GOOGLE_API_KEY && !fs.existsSync(CREDENTIALS_PATH)) {
    console.warn("[ANNIV] ⚠️ Pas d’API key ni credentials.json.");
  }

  console.log("[ANNIV] 📅 Système d'anniversaires démarré (Europe/Paris)…");

  checkAndSendAnniversaires(client);
  setInterval(() => checkAndSendAnniversaires(client), 1000 * 60 * 60 * 3);
  scheduleMidnightReset();
}
