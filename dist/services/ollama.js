import { markService, serviceReadiness } from "../core/config.js";
import { log } from "../core/logger.js";
const SYSTEM_PROMPT = [
    "Tu es Le Tavernier, le compagnon de discussion du serveur Discord de Tata Vertiga.",
    "Tu échanges en français, naturellement, comme une personne sympa au comptoir : chaleureux, familier, clair et vivant.",
    "Tu peux glisser un humour décalé et quelques références françaises, avec légèreté. Tu ne harcèles pas et tu n'insultes pas les membres.",
    "Réponds directement à ce qui est dit. Garde les réponses courtes dans une conversation ordinaire et développe seulement si on te le demande.",
    "Sois honnête si tu ne sais pas. Tu n'as pas accès à Internet, aux comptes ou aux actions du serveur ; ne prétends jamais avoir vérifié ou fait quelque chose.",
].join(" ");
const DEFAULT_BASE_URL = "http://127.0.0.1:11434";
const DEFAULT_TIMEOUT_MS = 120_000;
const DEFAULT_HISTORY_TURNS = 6;
const MAX_HISTORY_TURNS = 12;
const MAX_INPUT_LENGTH = 4_000;
const MAX_CONVERSATIONS = 100;
const CONVERSATION_TTL_MS = 6 * 60 * 60 * 1000;
const MAX_PENDING_REQUESTS = 4;
const conversations = new Map();
let queueTail = Promise.resolve();
let pendingRequests = 0;
function baseUrl() {
    return process.env.OLLAMA_BASE_URL?.trim() || DEFAULT_BASE_URL;
}
function settingNumber(name, fallback, min, max) {
    const parsed = Number.parseInt(process.env[name] ?? "", 10);
    if (!Number.isFinite(parsed))
        return fallback;
    return Math.min(max, Math.max(min, parsed));
}
function timeoutMs() {
    return settingNumber("OLLAMA_TIMEOUT_MS", DEFAULT_TIMEOUT_MS, 5_000, 600_000);
}
function historyTurns() {
    return settingNumber("OLLAMA_HISTORY_TURNS", DEFAULT_HISTORY_TURNS, 1, MAX_HISTORY_TURNS);
}
function conversationFor(key) {
    const now = Date.now();
    for (const [conversationKey, conversation] of conversations) {
        if (now - conversation.touchedAt > CONVERSATION_TTL_MS) {
            conversations.delete(conversationKey);
        }
    }
    const existing = conversations.get(key);
    if (existing) {
        existing.touchedAt = now;
        return existing;
    }
    while (conversations.size >= MAX_CONVERSATIONS) {
        let oldestKey;
        let oldestTime = Number.POSITIVE_INFINITY;
        for (const [conversationKey, conversation] of conversations) {
            if (conversation.touchedAt < oldestTime) {
                oldestKey = conversationKey;
                oldestTime = conversation.touchedAt;
            }
        }
        if (oldestKey === undefined)
            break;
        conversations.delete(oldestKey);
    }
    const conversation = { messages: [], touchedAt: now };
    conversations.set(key, conversation);
    return conversation;
}
export function ollamaChannelId() {
    return process.env.OLLAMA_CHANNEL_ID?.trim() ?? "";
}
export async function checkOllama() {
    const readiness = serviceReadiness("ollama");
    if (!readiness.ready) {
        throw new Error("Configuration Ollama incomplète.");
    }
    const response = await fetch(new URL("/api/tags", baseUrl()), {
        signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) {
        throw new Error("Ollama a répondu avec le statut HTTP " + response.status + ".");
    }
    const payload = await response.json();
    const model = process.env.OLLAMA_MODEL?.trim() ?? "";
    const acceptedNames = new Set([model, model + ":latest"]);
    if (!payload.models?.some(entry => typeof entry.name === "string" && acceptedNames.has(entry.name))) {
        throw new Error("Le modèle configuré dans OLLAMA_MODEL n'est pas installé dans Ollama.");
    }
}
export async function generateOllamaReply(conversationKey, input) {
    const model = process.env.OLLAMA_MODEL?.trim();
    if (!model)
        throw new Error("OLLAMA_MODEL est manquant.");
    if (pendingRequests >= MAX_PENDING_REQUESTS) {
        throw new Error("OLLAMA_BUSY");
    }
    pendingRequests++;
    const previous = queueTail;
    let releaseCurrent = () => { };
    queueTail = new Promise(resolve => {
        releaseCurrent = resolve;
    });
    await previous;
    try {
        const conversation = conversationFor(conversationKey);
        const response = await fetch(new URL("/api/chat", baseUrl()), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: AbortSignal.timeout(timeoutMs()),
            body: JSON.stringify({
                model,
                stream: false,
                keep_alive: process.env.OLLAMA_KEEP_ALIVE?.trim() || "5m",
                messages: [
                    { role: "system", content: SYSTEM_PROMPT },
                    ...conversation.messages,
                    { role: "user", content: input.slice(0, MAX_INPUT_LENGTH) },
                ],
            }),
        });
        if (!response.ok) {
            throw new Error("Ollama a répondu avec le statut HTTP " + response.status + ".");
        }
        const payload = await response.json();
        const answer = typeof payload.message?.content === "string"
            ? payload.message.content.trim()
            : "";
        if (!answer)
            throw new Error("Ollama n'a pas renvoyé de réponse.");
        conversation.messages.push({ role: "user", content: input.slice(0, MAX_INPUT_LENGTH) }, { role: "assistant", content: answer });
        conversation.messages = conversation.messages.slice(-(historyTurns() * 2));
        conversation.touchedAt = Date.now();
        markService("ollama", "running");
        return answer;
    }
    catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        markService("ollama", "error", detail);
        log.error("OLLAMA", "La requête au modèle local a échoué", error);
        throw error;
    }
    finally {
        pendingRequests--;
        releaseCurrent();
    }
}
