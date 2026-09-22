import { SlashCommandBuilder, MessageFlags, EmbedBuilder, PermissionFlagsBits, } from "discord.js";
import { normalizeClipThumbnail } from "../services/twitchClips.js";
import { enforceStaff } from "../utils/permUtils.js";
async function getTwitchAppToken() {
    const clientId = process.env.TWITCH_CLIENT_ID;
    const clientSecret = process.env.TWITCH_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
        throw new Error('TWITCH_CLIENT_ID / TWITCH_CLIENT_SECRET manquants dans .env');
    }
    const url = new URL('https://id.twitch.tv/oauth2/token');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('client_secret', clientSecret);
    url.searchParams.set('grant_type', 'client_credentials');
    const res = await fetch(url, { method: "POST", signal: AbortSignal.timeout(15_000) });
    if (!res.ok)
        throw new Error(`Token Twitch HTTP ${res.status}`);
    const data = await res.json();
    return data.access_token;
}
async function getBroadcasterId(login, appToken) {
    const clientId = process.env.TWITCH_CLIENT_ID;
    const u = new URL('https://api.twitch.tv/helix/users');
    u.searchParams.set('login', login);
    const res = await fetch(u, {
        signal: AbortSignal.timeout(15_000),
        headers: { 'Client-ID': clientId, 'Authorization': `Bearer ${appToken}` },
    });
    if (!res.ok)
        throw new Error(`users?login=… HTTP ${res.status}`);
    const json = await res.json();
    const user = json.data?.[0];
    if (!user)
        throw new Error(`Utilisateur Twitch introuvable: ${login}`);
    return user.id;
}
async function fetchLatestClip(hours = 6) {
    const login = process.env.TWITCH_USERNAME;
    if (!login)
        throw new Error('TWITCH_USERNAME manquant dans .env');
    const appToken = await getTwitchAppToken();
    const broadcasterId = await getBroadcasterId(login, appToken);
    const clientId = process.env.TWITCH_CLIENT_ID;
    const now = new Date();
    const since = new Date(now.getTime() - hours * 3600 * 1000);
    const u = new URL('https://api.twitch.tv/helix/clips');
    u.searchParams.set('broadcaster_id', broadcasterId);
    u.searchParams.set('started_at', since.toISOString());
    u.searchParams.set('ended_at', now.toISOString());
    u.searchParams.set('first', '100');
    const res = await fetch(u, {
        signal: AbortSignal.timeout(15_000),
        headers: { 'Client-ID': clientId, 'Authorization': `Bearer ${appToken}` },
    });
    if (!res.ok)
        throw new Error(`helix/clips HTTP ${res.status}`);
    const json = await res.json();
    if (!json.data?.length)
        return null;
    const sorted = json.data.slice().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return sorted[0] ?? null;
}
function clipToEmbed(clip) {
    const thumb = normalizeClipThumbnail(clip.thumbnail_url, 1280, 720) || undefined;
    return new EmbedBuilder()
        .setTitle(`🎬 ${clip.title || 'Nouveau clip'}`)
        .setURL(clip.url)
        .setImage(thumb || null)
        .setDescription(`Par **${clip.creator_name}** — ${new Date(clip.created_at).toLocaleString('fr-FR')}`)
        .addFields({ name: '👀 Vues', value: String(clip.view_count ?? 0), inline: true }, { name: '⏱️ Durée', value: `${clip.duration?.toFixed(1) ?? '?'}s`, inline: true })
        .setFooter({ text: 'Le Tavernier • Twitch' });
}
export default {
    data: new SlashCommandBuilder()
        .setName('testclip')
        .setDescription('Forcer l’envoi du dernier clip Twitch (fenêtre par défaut 6h)')
        .setDMPermission(false)
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addIntegerOption(opt => opt.setName('hours')
        .setDescription('Fenêtre en heures (1–72). Défaut: 6')
        .setMinValue(1)
        .setMaxValue(72)),
    async execute(interaction) {
        if (!(await enforceStaff(interaction)))
            return;
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const hours = interaction.options.getInteger('hours') ?? 6;
        try {
            const clip = await fetchLatestClip(hours);
            if (!clip) {
                await interaction.editReply({ content: `😕 Aucun clip trouvé (dernières ${hours}h).` });
                return;
            }
            const embed = clipToEmbed(clip);
            await interaction.editReply({ content: '✅ Clip récupéré :', embeds: [embed] });
        }
        catch (err) {
            console.error('[TESTCLIP]', err);
            await interaction.editReply({ content: '⚠️ Erreur lors de la récupération du clip Twitch.' });
        }
    },
};
