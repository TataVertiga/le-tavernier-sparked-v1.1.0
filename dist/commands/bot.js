import { SlashCommandBuilder, MessageFlags, } from "discord.js";
import { getState, setState } from "../state/tavernierState.js";
import { serviceStatusLines } from "../core/config.js";
import { enforceStaff } from "../utils/permUtils.js";
function formatUptime(totalSeconds) {
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return [days ? `${days}j` : "", hours ? `${hours}h` : "", `${minutes}min`].filter(Boolean).join(" ");
}
export const data = new SlashCommandBuilder()
    .setName("bot")
    .setDescription("Admin: ON/OFF et gestion de pause des publications.")
    .addSubcommand(s => s.setName("on").setDescription("Réactive les réponses, réactions et publications.")
    .addStringOption(o => o.setName("raison").setDescription("Note interne").setRequired(false)))
    .addSubcommand(s => s.setName("off").setDescription("Coupe les réponses, réactions et publications.")
    .addStringOption(o => o.setName("raison").setDescription("Note interne").setRequired(false)))
    .addSubcommand(s => s.setName("pause").setDescription("Met les publications automatiques en pause.")
    .addStringOption(o => o.setName("raison").setDescription("Note interne").setRequired(false)))
    .addSubcommand(s => s.setName("resume").setDescription("Relance publications auto.")
    .addStringOption(o => o.setName("raison").setDescription("Note interne").setRequired(false)))
    .addSubcommand(s => s.setName("mute").setDescription("Coupe les réponses et réactions (publications actives).")
    .addStringOption(o => o.setName("raison").setDescription("Note interne").setRequired(false)))
    .addSubcommand(s => s.setName("unmute").setDescription("Réactive les réponses et réactions.")
    .addStringOption(o => o.setName("raison").setDescription("Note interne").setRequired(false)))
    .addSubcommand(s => s.setName("reason").setDescription("Met à jour la raison affichée.")
    .addStringOption(o => o.setName("raison").setDescription("Texte").setRequired(true)))
    .addSubcommand(s => s.setName("status").setDescription("Affiche l'état actuel."))
    .setDMPermission(false);
export async function execute(i) {
    if (!(await enforceStaff(i)))
        return;
    const sub = i.options.getSubcommand();
    const who = `${i.user.tag} (${i.user.id})`;
    const reason = i.options.getString("raison") ?? undefined;
    let state = getState();
    switch (sub) {
        case "on":
            state = setState({ mute: false, pausePublishing: false, reason, updatedBy: who });
            await i.reply({ content: "✅ **ON** — Réponses, réactions et publications actives.", flags: MessageFlags.Ephemeral });
            break;
        case "off":
            state = setState({ mute: true, pausePublishing: true, reason, updatedBy: who });
            await i.reply({ content: "🛑 **OFF** — Réponses et réactions coupées, publications en pause.", flags: MessageFlags.Ephemeral });
            break;
        case "pause":
            state = setState({ pausePublishing: true, reason, updatedBy: who });
            await i.reply({ content: "⏸️ **Publications** mises en pause.", flags: MessageFlags.Ephemeral });
            break;
        case "resume":
            state = setState({ pausePublishing: false, reason, updatedBy: who });
            await i.reply({ content: "▶️ **Publications** relancées.", flags: MessageFlags.Ephemeral });
            break;
        case "mute":
            state = setState({ mute: true, reason, updatedBy: who });
            await i.reply({ content: "🔇 **Réponses et réactions coupées** — Les publications restent actives.", flags: MessageFlags.Ephemeral });
            break;
        case "unmute":
            state = setState({ mute: false, reason, updatedBy: who });
            await i.reply({ content: "🔊 **Réponses et réactions réactivées**.", flags: MessageFlags.Ephemeral });
            break;
        case "reason":
            state = setState({ reason, updatedBy: who });
            await i.reply({ content: "📝 **Raison** mise à jour.", flags: MessageFlags.Ephemeral });
            break;
        case "status":
            state = getState();
            const services = serviceStatusLines().join("\n");
            await i.reply({
                flags: MessageFlags.Ephemeral,
                content: `📊 **Statut bot**\n` +
                    `• Réponses et réactions: ${state.mute ? "🔇 coupées" : "🔊 actives"}\n` +
                    `• Publications auto: ${state.pausePublishing ? "⏸️ en pause" : "▶️ actives"}\n` +
                    `• Runtime: Node ${process.versions.node} — actif depuis ${formatUptime(process.uptime())}\n` +
                    (state.reason ? `• Raison: _${state.reason}_\n` : "") +
                    (state.updatedBy ? `• Modifié par: ${state.updatedBy}\n` : "") +
                    (state.updatedAt ? `• Le: <t:${Math.floor(state.updatedAt / 1000)}:f>\n` : "") +
                    `\n**Services**\n${services}`
            });
            break;
        default:
            await i.reply({ content: "🤷 Sous-commande inconnue.", flags: MessageFlags.Ephemeral });
    }
}
export default { data, execute };
