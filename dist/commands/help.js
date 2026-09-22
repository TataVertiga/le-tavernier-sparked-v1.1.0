import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from "discord.js";
export default {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Affiche la carte du Tavernier'),
    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setColor(0x9b59b6)
            .setTitle("🍺 La Carte du Tavernier")
            .setDescription("Voici les commandes que tu peux brailler dans la taverne :")
            .addFields({ name: "📜 `/help`", value: "→ Affiche ce menu, abruti." }, { name: "🧠 `/douzinite`", value: "→ Analyse si t’as pas causé avec ton fondement." }, { name: "💨 `/prout`", value: "→ Lâche un pet... sonore." }, { name: "👋 `/bonjour`", value: "→ Souhaite la bienvenue à ta façon, gueux." }, { name: "🎂 `/anniv`", value: "→ Gère les anniversaires dans la Taverne." }, { name: "🔔 Mention Tavernier", value: "→ Ose me ping et j’te répondrai comme il se doit..." }, { name: "🧪 À venir", value: "C'est un secret... pour l'instant." })
            .setFooter({
            text: "Le Tavernier • T'as soif ? Moi aussi.",
            iconURL: interaction.client.user?.displayAvatarURL() ?? undefined
        });
        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
};
