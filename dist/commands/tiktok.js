// commands/tiktok.ts
import { SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags, } from "discord.js";
import { fetchTikTokOEmbed } from "../services/tiktok.js";
import { buildTikTokEmbed, buildTikTokButtons } from "../utils/embedTemplates.js";
function randomTikTokRP(roleId) {
    const ping = roleId ? `<@&${roleId}> ` : "";
    const lines = [
        `${ping}🕺 Un gueux vient d’esquisser quelques pas honteux !`,
        `${ping}🍷 La piste est poisseuse et la danse… discutable. Viens juger !`,
        `${ping}📯 À la Taverne, même les talons compensés n’y survivent pas !`,
    ];
    return lines[Math.floor(Math.random() * lines.length)];
}
export const data = new SlashCommandBuilder()
    .setName("tiktok")
    .setDescription("Publie un joli embed TikTok à partir d’un lien (admin seulement).")
    .addStringOption(o => o.setName("url")
    .setDescription("Lien de la vidéo TikTok")
    .setRequired(true))
    .addChannelOption(o => o.setName("salon")
    .setDescription("Salon où publier (par défaut: ici)")
    .addChannelTypes(ChannelType.GuildText))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false);
export async function execute(interaction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({
            content: "⛔ Cette commande est réservée aux administrateurs.",
            flags: MessageFlags.Ephemeral,
        });
    }
    const url = interaction.options.getString("url", true).trim();
    const targetChannel = (interaction.options.getChannel("salon") ?? interaction.channel);
    if (!targetChannel || targetChannel.type !== ChannelType.GuildText) {
        return interaction.reply({
            content: "Salon invalide.",
            flags: MessageFlags.Ephemeral,
        });
    }
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    try {
        const { url: finalUrl, meta } = await fetchTikTokOEmbed(url);
        const embed = buildTikTokEmbed({
            videoUrl: finalUrl,
            authorName: meta?.author_name,
            authorUrl: meta?.author_url,
            title: meta?.title,
            thumbUrl: meta?.thumbnail_url,
        });
        const row = buildTikTokButtons(finalUrl, meta?.author_name, meta?.author_url);
        // 🔔 Ping rôle TikTok (si défini) + message RP
        const roleId = process.env.TIKTOK_ROLE_ID || null;
        const content = randomTikTokRP(roleId);
        await targetChannel.send({
            content,
            embeds: [embed],
            components: [row],
            allowedMentions: roleId ? { roles: [roleId] } : { parse: [] },
        });
        return interaction.editReply(`✅ Vidéo TikTok postée dans ${targetChannel}`);
    }
    catch (err) {
        console.error("[/tiktok] error:", err);
        return interaction.editReply("❌ Impossible de récupérer les infos TikTok. Vérifie l’URL et réessaye.");
    }
}
export default { data, execute };
