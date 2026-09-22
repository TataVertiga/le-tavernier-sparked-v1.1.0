import fs from "fs";
import path from "path";
import { ZipArchive } from "archiver";

/**
 * Génère le zip "propre" du bot (sans node_modules, dist, .git, etc.)
 * Sortie : ./le-tavernier-bot-clean.zip
 */
async function main() {
  const outputPath = path.join(process.cwd(), "le-tavernier-bot-clean.zip");
  const temporaryOutputPath = `${outputPath}.tmp`;

  if (fs.existsSync(temporaryOutputPath)) fs.rmSync(temporaryOutputPath);

  const output = fs.createWriteStream(temporaryOutputPath);
  const archive = new ZipArchive({ zlib: { level: 9 } });

  const outputClosed = new Promise<void>((resolve, reject) => {
    output.on("close", resolve);
    output.on("error", reject);
    archive.on("warning", error => error.code === "ENOENT" ? console.warn(error.message) : reject(error));
    archive.on("error", reject);
  });

  archive.pipe(output);

  // Dossiers/fichiers à exclure pour que ce soit léger et safe
  const excludes = [
    "node_modules/**",
    "dist/**",
    ".git/**",
    ".github/**",
    ".vscode/**",
    ".idea/**",
    "**/.DS_Store",
    "**/Thumbs.db",
    "*.log",
    "*.zip.tmp",
    "npm-debug.log*",
    "yarn-error.log*",
    // secrets / fichiers sensibles
    ".env",
    ".env.local",
    ".env.*.local",
    "*.pem",
    "*.key",
    "data/backups/**",
    "data/credentials.json",
    "data/giveaways.json",
    "data/last_posts.json",
    "data/last_youtube.json",
    "data/twitch_clips_state.json",
    "data/anniv-cache.json",
    "data/presenter.json",
    "data/reaction-map.json",
    "data/roles.json",
    "data/tavernier_state.json",
    "last_tweet.json",
  ];

  // On zippe tout sauf les exclusions ci-dessus
  archive.glob("**/*", { ignore: excludes });

  await archive.finalize();
  await outputClosed;

  if (fs.existsSync(outputPath)) fs.rmSync(outputPath);
  fs.renameSync(temporaryOutputPath, outputPath);
  console.log(`✅ Archive générée : ${outputPath} (${archive.pointer()} octets)`);
}

main().catch((e: unknown) => {
  if (e instanceof Error) {
    console.error("💥 Erreur pack:", e.message);
  } else {
    console.error("💥 Erreur pack (non-Error):", e);
  }
  process.exit(1);
});
