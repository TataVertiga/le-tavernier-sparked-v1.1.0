// services/reactionRoles.ts
import {
  Client,
  Events,
  GuildMember,
  MessageReaction,
  PartialMessageReaction,
  PartialUser,
  PermissionsBitField,
  User,
} from "discord.js";
import fs from "fs";
import path from "path";

type MapEntry = { emoji: string; roleId: string };
type ReactionMap = Record<string, MapEntry[]>;

const DATA_DIR = path.join(process.cwd(), "data");
const MAP_PATH = path.join(DATA_DIR, "reaction-map.json");
const ROLES_PATH = path.join(DATA_DIR, "roles.json");

// --- Utils fichier ---
function readMap(): ReactionMap {
  try {
    if (!fs.existsSync(MAP_PATH)) return {};
    const raw = fs.readFileSync(MAP_PATH, "utf8").trim();
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function readRolesConfig(): null | {
  alertes: { emoji: string }[];
  plateformes: { emoji: string }[];
  jeux: { emoji: string }[];
} {
  try {
    if (!fs.existsSync(ROLES_PATH)) return null;
    const raw = fs.readFileSync(ROLES_PATH, "utf8").trim();
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// --- Normalisations emoji (corrige ▶️ vs ▶, etc.) ---
const VS16 = /\uFE0F/g;
const normalizeUni = (s: string) => (s ?? "").replace(VS16, "");

function reactionKey(r: MessageReaction | PartialMessageReaction) {
  return r.emoji.id ?? normalizeUni(r.emoji.name ?? "");
}

function normalizeConfigEmoji(e: string): { type: "id" | "unicode"; value: string } {
  const m = e.match(/^<a?:[\w-]+:(\d+)>$/);
  if (m) return { type: "id", value: m[1] };
  if (/^\d+$/.test(e)) return { type: "id", value: e };
  return { type: "unicode", value: normalizeUni(e) };
}

async function ensureFull(
  reaction: MessageReaction | PartialMessageReaction,
  user: User | PartialUser
) {
  try {
    if (reaction.partial) await reaction.fetch();
    if (reaction.message?.partial) await reaction.message.fetch();
    if (user.partial) await user.fetch();
  } catch {
    /* ignore */
  }
}

function findMatch(entries: MapEntry[], r: MessageReaction | PartialMessageReaction) {
  const key = reactionKey(r);
  return entries.find((x) => {
    const n = normalizeConfigEmoji(x.emoji);
    return n.type === "id" ? key === n.value : key === n.value;
  });
}

/* ----------------------- Actions (logs FR minimal) ----------------------- */

async function handleAdd(reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser) {
  if ("bot" in user && (user as User).bot) return;
  await ensureFull(reaction, user);

  const msg = reaction.message;
  const guild = msg?.guild;
  if (!guild) return;

  const map = readMap();
  const entries = map[msg.id];
  if (!entries) return;

  const match = findMatch(entries, reaction);
  if (!match) return;

  const member = await guild.members.fetch((user as User).id).catch(() => null as GuildMember | null);
  if (!member) return;

  const me = await guild.members.fetchMe();
  if (!me.permissions.has(PermissionsBitField.Flags.ManageRoles)) return;

  const role = guild.roles.cache.get(match.roleId);
  if (!role || role.managed || role.position >= me.roles.highest.position) return;

  try {
    await member.roles.add(role, "Reaction-roles add");
    console.log(`[ROLE] ✅ + ${role.name} -> ${member.user.tag}`);
  } catch {
    /* ignore */
  }
}

async function handleRemove(reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser) {
  if ("bot" in user && (user as User).bot) return;
  await ensureFull(reaction, user);

  const msg = reaction.message;
  const guild = msg?.guild;
  if (!guild) return;

  const map = readMap();
  const entries = map[msg.id];
  if (!entries) return;

  const match = findMatch(entries, reaction);
  if (!match) return;

  const member = await guild.members.fetch((user as User).id).catch(() => null as GuildMember | null);
  if (!member) return;

  const me = await guild.members.fetchMe();
  if (!me.permissions.has(PermissionsBitField.Flags.ManageRoles)) return;

  const role = guild.roles.cache.get(match.roleId);
  if (!role || role.managed || role.position >= me.roles.highest.position) return;

  try {
    await member.roles.remove(role, "Reaction-roles remove");
    console.log(`[ROLE] 🗑️ - ${role.name} -> ${member.user.tag}`);
  } catch {
    /* ignore */
  }
}

/* ----------------------- Vérif & log des 3 panels ----------------------- */

function sameSet(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  const A = new Set(a), B = new Set(b);
  if (A.size !== B.size) return false;
  for (const x of A) if (!B.has(x)) return false;
  return true;
}

function logPanelsFound() {
  const cfg = readRolesConfig();
  const map = readMap();
  if (!cfg || !map || !Object.keys(map).length) return;

  const expAlertes = cfg.alertes.map(x => normalizeUni(x.emoji));
  const expPlats   = cfg.plateformes.map(x => normalizeUni(x.emoji));
  const expJeux    = cfg.jeux.map(x => normalizeUni(x.emoji));

  let idAlertes = "", idPlats = "", idJeux = "";

  for (const [msgId, entries] of Object.entries(map)) {
    const emojis = entries.map(e => normalizeUni(e.emoji));
    if (!idAlertes && sameSet(emojis, expAlertes)) idAlertes = msgId;
    else if (!idPlats && sameSet(emojis, expPlats)) idPlats = msgId;
    else if (!idJeux && sameSet(emojis, expJeux)) idJeux = msgId;
  }

  if (idAlertes && idPlats && idJeux) {
    console.log(`[ROLE] 📌 Panels trouvés : alertes=${idAlertes} • plateformes=${idPlats} • jeux=${idJeux}`);
  }
}

/* ----------------------- Init ----------------------- */

export function initReactionRoles(client: Client & { __reactionRolesInit?: boolean }) {
  if (client.__reactionRolesInit) return;
  client.__reactionRolesInit = true;

  // Log “3 panels trouvés” si la map matche les emojis du roles.json
  logPanelsFound();

  client.on(Events.MessageReactionAdd, (r, u) => void handleAdd(r, u));
  client.on(Events.MessageReactionRemove, (r, u) => void handleRemove(r, u));
}
