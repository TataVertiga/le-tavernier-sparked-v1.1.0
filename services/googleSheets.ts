import { google } from "googleapis";
import fs from "fs";
import path from "path";

// --- CONFIG ---
const credentialsPath = path.join(process.cwd(), "data", "credentials.json");
const spreadsheetId = process.env.GOOGLE_SHEET_ID || "";
const SHEET_ID = 0; // Modifie selon ton Google Sheet (0 par défaut)

function getAuth() {
  if (!spreadsheetId) throw new Error("[ANNIV] GOOGLE_SHEET_ID manquant.");
  if (!fs.existsSync(credentialsPath)) {
    throw new Error("[ANNIV] ❌ credentials.json introuvable !");
  }
  const credentials = JSON.parse(fs.readFileSync(credentialsPath, "utf8"));
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

// --- Lecture complète des anniversaires ---
export async function readBirthdays(): Promise<Record<string, { date: string; year?: number }>> {
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });

  const range = "Anniversaires!A2:C";
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range });
  const rows = res.data.values || [];
  const birthdays: Record<string, { date: string; year?: number }> = {};

  rows.forEach((row) => {
    const [userId, date, year] = row;
    if (userId && date) {
      birthdays[userId] = { date: date.replace(/\//g, "-"), ...(year ? { year: parseInt(year) } : {}) };
    }
  });

  return birthdays;
}

// --- Écriture complète (remplace tout A2:C) ---
export async function writeBirthdays(data: Record<string, { date: string; year?: number }>) {
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });

  const values = Object.entries(data).map(([userId, info]) => [
    userId,
    (info.date || "").replace(/\//g, "-"),
    info.year || "",
  ]);

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Anniversaires!A2:C",
    valueInputOption: "RAW",
    requestBody: { values },
  });
}

// --- Ajoute ou modifie UN anniversaire ---
export async function setBirthday(userId: string, date: string, year?: number) {
  const birthdays = await readBirthdays();
  birthdays[userId] = { date: date.replace(/\//g, "-"), ...(year ? { year } : {}) };
  await writeBirthdays(birthdays);
}

// --- Supprime UN anniversaire (suppression physique de la ligne) ---
export async function removeBirthday(userId: string) {
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });

  const range = "Anniversaires!A2:C";
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range });
  const rows = res.data.values || [];
  const rowIndex = rows.findIndex(row => row[0] === userId);

  if (rowIndex === -1) {
    return false;
  }

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: SHEET_ID,
              dimension: "ROWS",
              startIndex: rowIndex + 1, // +1 pour ignorer la ligne d'en-tête
              endIndex: rowIndex + 2
            }
          }
        }
      ]
    }
  });

  return true;
}
