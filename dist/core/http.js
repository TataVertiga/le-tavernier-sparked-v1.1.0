import express from "express";
import { log } from "./logger.js";
export function startHttpServer() {
    const app = express();
    const rawPort = Number(process.env.PORT ?? 10000);
    const port = Number.isInteger(rawPort) && rawPort > 0 ? rawPort : 10000;
    app.disable("x-powered-by");
    app.get("/", (_request, response) => response.send("🍺 Le Tavernier est en ligne !"));
    app.get("/health", (_request, response) => response.json({ ok: true, service: "le-tavernier" }));
    const server = app.listen(port, () => log.info("HTTP", `Serveur actif sur le port ${port}`));
    server.on("error", error => log.error("HTTP", "Serveur indisponible", error));
    return server;
}
