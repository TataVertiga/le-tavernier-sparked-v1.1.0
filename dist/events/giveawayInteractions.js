// events/giveawayInteractions.ts
import { EmbedBuilder, Events, MessageFlags } from "discord.js";
import { getChopeBar } from "../utils/giveawayUI.js";
import { loadGiveaways, saveGiveaways } from "../services/giveawayStore.js";
export default function registerGiveawayInteractions(client) {
    client.on(Events.InteractionCreate, async (interaction) => {
        // 📌 Bouton de participation au giveaway
        if (!interaction.isButton())
            return;
        if (!interaction.customId.startsWith("giveaway_join_"))
            return;
        const giveawayId = interaction.customId.replace("giveaway_join_", "");
        let data;
        try {
            data = loadGiveaways();
        }
        catch (error) {
            console.error("[GIVEAWAY] Lecture impossible:", error);
            return interaction.reply({ content: "❌ Les données du giveaway sont momentanément indisponibles.", flags: MessageFlags.Ephemeral });
        }
        const giveaway = data[giveawayId];
        if (!giveaway) {
            return interaction.reply({ content: "⛔ Giveaway introuvable.", flags: MessageFlags.Ephemeral });
        }
        if (Date.now() >= giveaway.endTime) {
            return interaction.reply({ content: "⏳ Ce giveaway vient de se terminer.", flags: MessageFlags.Ephemeral });
        }
        // 🚫 Anti double-participation
        if (Array.isArray(giveaway.participants) && giveaway.participants.includes(interaction.user.id)) {
            return interaction.reply({
                content: "🍺 T'as déjà vidé ta chope, laisse-en aux autres !",
                flags: MessageFlags.Ephemeral
            });
        }
        // ➕ Ajoute le joueur (on assure l'array)
        giveaway.participants = Array.isArray(giveaway.participants) ? giveaway.participants : [];
        giveaway.participants.push(interaction.user.id);
        try {
            saveGiveaways(data);
        }
        catch (error) {
            console.error("[GIVEAWAY] Sauvegarde impossible:", error);
            return interaction.reply({ content: "❌ Impossible d’enregistrer ta participation.", flags: MessageFlags.Ephemeral });
        }
        // 🔄 Met à jour l’embed avec la nouvelle chope
        const { bar, message: rp } = getChopeBar(giveaway.participants.length);
        // ✅ Vérifie que le salon est textuel
        if (!interaction.channel?.isTextBased()) {
            return interaction.reply({
                content: "⚠️ Impossible de mettre à jour le message du giveaway dans ce salon.",
                flags: MessageFlags.Ephemeral
            });
        }
        const channel = interaction.channel;
        const msg = await channel.messages.fetch(giveaway.messageId).catch(() => null);
        if (!msg) {
            return interaction.reply({
                content: "⚠️ Message du giveaway introuvable.",
                flags: MessageFlags.Ephemeral
            });
        }
        const embed = msg.embeds[0];
        if (!embed) {
            return interaction.reply({ content: "⚠️ Le message du giveaway est incomplet.", flags: MessageFlags.Ephemeral });
        }
        const rewardLine = giveaway.description || "🎁 **Récompense** : À toi de voir tavernier";
        const newEmbed = EmbedBuilder.from(embed).setDescription(`${rewardLine}
🍺 **Participants** : ${bar} (${giveaway.participants.length})
*${rp}*

📅 Fin <t:${Math.floor(giveaway.endTime / 1000)}:R>`);
        await msg.edit({ embeds: [newEmbed] });
        // ✅ Confirme au joueur
        await interaction.reply({
            content: "🍻 Participation validée ! Bonne chance, gueux !",
            flags: MessageFlags.Ephemeral
        });
    });
}
