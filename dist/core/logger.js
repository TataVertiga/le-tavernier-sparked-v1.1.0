const LEVELS = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
};
const configuredLevel = process.env.LOG_LEVEL?.toLowerCase();
const currentLevel = configuredLevel && configuredLevel in LEVELS
    ? configuredLevel
    : "info";
function enabled(level) {
    return LEVELS[level] <= LEVELS[currentLevel];
}
export function errorMessage(error) {
    if (error instanceof Error)
        return error.message;
    if (typeof error === "string")
        return error;
    try {
        return JSON.stringify(error);
    }
    catch {
        return String(error);
    }
}
export const log = {
    error(namespace, message, error) {
        if (!enabled("error"))
            return;
        console.error(`[${namespace}] ${message}${error === undefined ? "" : ` — ${errorMessage(error)}`}`);
    },
    warn(namespace, message) {
        if (enabled("warn"))
            console.warn(`[${namespace}] ${message}`);
    },
    info(namespace, message) {
        if (enabled("info"))
            console.log(`[${namespace}] ${message}`);
    },
    debug(namespace, message) {
        if (enabled("debug"))
            console.log(`[${namespace}] ${message}`);
    },
};
