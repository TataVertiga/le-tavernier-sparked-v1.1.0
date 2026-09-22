// --- state/tavernierState.ts ---
import fs from "fs";
import path from "path";
import { writeJsonAtomic } from "../utils/jsonFiles.js";
const DEFAULT_STATE = {
    mute: false,
    pausePublishing: false,
};
const STATE_DIR = path.join(process.cwd(), "data");
const STATE_FILE = path.join(STATE_DIR, "tavernier_state.json");
function ensureDir() {
    if (!fs.existsSync(STATE_DIR))
        fs.mkdirSync(STATE_DIR, { recursive: true });
}
export function loadState() {
    try {
        ensureDir();
        if (!fs.existsSync(STATE_FILE)) {
            writeJsonAtomic(STATE_FILE, DEFAULT_STATE);
            return { ...DEFAULT_STATE };
        }
        const raw = fs.readFileSync(STATE_FILE, "utf8");
        return { ...DEFAULT_STATE, ...JSON.parse(raw) };
    }
    catch {
        return { ...DEFAULT_STATE };
    }
}
let inMemory = null;
function atomicWrite(obj) {
    ensureDir();
    writeJsonAtomic(STATE_FILE, obj);
}
export function getState() {
    if (!inMemory)
        inMemory = loadState();
    return inMemory;
}
export function setState(patch) {
    inMemory = {
        ...getState(),
        ...patch,
        updatedAt: Date.now(),
    };
    atomicWrite(inMemory);
    return inMemory;
}
export const isMuted = () => getState().mute;
export const isPublishingPaused = () => getState().pausePublishing;
