// commands/ping.ts
import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  MessageFlags,
} from "discord.js";
import { enforceStaff } from "../utils/permUtils.js";

export const data = new SlashCommandBuilder()
  .setName("ping")
  .setDescription("Appelle tous les gueux à l'auberge.")
  .setDMPermission(false);

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!(await enforceStaff(interaction))) return;

  // Récupère le rôle "Gueux"
  const role = interaction.guild?.roles.cache.find(r => r.name.toLowerCase() === "gueux");

  if (!role) {
    return interaction.reply({
      content: "Impossible de trouver le rôle **Gueux** dans cette taverne.",
      flags: MessageFlags.Ephemeral,
    });
  }

  // Ping du rôle
  await interaction.reply({
    content: `${role} 🍺 *Il se trame un truc par ici les gueux !*`,
    allowedMentions: { roles: [role.id] },
  });
}

export default { data, execute };
