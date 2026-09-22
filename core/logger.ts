export type LogLevel = "error" | "warn" | "info" | "debug";

const LEVELS: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const configuredLevel = process.env.LOG_LEVEL?.toLowerCase();
const currentLevel: LogLevel = configuredLevel && configuredLevel in LEVELS
  ? configuredLevel as LogLevel
  : "info";

function enabled(level: LogLevel) {
  return LEVELS[level] <= LEVELS[currentLevel];
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

export const log = {
  error(namespace: string, message: string, error?: unknown) {
    if (!enabled("error")) return;
    console.error(`[${namespace}] ${message}${error === undefined ? "" : ` — ${errorMessage(error)}`}`);
  },
  warn(namespace: string, message: string) {
    if (enabled("warn")) console.warn(`[${namespace}] ${message}`);
  },
  info(namespace: string, message: string) {
    if (enabled("info")) console.log(`[${namespace}] ${message}`);
  },
  debug(namespace: string, message: string) {
    if (enabled("debug")) console.log(`[${namespace}] ${message}`);
  },
};
