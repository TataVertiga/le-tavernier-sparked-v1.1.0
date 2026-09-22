import fs from "node:fs";
import path from "node:path";
import { log } from "./logger.js";

type RuntimeFile = {
  relativePath: string;
  defaultValue: unknown;
  templatePath?: string;
};

const runtimeFiles: RuntimeFile[] = [
  { relativePath: "data/giveaways.json", defaultValue: {} },
  { relativePath: "data/last_posts.json", defaultValue: {} },
  { relativePath: "data/last_youtube.json", defaultValue: { lastIds: [] } },
  { relativePath: "data/twitch_clips_state.json", defaultValue: { postedIds: [] } },
  { relativePath: "data/anniv-cache.json", defaultValue: { lastDate: "", sent: [] } },
  { relativePath: "data/presenter.json", defaultValue: { presented: false } },
  { relativePath: "data/reaction-map.json", defaultValue: {} },
  {
    relativePath: "data/roles.json",
    defaultValue: { alertes: [], plateformes: [], jeux: [] },
    templatePath: "data/defaults/roles.json",
  },
  { relativePath: "data/tavernier_state.json", defaultValue: { mute: false, pausePublishing: false } },
];

function writeNewJson(filePath: string, value: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.tmp`;
  fs.writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  fs.renameSync(temporaryPath, filePath);
}

export function ensureRuntimeFiles() {
  const created: string[] = [];
  const invalid: string[] = [];

  for (const spec of runtimeFiles) {
    const filePath = path.resolve(process.cwd(), spec.relativePath);
    if (!fs.existsSync(filePath)) {
      let initialValue = spec.defaultValue;
      if (spec.templatePath) {
        const templatePath = path.resolve(process.cwd(), spec.templatePath);
        if (fs.existsSync(templatePath)) {
          initialValue = JSON.parse(fs.readFileSync(templatePath, "utf8"));
        }
      }
      writeNewJson(filePath, initialValue);
      created.push(spec.relativePath);
      continue;
    }

    try {
      JSON.parse(fs.readFileSync(filePath, "utf8"));
    } catch {
      // Une donnée live illisible n'est jamais remplacée silencieusement.
      invalid.push(spec.relativePath);
    }
  }

  if (created.length) log.info("RUNTIME", `Fichiers initialisés: ${created.join(", ")}`);
  if (invalid.length) {
    log.error("RUNTIME", `JSON invalide conservé pour récupération manuelle: ${invalid.join(", ")}`);
  }

  return { created, invalid };
}
