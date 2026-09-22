import { Client, Collection, GatewayIntentBits, Partials } from "discord.js";

export interface TavernierClient extends Client {
  commands: Collection<string, any>;
  __reactionRolesInit?: boolean;
}

export function createDiscordClient(): TavernierClient {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMessageReactions,
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction, Partials.User],
  }) as TavernierClient;

  client.commands = new Collection();
  return client;
}
