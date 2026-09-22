import fs from "node:fs";
import path from "node:path";
import { ZipArchive } from "archiver";
const root = process.cwd();
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const outputDirectory = path.join(root, "release");
const outputPath = path.join(outputDirectory, `le-tavernier-sparked-v${packageJson.version}.zip`);
const temporaryOutputPath = `${outputPath}.tmp`;
const ignored = [
    ".git",
    ".git/**",
    ".npm/**",
    "node_modules/**",
    "release/**",
    "*.zip",
    "*.log",
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
    "dist/data/anniv-cache.json",
    "dist/data/giveaways.json",
    "dist/data/last_posts.json",
    "dist/data/last_youtube.json",
    "dist/data/twitch_clips_state.json",
    "dist/data/presenter.json",
    "dist/data/reaction-map.json",
    "dist/data/roles.json",
    "dist/data/tavernier_state.json",
    "last_tweet.json",
];
async function main() {
    if (!fs.existsSync(path.join(root, "dist", "index.js"))) {
        throw new Error("dist/index.js absent. Lancer npm run build avant de créer l'archive.");
    }
    fs.mkdirSync(outputDirectory, { recursive: true });
    if (fs.existsSync(temporaryOutputPath))
        fs.rmSync(temporaryOutputPath);
    const output = fs.createWriteStream(temporaryOutputPath);
    const archive = new ZipArchive({ zlib: { level: 9 } });
    archive.pipe(output);
    archive.glob("**/*", { cwd: root, dot: true, ignore: ignored });
    const outputClosed = new Promise((resolve, reject) => {
        output.on("close", resolve);
        output.on("error", reject);
        archive.on("warning", error => error.code === "ENOENT" ? console.warn(error.message) : reject(error));
        archive.on("error", reject);
    });
    await archive.finalize();
    await outputClosed;
    if (fs.existsSync(outputPath))
        fs.rmSync(outputPath);
    fs.renameSync(temporaryOutputPath, outputPath);
    console.log(`Archive Sparked créée: ${outputPath} (${archive.pointer()} octets)`);
}
main().catch(error => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
});
