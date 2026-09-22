import { enforceStaff } from "../utils/permUtils.js";
import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, } from "discord.js";
import fs from "fs";
import path from "path";
import { writeJsonAtomic } from "../utils/jsonFiles.js";
const DATA_DIR = path.join(process.cwd(), "data");
const ROLES_PATH = path.join(DATA_DIR, "roles.json");
const MAP_PATH = path.join(DATA_DIR, "reaction-map.json");
function loadConfig() {
    const raw = fs.readFileSync(ROLES_PATH, "utf8");
    return JSON.parse(raw);
}
function readMap() {
    try {
        return JSON.parse(fs.readFileSync(MAP_PATH, "utf8"));
    }
    catch {
        return {};
    }
}
function saveMapMerge(partial) {
    const merged = { ...readMap(), ...partial };
    fs.mkdirSync(DATA_DIR, { recursive: true });
    writeJsonAtomic(MAP_PATH, merged);
}
function parseMessageId(input) {
    // Accepte ID pur ou lien https://discord.com/channels/guild/channel/message
    const link = input.match(/channels\/\d+\/\d+\/(\d+)/);
    return link ? link[1] : input;
}
export default {
    data: new SlashCommandBuilder()
        .setName("rolesbind")
        .setDMPermission(false)
        .setDescription("Lie les 3 messages (alertes/plateformes/jeux) au mapping des rôles")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(o => o.setName("alertes").setDescription("Lien ou ID du message Alertes").setRequired(true))
        .addStringOption(o => o.setName("plateformes").setDescription("Lien ou ID du message Plateformes").setRequired(true))
        .addStringOption(o => o.setName("jeux").setDescription("Lien ou ID du message Jeux").setRequired(true)),
    async execute(inter) {
        if (!(await enforceStaff(inter)))
            return;
        if (!inter.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
            return inter.reply({ content: "⚠️ Admin uniquement.", flags: MessageFlags.Ephemeral });
        }
        await inter.deferReply({ flags: MessageFlags.Ephemeral });
        try {
            const cfg = loadConfig();
            const idAlertes = parseMessageId(inter.options.getString("alertes", true));
            const idPlats = parseMessageId(inter.options.getString("plateformes", true));
            const idJeux = parseMessageId(inter.options.getString("jeux", true));
            const partial = {
                [idAlertes]: cfg.alertes.map(a => ({ emoji: a.emoji, roleId: a.id })),
                [idPlats]: cfg.plateformes.map(a => ({ emoji: a.emoji, roleId: a.id })),
                [idJeux]: cfg.jeux.map(a => ({ emoji: a.emoji, roleId: a.id })),
            };
            saveMapMerge(partial);
            console.log(`[ROLE] 📌 Panels liés : alertes=${idAlertes} • plateformes=${idPlats} • jeux=${idJeux}`);
            await inter.editReply("✅ Mapping mis à jour dans `data/reaction-map.json`.");
        }
        catch {
            await inter.editReply("❌ Impossible de binder (roles.json manquant ou invalide).");
        }
    }
};
