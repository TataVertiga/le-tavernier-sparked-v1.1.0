import { SlashCommandBuilder, MessageFlags } from "discord.js";
const gifs = [
    "https://tenor.com/bhqOH.gif",
    "https://tenor.com/bQ3SA.gif",
    "https://tenor.com/bgW3h.gif",
    "https://tenor.com/sMel4CpJV6H.gif",
    "https://tenor.com/4bAy.gif",
    "https://tenor.com/tzG3b5Mutyx.gif",
    "https://tenor.com/bFCAb.gif",
    "https://tenor.com/tzG3b5Mutyx.gif", // (doublon conservé volontairement)
    "https://tenor.com/bf2GJ.gif",
    "https://tenor.com/bkd90.gif",
    "https://tenor.com/bnlUE.gif",
];
const cooldowns = new Map();
const COOLDOWN = 10_000; // 10 secondes
export default {
    data: new SlashCommandBuilder()
        .setName('prout')
        .setDescription('Envoie un gif de prout au hasard'),
    async execute(interaction) {
        const now = Date.now();
        const last = cooldowns.get(interaction.user.id) || 0;
        if (now - last < COOLDOWN) {
            const remaining = Math.ceil((COOLDOWN - (now - last)) / 1000);
            return interaction.reply({
                content: `🥴 Doucement, une prout par tournée... (attends encore ${remaining}s)`,
                flags: MessageFlags.Ephemeral
            });
        }
        cooldowns.set(interaction.user.id, now);
        const random = gifs[Math.floor(Math.random() * gifs.length)];
        await interaction.reply(random); // public, pour que tout le monde profite du chef-d'œuvre
    }
};
