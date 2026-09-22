import fs from "fs";
import path from "path";

/** Fichier principal et dossier de backups (alignés sur /data) */
const DATA_DIR = path.join(process.cwd(), "data");
const MAIN = path.join(DATA_DIR, "giveaways.json");
const BACKUPS = path.join(DATA_DIR, "backups");

/** Sauvegarde le giveaways.json dans /data/backups/giveaways-<timestamp>.json */
export function backupGiveawayFile() {
  try {
    if (!fs.existsSync(MAIN)) {
      console.warn("[BACKUP] Pas de data/giveaways.json -> skip.");
      return;
    }
    if (!fs.existsSync(BACKUPS)) fs.mkdirSync(BACKUPS, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const out = path.join(BACKUPS, `giveaways-${timestamp}.json`);

    fs.copyFileSync(MAIN, out);
    console.log(`[BACKUP] Sauvegarde créée -> ${out}`);
  } catch (err) {
    console.error("[BACKUP] Erreur :", err);
  }
}

/** Garde seulement N derniers backups (rotation) */
export function rotateBackups(keep = 50) {
  try {
    if (!fs.existsSync(BACKUPS)) return;
    const files = fs
      .readdirSync(BACKUPS)
      .filter(f => f.endsWith(".json"))
      .map(f => ({ f, t: fs.statSync(path.join(BACKUPS, f)).mtime.getTime() }))
      .sort((a, b) => b.t - a.t);

    const toDelete = files.slice(keep);
    for (const x of toDelete) {
      fs.unlinkSync(path.join(BACKUPS, x.f));
    }
    if (toDelete.length) {
      console.log(`[BACKUP] Rotation: supprimé ${toDelete.length} ancien(s) backup(s)`);
    }
  } catch (err) {
    console.error("[BACKUP] Rotation erreur :", err);
  }
}
