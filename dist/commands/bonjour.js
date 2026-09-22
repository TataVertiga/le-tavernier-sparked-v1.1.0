import { SlashCommandBuilder } from 'discord.js';
export default {
    data: new SlashCommandBuilder()
        .setName('bonjour')
        .setDescription('Salue le Tavernier comme un bon gueux'),
    async execute(interaction) {
        const replies = [
            "Bonjour toi… T'as l'air frais comme une bière tiède.",
            "Salut l'ami ! T'as pas une tournée à payer par hasard ?",
            "Oh... c’est qu’il dit bonjour en plus. C’est rare chez les gueux bien élevés.",
            "Bien le bonjour ! Assieds-toi et fais pas de miettes.",
            "Bonjour. Maintenant que t’es là, tu peux aussi ranger les chopes ?",
            "Salut mon gueux, t'as ramené ta chope ?",
            "Bonjour, j’espère que t’as pas oublié de te laver…",
            "Bien l’bonjour ! La bière est fraîche, le tavernier beaucoup moins.",
            "Oh ! Un survivant du banquet d’hier ?",
            "Yo. Mets-toi à l’aise, mais pas sur mes genoux.",
            "Bienvenue dans la taverne ! Si t’as soif, c’est l’destin.",
            "Tiens tiens… Un gueux en quête de houblon ?",
            "Ah ! Un revenant ! J’t’avais parié que tu reviendrais !",
            "Salut ! Ici, on boit d’abord, on cause après.",
            "Bonjour, étranger. Laisse ton épée à l’entrée, ton or à la sortie.",
            "Hey ! T’as une tête à mériter un tonneau rien que pour toi.",
            "J’te souhaite pas la bienvenue, j’te sers direct.",
            "Bon retour ! La dernière fois t’avais vomi dans l’sabot du palefrenier.",
            "Ah, encore un qui vient fuir la réalité dans la mousse.",
            "On t’a pas vu depuis… oulà… trop longtemps pour que j’m’en rappelle.",
            "Bonjour ! La soupe est tiède, le pain est rassis, et moi j’suis bourré.",
            "Yo ! J’t’ai pas encore vu rincer la tournée du peuple !",
            "Oh ! Tu sens encore la route. Assieds-toi, repose ta fesse gauche.",
            "Salut, noble sac à vin !",
            "Bienvenue ! Si tu cries fort, le Tavernier t’entendra peut-être (ou pas).",
            "J’t’ai reconnu ! C’est toi qui t’étais battu contre une chaise, non ?",
            "Ah, la taverne s’anime, même les mouches applaudissent !",
            "Ton haleine annonce un lever de soleil dans les égouts, mais bienvenue !",
            "Bonjour, voyageur ! T’as l’odeur d’un druide qui s’est trompé d’potion.",
            "Salut ! Y'a du pain sec et des baffes fraîches, choisis bien !",
            "Mais vous êtes pas mort espèce de connard ?!"
        ];
        const randomReply = replies[Math.floor(Math.random() * replies.length)];
        await interaction.reply(randomReply);
    }
};
