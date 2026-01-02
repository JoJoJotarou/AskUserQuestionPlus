#!/usr/bin/env node
import "dotenv/config"; // Load .env file
import express from "express";
import { WebSocketServer } from "ws";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import { WebSocketService } from "./ws-service.js";
import { MCPServerService } from "./mcp-server.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// --- Configuration ---
interface Config {
  PORT: number;
  TIMEOUT: number;
}

const DEFAULT_CONFIG: Config = {
  PORT: 3456,
  TIMEOUT: 600000, // 10 minutes
};

/**
 * Parse configuration from environment variables and command line arguments
 * Priority: CLI args > Environment variables > Defaults
 */
function parseConfig(): Config {
  const config: Config = {
    // 1. Defaults
    ...DEFAULT_CONFIG,
  };

  // 2. Environment variables
  if (process.env.PORT) {
    const port = parseInt(process.env.PORT, 10);
    if (!isNaN(port) && port > 0 && port <= 65535) {
      config.PORT = port;
    } else {
      console.error(
        `[Config] Invalid PORT environment variable: ${process.env.PORT}`
      );
    }
  }

  if (process.env.TIMEOUT) {
    const timeout = parseInt(process.env.TIMEOUT, 10);
    if (!isNaN(timeout) && timeout > 0) {
      config.TIMEOUT = timeout;
    } else {
      console.error(
        `[Config] Invalid TIMEOUT environment variable: ${process.env.TIMEOUT}`
      );
    }
  }

  // 3. Command line arguments (override environment variables)
  const args = process.argv.slice(2);
  for (const arg of args) {
    if (arg.startsWith("--port=")) {
      const port = parseInt(arg.split("=")[1], 10);
      if (!isNaN(port) && port > 0 && port <= 65535) {
        config.PORT = port;
      } else {
        console.error(`[Config] Invalid --port argument: ${arg}`);
      }
    } else if (arg.startsWith("--timeout=")) {
      const timeout = parseInt(arg.split("=")[1], 10);
      if (!isNaN(timeout) && timeout > 0) {
        config.TIMEOUT = timeout;
      } else {
        console.error(`[Config] Invalid --timeout argument: ${arg}`);
      }
    }
  }

  return config;
}

// --- Main ---
async function main() {
  console.error("=== Server Starting ===");

  try {
    const config = parseConfig();
    console.error(`[Main] Configuration:`);
    console.error(`[Main] - Port: ${config.PORT}`);
    console.error(
      `[Main] - Timeout: ${config.TIMEOUT}ms (${config.TIMEOUT / 1000}s)`
    );

    // Create Express app
    const app = express();

    // Middleware
    app.use(express.json());
    app.use(express.static(path.join(__dirname, "../public")));

    // Health check endpoint
    app.get("/health", (_req, res) => {
      res.json({
        status: "ok",
        timestamp: new Date().toISOString(),
        activeSessions: wsService.getSessionCount(),
      });
    });

    // Create HTTP server
    const server = createServer(app);

    // Create WebSocket server with /ws path
    const wss = new WebSocketServer({
      server,
      path: "/ws",
    });

    // Initialize services
    const wsService = new WebSocketService(wss, config.TIMEOUT, config.PORT);
    const mcpService = new MCPServerService(wsService);

    // MCP routes
    app.post("/mcp", async (req, res) => {
      await mcpService.handleRequest(req, res);
    });

    app.get("/mcp", (_req, res) => {
      res.status(405).json({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "Method not allowed. Use POST.",
        },
        id: null,
      });
    });

    app.delete("/mcp", (_req, res) => {
      res.status(405).json({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "Method not allowed. Use POST.",
        },
        id: null,
      });
    });

    // Start server
    server.listen(config.PORT, () => {
      console.error(`[Main] Server listening on port ${config.PORT}`);
      console.error(`[Main] - HTTP: http://localhost:${config.PORT}`);
      console.error(`[Main] - WebSocket: ws://localhost:${config.PORT}/ws`);
      console.error(`[Main] - MCP: http://localhost:${config.PORT}/mcp`);
      console.error(`[Main] - Health: http://localhost:${config.PORT}/health`);
    });

    // Graceful shutdown
    const shutdown = async () => {
      console.error("[Main] Shutting down...");
      await wsService.cleanup();
      server.close(() => {
        console.error("[Main] Server closed");
        process.exit(0);
      });
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (error) {
    console.error("[Main] Startup failed:", error);
    process.exit(1);
  }
}

main();
