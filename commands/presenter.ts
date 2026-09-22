// commands/presenter.ts
import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
} from "discord.js";
import fs from "fs";
import path from "path";
import { writeJsonAtomic } from "../utils/jsonFiles.js";
import { enforceStaff } from "../utils/permUtils.js";

const dataPath = path.join(process.cwd(), "data", "presenter.json");

export const data = new SlashCommandBuilder()
  .setName("presenter")
  .setDescription("Le Tavernier se présente (une seule fois).")
  .setDMPermission(false);

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!(await enforceStaff(interaction))) return;

  // Lire l'état actuel
  let state: { presented: boolean } = { presented: false };
  try {
    state = JSON.parse(fs.readFileSync(dataPath, "utf8"));
  } catch {
    // Si parse foire, on réinitialise proprement
    state = { presented: false };
  }

  if (state.presented) {
    return interaction.reply({
      content: "Tsss… j’l’ai déjà dit une fois, va pas me faire radoter, gueux.",
      flags: MessageFlags.Ephemeral,
    });
  }

  const embed = new EmbedBuilder()
    .setColor(0x8b5e3c)
    .setAuthor({
      name: "Le Tavernier",
      iconURL: interaction.client.user?.displayAvatarURL() ?? undefined,
    })
    .setTitle("🍺 OH LES GUEUX ! ÉCOUTEZ-MOI BIEN !")
    .setDescription(
      [
        "C’est moi, **Le Tavernier**.",
        "Gardien des pintes, crieur public, bot Discord officiel de cette taverne.",
        "",
        "Ce que je fais ici :",
        "• ⚔️ J’accueille les nouveaux comme il se doit.",
        "• 📢 J’annonce les lives **Twitch**, les vidéos **YouTube**, et bientôt **TikTok**.",
        "• 🎂 Je souhaite les anniversaires — parfois, *j’offre un godet*.",
        "• 🎉 J’organise des giveaways et je gère les rôles.",
        "• 🤡 Je sers des commandes débiles : `/bonjour`, `/douzinite`, `/prout`… et `/help`.",
        "",
        "Allez, installez-vous et **profitez du boucan**.",
      ].join("\n")
    )
    .setFooter({ text: "Service continu, sauf si j’suis au fond à reremplir le tonneau." })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });

  // Marquer comme déjà présenté
  writeJsonAtomic(dataPath, { presented: true });
}

export default { data, execute };
