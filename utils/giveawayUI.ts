// utils/giveawayUI.ts
export const MAX_PARTICIPANTS = 10; // 100% atteint à partir de ce nombre

export function getChopeBar(participants: number) {
  const percent = Math.min(100, Math.round((participants / MAX_PARTICIPANTS) * 100));
  const filled = Math.floor(percent / 10);
  const empty = 10 - filled;
  const bar = "█".repeat(filled) + "░".repeat(empty);

  let message = "";
  if (percent <= 20) message = "Un timide gueux s’avance timidement…";
  else if (percent <= 50) message = "La taverne commence à sentir la sueur et la bière.";
  else if (percent <= 80) message = "Ça hurle, ça rigole, les paris s’ouvrent !";
  else message = "Le chaos est total, ça va finir en bagarre générale.";

  return { bar, message };
}
