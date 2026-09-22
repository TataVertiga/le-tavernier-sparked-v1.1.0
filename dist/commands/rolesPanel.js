import { enforceStaff } from "../utils/permUtils.js";
// commands/rolesPanel.ts
import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType, MessageFlags } from "discord.js";
import fs from "fs";
import path from "path";
import { writeJsonAtomic } from "../utils/jsonFiles.js";
// ✅ Utilise process.cwd() pour éviter les soucis après build
const DATA_DIR = path.join(process.cwd(), "data");
const ROLES_PATH = path.join(DATA_DIR, "roles.json");
const MAP_PATH = path.join(DATA_DIR, "reaction-map.json");
function loadConfig() {
    if (!fs.existsSync(ROLES_PATH)) {
        throw new Error(`roles.json introuvable : ${ROLES_PATH}`);
    }
    const raw = fs.readFileSync(ROLES_PATH, "utf8").trim();
    return JSON.parse(raw);
}
function readMap() {
    try {
        if (!fs.existsSync(MAP_PATH))
            return {};
        const raw = fs.readFileSync(MAP_PATH, "utf8").trim();
        return raw ? JSON.parse(raw) : {};
    }
    catch {
        return {};
    }
}
function saveMapMerge(partial) {
    const current = readMap();
    const merged = { ...current, ...partial };
    if (!fs.existsSync(DATA_DIR))
        fs.mkdirSync(DATA_DIR, { recursive: true });
    writeJsonAtomic(MAP_PATH, merged);
}
function makeEmbed(title, emojiTitre, items) {
    const desc = items
        .map(i => `${i.emoji} **${i.name}**\n> ${i.description ?? "—"}`)
        .join("\n");
    return new EmbedBuilder()
        .setTitle(`${emojiTitre} ${title}`)
        .setDescription(`Réagis avec les émojis pour obtenir ou retirer un rôle.\n\n${desc}\n\n` +
        `_Retire ta réaction pour enlever le rôle._`)
        .setColor(0x8B5A2B)
        .setFooter({ text: "⚔ Le Tavernier – Maître des rôles ⚔" });
}
async function addReactionsSequential(message, emojis) {
    for (const e of emojis) {
        try {
            await message.react(e);
        }
        catch (err) {
            console.warn(`[ROLES] ⚠️ Impossible de réagir avec "${e}"`, err);
        }
        // petit délai pour éviter les rate limits / cache discord
        await new Promise(r => setTimeout(r, 500));
    }
}
export async function publishRolePanels(target) {
    const cfg = loadConfig();
    const mapPartial = {};
    const panels = [
        { title: "Alertes de la Taverne", icon: "📯", items: cfg.alertes },
        { title: "Plateformes de jeu", icon: "🛡", items: cfg.plateformes },
        { title: "Jeux joués", icon: "🎲", items: cfg.jeux },
    ];
    for (const panel of panels) {
        const message = await target.send({ embeds: [makeEmbed(panel.title, panel.icon, panel.items)] });
        await addReactionsSequential(message, panel.items.map(item => item.emoji));
        mapPartial[message.id] = panel.items.map(item => ({ emoji: item.emoji, roleId: item.id }));
    }
    saveMapMerge(mapPartial);
    return Object.keys(mapPartial);
}
export default {
    data: new SlashCommandBuilder()
        .setName("rolespanel")
        .setDMPermission(false)
        .setDescription("Publie ou met à jour les panneaux de rôles (réactions)")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addChannelOption(opt => opt
        .setName("salon")
        .setDescription("Salon où publier les panneaux (par défaut: ici)")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)),
    async execute(interaction) {
        if (!(await enforceStaff(interaction)))
            return;
        // Vérif permission côté runtime
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const target = (interaction.options.getChannel("salon") || interaction.channel);
        if (!target || target.type !== ChannelType.GuildText) {
            return interaction.editReply("❌ Salon invalide. Choisis un salon texte de la guilde.");
        }
        try {
            await publishRolePanels(target);
        }
        catch (e) {
            return interaction.editReply(`❌ ${e?.message || "Impossible de publier les panneaux"}`);
        }
        await interaction.editReply(`✅ Panneaux publiés dans <#${target.id}> et mappage **fusionné** dans \`data/reaction-map.json\`.`);
    }
};
