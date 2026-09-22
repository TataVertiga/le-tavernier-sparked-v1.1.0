import fs from "fs";
import path from "path";
import { backupGiveawayFile } from "../utils/backupGiveaway.js";
const DATA_DIR = path.join(process.cwd(), "data");
const MAIN = path.join(DATA_DIR, "giveaways.json");
/** Lit le JSON. Un fichier corrompu n'est jamais remplacé silencieusement. */
export function loadGiveaways() {
    if (!fs.existsSync(DATA_DIR))
        fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(MAIN))
        return {};
    try {
        const raw = fs.readFileSync(MAIN, "utf8");
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed))
            return parsed;
        throw new Error("la racine JSON doit être un objet");
    }
    catch (error) {
        throw new Error(`[GIVEAWAY] data/giveaways.json illisible; fichier conservé: ${error instanceof Error ? error.message : String(error)}`);
    }
}
/** Écrit le JSON de manière atomique puis fait un backup */
export function saveGiveaways(data, createBackup = false) {
    if (!fs.existsSync(DATA_DIR))
        fs.mkdirSync(DATA_DIR, { recursive: true });
    if (createBackup)
        backupGiveawayFile();
    const tmp = MAIN + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf8");
    fs.renameSync(tmp, MAIN); // écriture atomique
}
