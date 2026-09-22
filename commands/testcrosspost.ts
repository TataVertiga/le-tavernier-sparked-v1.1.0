// commands/testcrosspost.ts
import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChatInputCommandInteraction,
  MessageFlags,
} from "discord.js";

import {
  publishLivePost,
  socialPlatforms,
  type SocialPlatform,
} from "../services/socialPublisher.js";
import { enforceStaff } from "../utils/permUtils.js";

export default {
  data: new SlashCommandBuilder()
    .setName("testcrosspost")
    .setDMPermission(false)
    .setDescription("Teste une publication sociale et affiche le vrai diagnostic")
    .addStringOption(option => option
      .setName("plateforme")
      .setDescription("Plateforme à tester (Twitter par défaut)")
      .setRequired(false)
      .addChoices(
        { name: "X / Twitter", value: "twitter" },
        { name: "Facebook", value: "facebook" },
        { name: "Bluesky", value: "bluesky" },
        { name: "Threads", value: "threads" },
        { name: "Toutes", value: "all" },
      ))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!(await enforceStaff(interaction))) return;
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const user = process.env.TWITCH_USERNAME ?? "twitch";
    const liveId = `test-${Date.now()}`;
    const selected = interaction.options.getString("plateforme") ?? "twitter";
    const platforms = selected === "all"
      ? socialPlatforms
      : [selected as SocialPlatform];

    const reports = await Promise.all(
      platforms.map(platform => publishLivePost(platform, user, liveId)),
    );
    const icons = { twitter: "🐦", facebook: "👤", bluesky: "🦋", threads: "🧵" } as const;
    const lines = reports.map(report => {
      const status = report.status === "posted"
        ? "✅ publié"
        : report.status === "duplicate"
          ? "⏭️ déjà publié"
          : report.status === "skipped"
            ? `⚫ ignoré — ${report.detail}`
            : `❌ ${report.detail ?? "erreur inconnue"}`;
      return `${icons[report.platform]} ${report.label}: ${status}`;
    });

    await interaction.editReply(lines.join("\n").slice(0, 1900));
  },
};
