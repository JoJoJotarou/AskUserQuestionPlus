import { WebSocketServer, WebSocket } from "ws";

// --- Types ---
export interface SessionState {
  id: string;
  questions: any;
  resolve: (result: any) => void;
  reject: (error: Error) => void;
  ws: WebSocket | null;
  timeout: NodeJS.Timeout | null;
  createdAt: number;
}

export class WebSocketService {
  private wss: WebSocketServer;
  private sessions = new Map<string, SessionState>();
  private sessionTimeoutMs: number;
  private port: number;

  constructor(wss: WebSocketServer, sessionTimeoutMs = 600000, port = 3456) {
    this.wss = wss;
    this.sessionTimeoutMs = sessionTimeoutMs;
    this.port = port;
    this.setupWebSocket();
  }

  private setupWebSocket() {
    this.wss.on("connection", (ws, req) => {
      this.handleConnection(ws, req);
    });

    this.wss.on("error", (error) => {
      console.error("[WebSocket] Server error:", error);
    });
  }

  private handleConnection(ws: WebSocket, req: any) {
    const url = new URL(req.url || "", `http://localhost:${this.port}`);
    const sessionId = url.searchParams.get("sessionId");

    if (!sessionId) {
      console.error("[WebSocket] Connection missing sessionId, closing");
      ws.close();
      return;
    }

    const session = this.sessions.get(sessionId);
    if (!session) {
      console.error("[WebSocket] Session not found:", sessionId);
      ws.close();
      return;
    }

    console.error("[WebSocket] Client connected:", sessionId);
    session.ws = ws;

    // Clear connection timeout
    if (session.timeout) {
      clearTimeout(session.timeout);
      session.timeout = null;
    }

    // Send questions to client
    this.sendMessage(ws, {
      type: "NEW_QUESTION",
      payload: session.questions,
    });
    console.error("[WebSocket] Questions sent to client:", sessionId);

    // Set response timeout
    session.timeout = setTimeout(() => {
      console.error("[WebSocket] Session timeout:", sessionId);
      this.handleSessionError(
        sessionId,
        new Error(
          `Timeout: No response within ${this.sessionTimeoutMs / 1000}s`
        )
      );
    }, this.sessionTimeoutMs);

    // Handle messages
    ws.on("message", (rawMessage) => {
      this.handleMessage(sessionId, rawMessage);
    });

    // Handle disconnect
    ws.on("close", () => {
      console.error("[WebSocket] Client disconnected:", sessionId);
    });

    // Handle errors
    ws.on("error", (error) => {
      console.error("[WebSocket] Connection error:", sessionId, error);
      this.handleSessionError(
        sessionId,
        new Error("WebSocket connection error")
      );
    });
  }

  private handleMessage(sessionId: string, rawMessage: any) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      console.error(
        "[WebSocket] Message received but session not found:",
        sessionId
      );
      return;
    }

    try {
      const message = JSON.parse(rawMessage.toString());
      console.error(
        "[WebSocket] Message received:",
        message.type,
        "from",
        sessionId
      );

      if (message.type === "SUBMIT_ANSWERS") {
        // Clear timeout
        if (session.timeout) {
          clearTimeout(session.timeout);
          session.timeout = null;
        }

        // Resolve promise
        session.resolve(message.payload);
        console.error("[WebSocket] Answers submitted:", sessionId);

        // Send close message
        if (session.ws && session.ws.readyState === WebSocket.OPEN) {
          this.sendMessage(session.ws, { type: "CLOSE" });
        }

        // Cleanup session
        this.sessions.delete(sessionId);
      } else if (message.type === "ERROR") {
        this.handleSessionError(
          sessionId,
          new Error(`Client error: ${message.error}`)
        );
      }
    } catch (error) {
      console.error("[WebSocket] Message parse error:", sessionId, error);
      this.handleSessionError(sessionId, new Error("Invalid message format"));
    }
  }

  private sendMessage(ws: WebSocket, message: any) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    } else {
      throw new Error("WebSocket not ready");
    }
  }

  private handleSessionError(sessionId: string, error: Error) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    console.error("[WebSocket] Session error:", sessionId, error.message);

    // Clear timeout
    if (session.timeout) {
      clearTimeout(session.timeout);
      session.timeout = null;
    }

    // Send error message to client before closing
    if (session.ws && session.ws.readyState === WebSocket.OPEN) {
      try {
        this.sendMessage(session.ws, {
          type: "ERROR",
          error: error.message,
        });
      } catch (e) {
        console.error("[WebSocket] Failed to send error to client:", e);
      }
      session.ws.close();
    }

    // Reject promise - this will notify the MCP client (AI)
    session.reject(error);

    // Cleanup session
    this.sessions.delete(sessionId);
  }

  // Create session and open browser
  async createSession(
    sessionId: string,
    questions: any,
    resolve: (result: any) => void,
    reject: (error: Error) => void
  ): Promise<void> {
    console.error("[WebSocket] Creating session:", sessionId);

    const session: SessionState = {
      id: sessionId,
      questions,
      resolve,
      reject,
      ws: null,
      timeout: null,
      createdAt: Date.now(),
    };

    // Set initial timeout (waiting for client connection)
    session.timeout = setTimeout(() => {
      console.error(
        "[WebSocket] Session timeout (client not connected):",
        sessionId
      );
      this.handleSessionError(
        sessionId,
        new Error(
          `Timeout: Client not connected within ${
            this.sessionTimeoutMs / 1000
          }s`
        )
      );
    }, this.sessionTimeoutMs);

    this.sessions.set(sessionId, session);

    // Open browser
    const url = `http://localhost:${this.port}/?sessionId=${sessionId}`;
    console.error("[WebSocket] Opening browser:", url);

    try {
      const open = (await import("open")).default;
      await open(url);
      console.error("[WebSocket] Browser opened:", sessionId);
    } catch (error) {
      console.error("[WebSocket] Failed to open browser:", error);
      this.handleSessionError(sessionId, new Error("Cannot open browser"));
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    console.error("[WebSocket] Cleaning up...");

    // Clear all sessions
    for (const [sessionId] of this.sessions.entries()) {
      this.handleSessionError(sessionId, new Error("Server shutting down"));
    }

    // Close WebSocket server
    return new Promise((resolve) => {
      this.wss.close(() => {
        console.error("[WebSocket] Server closed");
        resolve();
      });
    });
  }

  getSessionCount(): number {
    return this.sessions.size;
  }
}
