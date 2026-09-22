import { ChannelType, Events } from "discord.js";
import { discordIds } from "../core/config.js";
const GUEUX_ROLE_ID = discordIds.gueuxRole;
const WELCOME_CHANNEL_ID = discordIds.welcomeChannel;
const PRESENTATION_CHANNEL_ID = discordIds.presentationChannel;
const ROLES_CHANNEL_ID = discordIds.rolesChannel;
// Anti-doublon 5 min
const greetedRecently = new Set();
export default {
    name: Events.GuildMemberUpdate,
    async execute(oldMember, newMember) {
        try {
            const avaitPas = !oldMember.roles.cache.has(GUEUX_ROLE_ID);
            const aMaintenant = newMember.roles.cache.has(GUEUX_ROLE_ID);
            if (!(avaitPas && aMaintenant))
                return;
            if (greetedRecently.has(newMember.id))
                return;
            greetedRecently.add(newMember.id);
            setTimeout(() => greetedRecently.delete(newMember.id), 5 * 60 * 1000);
            const ch = newMember.guild.channels.cache.get(WELCOME_CHANNEL_ID);
            if (!ch || ch.type !== ChannelType.GuildText)
                return;
            console.log("[DISCORD] rôle GUEUX ajouté → message envoyé à", newMember.user.tag);
            await ch.send({
                content: `🍻 **CLING CLING CLING !** Fermez vos mouilles, un nouvel éclopé pousse la porte !\n` +
                    `Bienvenue ${newMember} dans la **Taverne de Tata** où la bière pique le nez et les bancs tiennent avec de la ficelle.\n` +
                    `T’es désormais un **Gueux** à part entière. Va donc éructer ton histoire dans <#${PRESENTATION_CHANNEL_ID}> ` +
                    `et va t’équiper d’un titre ronflant ou de pouvoirs obscurs dans <#${ROLES_CHANNEL_ID}> — un gueux sans blason, c’est comme un pet sans odeur : **inutile**.\n\n` +
                    `Allez, installe-toi, évite les flaques suspectes, et fais comme chez toi… mais pas trop. ❤️`,
                allowedMentions: { users: [newMember.id] }
            });
        }
        catch (e) {
            console.error("[DISCORD] Erreur GuildMemberUpdate :", e);
        }
    },
};
