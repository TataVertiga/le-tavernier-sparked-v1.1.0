import { SlashCommandBuilder, MessageFlags } from "discord.js";
import dayjs from "dayjs";
import "dayjs/locale/fr.js";
dayjs.locale("fr");
import { readBirthdays, setBirthday, removeBirthday, } from "../services/googleSheets.js"; // adapte le chemin si besoin
// --- Helpers ---
function validDate(str) {
    const match = str.match(/^(\d{2})-(\d{2})(?:-(\d{4}))?$/);
    if (!match)
        return false;
    const day = Number(match[1]);
    const month = Number(match[2]);
    // 2000 autorise le 29 février quand l'année n'est pas renseignée.
    const year = Number(match[3] ?? 2000);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year
        && date.getUTCMonth() === month - 1
        && date.getUTCDate() === day;
}
function parseDateParts(str) {
    const parts = str.split("-");
    if (parts.length === 2)
        return { day: parts[0], month: parts[1] };
    if (parts.length === 3)
        return { day: parts[0], month: parts[1], year: parts[2] };
    return null;
}
function formatDateFr(day, month, year) {
    return `${day}/${month}${year ? "/" + year : ""}`;
}
export default {
    data: new SlashCommandBuilder()
        .setName("anniv")
        .setDescription("Gestion des anniversaires dans la Taverne")
        .addSubcommand(sc => sc.setName("me")
        .setDescription("Affiche ton anniversaire enregistré et l’aide d’utilisation"))
        .addSubcommand(sc => sc.setName("set")
        .setDescription("Enregistre ou modifie ton anniversaire (JJ-MM ou JJ-MM-AAAA)")
        .addStringOption(opt => opt.setName("date")
        .setDescription("Format JJ-MM ou JJ-MM-AAAA (ex: 04-11 ou 04-11-1987)")
        .setRequired(true)))
        .addSubcommand(sc => sc.setName("remove")
        .setDescription("Supprime ton anniversaire"))
        .addSubcommand(sc => sc.setName("list")
        .setDescription("Liste les anniversaires enregistrés")),
    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const userId = interaction.user.id;
        // /anniv me
        if (sub === "me") {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            const birthdays = await readBirthdays();
            const entry = birthdays[userId];
            let rep = "🎂 **Gestion des anniversaires de la Taverne**\n";
            rep += "• Pour enregistrer : `/anniv set date: JJ-MM` ou `JJ-MM-AAAA`\n";
            rep += "• Pour supprimer : `/anniv remove`\n";
            rep += "• Voir tous : `/anniv list`\n";
            rep += "💡 Si tu donnes ton année de naissance, ton âge s’affichera dans la liste !\n\n";
            if (entry) {
                let day = "??", month = "??", year = entry.year ? entry.year.toString() : undefined;
                if (entry.date && typeof entry.date === "string") {
                    const parts = entry.date.replace(/-/g, "/").split("/");
                    [day, month] = parts;
                }
                rep += `> Tu as enregistré : **${formatDateFr(day, month, year)}**\n`;
                if (entry.year && day !== "??" && month !== "??") {
                    const age = dayjs().diff(dayjs(`${year}-${month}-${day}`), "year");
                    rep += `> Tu as actuellement **${age} ans** (et toutes tes dents ?)\n`;
                }
            }
            else {
                rep += "> Tu n’as pas encore enregistré ton anniversaire. Sois pas timide !\n";
            }
            return interaction.editReply(rep);
        }
        // /anniv set
        if (sub === "set") {
            const raw = (interaction.options.getString("date", true) || "").replace(/\//g, "-").trim();
            if (!validDate(raw)) {
                return interaction.reply({
                    content: "❌ Format incorrect, gueux ! Utilise `JJ-MM` ou `JJ-MM-AAAA`.\nExemple : `04-11-1987`",
                    flags: MessageFlags.Ephemeral
                });
            }
            const parts = parseDateParts(raw);
            if (!parts) {
                return interaction.reply({ content: "❌ Impossible de lire ta date. T’es sûr de toi ?", flags: MessageFlags.Ephemeral });
            }
            const dayN = parseInt(parts.day, 10);
            const monthN = parseInt(parts.month, 10);
            const yearN = parts.year ? parseInt(parts.year, 10) : undefined;
            if (dayN < 1 || dayN > 31 || monthN < 1 || monthN > 12) {
                return interaction.reply({ content: "❌ C’est pas un vrai jour ou un vrai mois, arrête de picoler !", flags: MessageFlags.Ephemeral });
            }
            if (yearN && (yearN < 1900 || yearN > dayjs().year())) {
                return interaction.reply({ content: "❌ Tu viens du futur ou tu mens sur ton âge ?", flags: MessageFlags.Ephemeral });
            }
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            const date = `${parts.day}/${parts.month}`;
            const birthdays = await readBirthdays();
            const existing = birthdays[userId];
            const newDate = date.replace(/\//g, "-");
            const existingDate = existing?.date?.replace(/\//g, "-");
            const existingYear = existing?.year;
            if (existing && existingDate === newDate && existingYear === yearN) {
                return interaction.editReply(`⚠️ T’as déjà enregistré cet anniversaire : **${date}${yearN ? "/" + yearN : ""}**, andouille !`);
            }
            await setBirthday(userId, date, yearN);
            let msg = `✅ Ton anniversaire a bien été enregistré pour le **${date}${yearN ? "/" + yearN : ""}**.`;
            if (yearN) {
                const age = dayjs().diff(dayjs(`${yearN}-${parts.month}-${parts.day}`), "year");
                msg += ` Ça te fait donc **${age} ans**, papuche !`;
            }
            else {
                msg += " (⚠️ Sans année, pas d’âge affiché dans la liste.)";
            }
            return interaction.editReply(msg);
        }
        // /anniv remove
        if (sub === "remove") {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            const birthdays = await readBirthdays();
            if (!birthdays[userId]) {
                return interaction.editReply("Tu n’as même pas enregistré d’anniversaire, sombre gueux !");
            }
            await removeBirthday(userId);
            return interaction.editReply("🗑️ Ton anniversaire a été effacé des grimoires de la Taverne !");
        }
        // /anniv list
        if (sub === "list") {
            await interaction.deferReply(); // public (non-ephemeral) pour que tout le monde voie
            const birthdays = await readBirthdays();
            if (!Object.keys(birthdays).length) {
                return interaction.editReply("Aucun anniversaire d’enregistré chez les gueux !");
            }
            let rep = "🎉 **Anniversaires de la Taverne** :\n";
            const guild = interaction.guild;
            for (const [uid, entry] of Object.entries(birthdays)) {
                // Récup pseudo sans ping (ou fallback ID)
                let displayName = `ID:${uid}`;
                if (guild) {
                    try {
                        const member = await guild.members.fetch(uid);
                        if (member)
                            displayName = member.displayName || member.user.username;
                    }
                    catch {
                        // ignore
                    }
                }
                // Date robuste
                let day = "??", month = "??", year = undefined;
                if (entry.date && typeof entry.date === "string") {
                    const parts = entry.date.replace(/-/g, "/").split("/");
                    [day, month] = parts;
                }
                if (entry.year && !isNaN(entry.year)) {
                    year = String(entry.year);
                }
                // Ligne
                let ligne = `• **${displayName}** : ${formatDateFr(day, month, year)}`;
                if (year && day !== "??" && month !== "??") {
                    const birthdate = dayjs(`${year}-${month}-${day}`);
                    const age = birthdate.isValid() ? dayjs().diff(birthdate, "year") : null;
                    if (age && age > 0 && age < 120) {
                        ligne += ` (${age} ans)`;
                    }
                }
                rep += ligne + "\n";
            }
            // Discord a une limite de 2000 caractères : on coupe au besoin
            if (rep.length > 1900) {
                const chunks = [];
                let cur = "";
                for (const line of rep.split("\n")) {
                    if ((cur + line + "\n").length > 1900) {
                        chunks.push(cur);
                        cur = "";
                    }
                    cur += line + "\n";
                }
                if (cur)
                    chunks.push(cur);
                await interaction.editReply(chunks.shift());
                for (const chunk of chunks) {
                    await interaction.followUp(chunk);
                }
            }
            else {
                await interaction.editReply(rep);
            }
            return;
        }
        // fallback (ne devrait pas arriver)
        return interaction.reply({ content: "❌ Sous-commande inconnue.", flags: MessageFlags.Ephemeral });
    },
};
