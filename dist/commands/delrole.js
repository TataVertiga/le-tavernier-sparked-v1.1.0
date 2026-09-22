import { enforceStaff } from "../utils/permUtils.js";
import { SlashCommandBuilder, ChannelType, PermissionFlagsBits, MessageFlags } from "discord.js";
import fs from "fs";
import path from "path";
import { writeJsonAtomic } from "../utils/jsonFiles.js";
const DATA_DIR = path.join(process.cwd(), "data");
const ROLES_PATH = path.join(DATA_DIR, "roles.json");
function ensureDataDir() {
    if (!fs.existsSync(DATA_DIR))
        fs.mkdirSync(DATA_DIR, { recursive: true });
}
function loadConfig() {
    ensureDataDir();
    if (!fs.existsSync(ROLES_PATH))
        throw new Error("roles.json introuvable !");
    return JSON.parse(fs.readFileSync(ROLES_PATH, "utf8"));
}
function saveConfig(cfg) {
    ensureDataDir();
    writeJsonAtomic(ROLES_PATH, cfg);
}
export default {
    data: new SlashCommandBuilder()
        .setName("delrole")
        .setDMPermission(false)
        .setDescription("Supprime un rôle du panneau de réactions")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(o => o.setName("nom")
        .setDescription("Nom exact (ou approximatif) du rôle à supprimer")
        .setRequired(true))
        .addStringOption(o => o.setName("categorie")
        .setDescription("Limiter à une catégorie")
        .addChoices({ name: "alertes", value: "alertes" }, { name: "plateformes", value: "plateformes" }, { name: "jeux", value: "jeux" })
        .setRequired(false))
        .addBooleanOption(o => o.setName("update")
        .setDescription("Publier/mettre à jour les panneaux après suppression ?")
        .setRequired(false)),
    async execute(interaction) {
        if (!(await enforceStaff(interaction)))
            return;
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const nameQuery = interaction.options.getString("nom", true).toLowerCase();
        const scope = interaction.options.getString("categorie");
        const doUpdate = interaction.options.getBoolean("update") || false;
        let cfg;
        try {
            cfg = loadConfig();
        }
        catch (e) {
            return interaction.editReply(`❌ ${e?.message || "Impossible de lire roles.json"}`);
        }
        const keys = scope ? [scope] : ["alertes", "plateformes", "jeux"];
        let totalRemoved = 0;
        const details = [];
        for (const key of keys) {
            const before = cfg[key].length;
            // suppression par nom insensible à la casse (exact ou proche)
            cfg[key] = cfg[key].filter(r => r.name.toLowerCase() !== nameQuery);
            const removed = before - cfg[key].length;
            if (removed > 0) {
                totalRemoved += removed;
                details.push(`• \`${key}\` : ${removed} supprimé(s)`);
            }
        }
        if (totalRemoved === 0) {
            return interaction.editReply(`❌ Aucun rôle nommé **${nameQuery}** trouvé${scope ? ` dans \`${scope}\`` : ""}.`);
        }
        try {
            saveConfig(cfg);
        }
        catch (e) {
            return interaction.editReply(`❌ Échec de sauvegarde: ${e?.message || "inconnu"}`);
        }
        await interaction.editReply(`✅ Rôle **${nameQuery}** retiré de la configuration.\n` +
            (details.length ? details.join("\n") : ""));
        if (doUpdate) {
            try {
                if (!interaction.channel || interaction.channel.type !== ChannelType.GuildText) {
                    throw new Error("salon courant non textuel");
                }
                const { publishRolePanels } = await import("./rolesPanel.js");
                await publishRolePanels(interaction.channel);
                await interaction.followUp({ content: "✅ Panneaux republiés dans ce salon.", flags: MessageFlags.Ephemeral });
            }
            catch (e) {
                await interaction.followUp({
                    content: `⚠️ Suppression OK, mais la mise à jour des panneaux a échoué : ${e?.message || "erreur inconnue"}`,
                    flags: MessageFlags.Ephemeral
                });
            }
        }
    }
};
