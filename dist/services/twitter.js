import { TwitterApi } from 'twitter-api-v2';
import { envFlag } from '../core/config.js';
import { messageFor } from './templates.js';
import { alreadyPosted, rememberPosted } from '../utils/postMemory.js';
let twitterClient = null;
function getTwitterClient() {
    if (twitterClient)
        return twitterClient;
    const appKey = process.env.TWITTER_API_KEY?.trim();
    const appSecret = process.env.TWITTER_API_SECRET?.trim();
    const accessToken = process.env.TWITTER_ACCESS_TOKEN?.trim();
    const accessSecret = process.env.TWITTER_ACCESS_SECRET?.trim();
    if (!appKey || !appSecret || !accessToken || !accessSecret) {
        throw new Error('[TWITTER] Clés OAuth incomplètes (4 variables requises).');
    }
    twitterClient = new TwitterApi({ appKey, appSecret, accessToken, accessSecret });
    return twitterClient;
}
function describeTwitterError(error) {
    const value = error;
    const status = typeof value?.code === 'number' ? `HTTP ${value.code}` : undefined;
    const detail = value?.data?.detail
        ?? value?.data?.title
        ?? value?.data?.errors?.map(item => item.message).filter(Boolean).join(', ')
        ?? value?.message
        ?? 'Erreur inconnue';
    return [status, detail].filter(Boolean).join(' — ');
}
export async function publierTweetLiveTwitch(twitchUser, liveId) {
    if (!envFlag('TWITTER_ENABLED')) {
        throw new Error('[TWITTER] Envoi désactivé (TWITTER_ENABLED n’est pas à true).');
    }
    if (alreadyPosted('twitter', liveId)) {
        console.log('[TWITTER] ⏭️ Déjà publié pour ce live:', liveId);
        return { status: 'duplicate' };
    }
    try {
        const response = await getTwitterClient().v2.tweet(messageFor('twitter', twitchUser));
        rememberPosted('twitter', liveId);
        console.log('[TWITTER] ✅ Post publié:', response.data.id);
        return { status: 'posted', postId: response.data.id };
    }
    catch (error) {
        const diagnostic = describeTwitterError(error);
        console.error('[TWITTER] ❌ Échec de publication:', diagnostic);
        // Indispensable : le caller doit savoir que X a réellement échoué.
        throw new Error(`[TWITTER] ${diagnostic}`);
    }
}
