import { PermissionsBitField, MessageFlags } from "discord.js";
import { discordIds } from "../core/config.js";
export const ADMIN_ROLE_ID = discordIds.adminRole;
export function isStaff(member) {
    return (member.permissions.has(PermissionsBitField.Flags.Administrator) ||
        (ADMIN_ROLE_ID && member.roles.cache.has(ADMIN_ROLE_ID)));
}
export async function enforceStaff(interaction) {
    const member = interaction.member;
    if (!member || !isStaff(member)) {
        // 🔎 Log clair quand quelqu'un est bloqué
        const where = interaction.guild?.id ? `guild=${interaction.guild.id} channel=${interaction.channelId}` : "DM";
        console.warn(`[PERMS] ⛔ Refus /${interaction.commandName} par ${interaction.user.tag} (${interaction.user.id}) | ${where}`);
        await interaction.reply({ content: "⛔ Commande réservée au staff.", flags: MessageFlags.Ephemeral });
        return false;
    }
    return true;
}
export function printPermsConfig() {
    const roleInfo = ADMIN_ROLE_ID ? ADMIN_ROLE_ID : "∅ (non défini)";
    console.log(`[PERMS] ADMIN_ROLE_ID = ${roleInfo} | Fallback Admin = ON`);
}
