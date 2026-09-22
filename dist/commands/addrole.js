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
        .setName("addrole")
        .setDMPermission(false)
        .setDescription("Ajoute un rôle au panneau de réactions")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(o => o.setName("categorie")
        .setDescription("Catégorie cible")
        .addChoices({ name: "alertes", value: "alertes" }, { name: "plateformes", value: "plateformes" }, { name: "jeux", value: "jeux" })
        .setRequired(true))
        .addStringOption(o => o.setName("role_id")
        .setDescription("ID du rôle Discord")
        .setRequired(true))
        .addStringOption(o => o.setName("emoji")
        .setDescription("Emoji à utiliser pour la réaction")
        .setRequired(true))
        .addStringOption(o => o.setName("nom")
        .setDescription("Nom lisible du rôle")
        .setRequired(true))
        .addStringOption(o => o.setName("description")
        .setDescription("Description (optionnelle)")
        .setRequired(false))
        .addBooleanOption(o => o.setName("update")
        .setDescription("Publier/mettre à jour les panneaux après ajout ?")
        .setRequired(false)),
    async execute(interaction) {
        if (!(await enforceStaff(interaction)))
            return;
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const categorie = interaction.options.getString("categorie", true);
        const roleId = interaction.options.getString("role_id", true);
        const emoji = interaction.options.getString("emoji", true);
        const nom = interaction.options.getString("nom", true);
        const description = interaction.options.getString("description") || "—";
        const doUpdate = interaction.options.getBoolean("update") || false;
        if (!["alertes", "plateformes", "jeux"].includes(categorie)) {
            return interaction.editReply("❌ Catégorie invalide. Choisis parmi : `alertes`, `plateformes`, `jeux`");
        }
        let cfg;
        try {
            cfg = loadConfig();
        }
        catch (e) {
            return interaction.editReply(`❌ ${e?.message || "Impossible de lire roles.json"}`);
        }
        // Vérifier si déjà existant
        if (cfg[categorie].some(r => r.id === roleId)) {
            return interaction.editReply(`❌ Le rôle avec l'ID \`${roleId}\` existe déjà dans \`${categorie}\`.`);
        }
        cfg[categorie].push({
            id: roleId,
            name: nom,
            emoji,
            description
        });
        try {
            saveConfig(cfg);
        }
        catch (e) {
            return interaction.editReply(`❌ Échec de sauvegarde: ${e?.message || "inconnu"}`);
        }
        await interaction.editReply(`✅ Rôle **${nom}** ajouté à la catégorie \`${categorie}\`.`);
        // Mise à jour des panneaux si demandé
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
                    content: `⚠️ Rôle ajouté, mais la mise à jour des panneaux a échoué : ${e?.message || "erreur inconnue"}`,
                    flags: MessageFlags.Ephemeral
                });
            }
        }
    }
};
