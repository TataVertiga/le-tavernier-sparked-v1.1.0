import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('douzinite')
    .setDescription('Balance une réponse aléatoire sur la Douzinite'),

  async execute(interaction: ChatInputCommandInteraction) {
    const douziniteQuotes = [
      "Je suis pas docteur, mais là c’est une douzinite stade terminal. Faut isoler le patient et lui faire boire 3 pintes de suite.",
      "La prophétie parlait d’un jour où les mots perdraient tout sens… Ce jour est arrivé.",
      "Parle plus fort mon p’tit, j’comprends rien… t’as une douzinite ou quoi ?",
      "Franchement, j’ai lu trois fois… et toujours rien compris. T’es possédé ou t’as juste douzinité très fort là ?",
      "On va devoir coller ta phrase au mur des incohérences, juste à côté du mec qui a demandé si la bière c’était vegan.",
      "Non mais je sens bien que vous essayez de me dire quelque chose... c’est de vous la phrase ou vous l’avez entendue ?",
      "Mais... qu’est-ce que vous me racontez ? C’est d’l’elfique ou du foutage de gueule ?",
      "J’vois bien que tu parles, mais mon cerveau refuse.",
      "Ta phrase elle a glissé sous la table, trébuché sur un mot et s’est étouffée dans sa propre connerie.",
      "Interprète ! Interprète ! … Cuillère !"
    ];

    const quote = douziniteQuotes[Math.floor(Math.random() * douziniteQuotes.length)];
    await interaction.reply(quote);
  }
};
