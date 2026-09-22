import { Client, Collection, GatewayIntentBits, Partials } from "discord.js";
export function createDiscordClient() {
    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMembers,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent,
            GatewayIntentBits.GuildMessageReactions,
        ],
        partials: [Partials.Message, Partials.Channel, Partials.Reaction, Partials.User],
    });
    client.commands = new Collection();
    return client;
}
