import { enforceStaff } from "../utils/permUtils.js";
import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from "discord.js";
import fs from "fs";
import path from "path";
import { writeJsonAtomic } from "../utils/jsonFiles.js";
const DATA_DIR = path.join(process.cwd(), "data");
const BACKUPS = path.join(DATA_DIR, "backups");
const MAIN = path.join(DATA_DIR, "giveaways.json");
export default {
    data: new SlashCommandBuilder()
        .setName("restoregiveaway")
        .setDMPermission(false)
        .setDescription("Restaure le dernier backup de data/giveaways.json")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        if (!(await enforceStaff(interaction)))
            return;
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        try {
            if (!fs.existsSync(BACKUPS)) {
                return interaction.editReply("⚠️ Aucun dossier de backup trouvé (`data/backups`).");
            }
            const files = fs
                .readdirSync(BACKUPS)
                .filter(f => f.endsWith(".json"))
                .map(f => ({ f, t: fs.statSync(path.join(BACKUPS, f)).mtime.getTime() }))
                .sort((a, b) => b.t - a.t);
            if (files.length === 0) {
                return interaction.editReply("⚠️ Aucun backup trouvé dans `data/backups`.");
            }
            const latest = files[0].f;
            // S'assurer que data/ existe
            if (!fs.existsSync(DATA_DIR))
                fs.mkdirSync(DATA_DIR, { recursive: true });
            const backupData = JSON.parse(fs.readFileSync(path.join(BACKUPS, latest), "utf8"));
            writeJsonAtomic(MAIN, backupData);
            await interaction.editReply(`✅ Backup restauré : **${latest}** → \`data/giveaways.json\``);
            console.log(`[GIVEAWAY] Restauration -> ${latest}`);
        }
        catch (err) {
            console.error("[GIVEAWAY] Erreur :", err);
            await interaction.editReply("❌ Erreur lors de la restauration.");
        }
    }
};
