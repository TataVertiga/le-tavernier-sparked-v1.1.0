import { enforceStaff } from "../utils/permUtils.js";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, EmbedBuilder, MessageFlags, SlashCommandBuilder, TextChannel } from "discord.js";
import { discordIds } from "../core/config.js";
import { loadGiveaways, saveGiveaways } from "../services/giveawayStore.js";

// ⚙️ Config
const GIVEAWAY_CHANNEL_ID = discordIds.giveawayChannel;

// --- Helpers ---
export function parseDuration(str: string) {
  const match = str.match(/^(\d+)([smhd])$/i);
  if (!match) return null;
  const num = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000
  };
  return num * multipliers[unit];
}

import { getChopeBar } from "../utils/giveawayUI.js";

export default {
  data: new SlashCommandBuilder()
    .setName("giveaway")
  .setDMPermission(false)
    .setDescription("Lance ou annule un giveaway RP")
    .addSubcommand(sc =>
      sc.setName("start")
        .setDescription("Lancer un nouveau giveaway")
        .addStringOption(o =>
          o.setName("durée")
            .setDescription("Ex: 5m, 1h, 2d (s/m/h/d)")
            .setRequired(true))
        .addStringOption(o =>
          o.setName("récompense")
            .setDescription("Ex: Un bon d'achat Steam")
            .setRequired(false)))
    .addSubcommand(sc =>
      sc.setName("cancel")
        .setDescription("Annuler le dernier giveaway en cours")),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!(await enforceStaff(interaction))) return;

    const sub = interaction.options.getSubcommand();

    // --- /giveaway cancel
    if (sub === "cancel") {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const data = loadGiveaways();
      const activeId = Object.keys(data)[0];
      if (!activeId) {
        return interaction.editReply("🍺 Aucun giveaway en cours, gueux.");
      }
      delete data[activeId];
      saveGiveaways(data, true);
      console.log(`[GIVEAWAY] Annulé manuellement (ID: ${activeId}, par: @${interaction.user.username})`);
      return interaction.editReply("❌ Giveaway annulé, tout le monde rentre chez soi !");
    }

    // --- /giveaway start
    if (sub === "start") {
      const rawDuration = interaction.options.getString("durée", true).trim();
      const duration = parseDuration(rawDuration);

      if (!duration) {
        return interaction.reply({
          content:
            "⛔ Durée invalide !\n" +
            "Exemples valides : `5m`, `1h`, `2d`\n" +
            "Unités : `s` = secondes, `m` = minutes, `h` = heures, `d` = jours",
          flags: MessageFlags.Ephemeral
        });
      }

      const reward = (interaction.options.getString("récompense") || "À toi de voir tavernier").trim();

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const endTime = Date.now() + duration;
      const giveawayId = Date.now().toString();

      const { bar, message: rp } = getChopeBar(0);

      const embed = new EmbedBuilder()
        .setColor(0xdaa520)
        .setTitle("🏆 Giveaway de la Taverne !")
        .setDescription(`🎁 **Récompense** : ${reward}  
🍺 **Participants** : ${bar} (0)  
*${rp}*  

📅 Fin <t:${Math.floor(endTime / 1000)}:R>`)
        .setFooter({ text: "Clique sur la chope pour participer !" });

      const button = new ButtonBuilder()
        .setCustomId(`giveaway_join_${giveawayId}`)
        .setLabel("🍺 Participer")
        .setStyle(ButtonStyle.Success);

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

      const channel = interaction.client.channels.cache.get(GIVEAWAY_CHANNEL_ID) as TextChannel | undefined;
      if (!channel) {
        return interaction.editReply("❌ Salon du giveaway introuvable. Vérifie `GIVEAWAY_CHANNEL_ID`.");
      }

      const msg = await channel.send({
        content: `🍻 **Un giveaway est lancé !** 🍻`,
        embeds: [embed],
        components: [row]
      });

      const data = loadGiveaways();
      data[giveawayId] = {
        messageId: msg.id,
        channelId: GIVEAWAY_CHANNEL_ID,
        endTime,
        participants: [],
        description: `🎁 **Récompense** : ${reward}`
      };
      saveGiveaways(data, true);

      console.log(`[GIVEAWAY] Nouveau lancé (ID: ${giveawayId}, fin: ${new Date(endTime).toLocaleString()}, salon: #${GIVEAWAY_CHANNEL_ID}, récompense: ${reward})`);
      return interaction.editReply("✅ Giveaway lancé, gueux !");
    }

    // fallback
    return interaction.reply({ content: "❌ Sous-commande inconnue.", flags: MessageFlags.Ephemeral });
  }
};
