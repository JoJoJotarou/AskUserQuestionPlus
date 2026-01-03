import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { WebSocketService } from "./ws-service.js";

export class MCPServerService {
  private wsService: WebSocketService;

  constructor(wsService: WebSocketService) {
    this.wsService = wsService;
  }

  // Create a new server instance for each request (stateless)
  private createServer(): McpServer {
    const server = new McpServer(
      {
        name: "ask-user-question-plus",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.registerTools(server);
    return server;
  }

  private registerTools(server: McpServer) {
    server.registerTool(
      "ask_user_question_plus",
      {
        description:
          "An MCP-based user interaction tool for asking structured questions and collecting feedback. It supports single-choice and multiple-choice questions, marking recommended options, and flexible numbers of questions and options. An 'Other' (custom input) option is automatically added to each question, making it suitable for complex configuration and decision-making workflows.",
        inputSchema: {
          questions: z
            .array(
              z.object({
                id: z.string().describe("Unique identifier for the question"),
                header: z
                  .string()
                  .max(12)
                  .describe("Short header for the question tab (max 12 chars)"),
                text: z.string().describe("Main text of the question"),
                type: z
                  .enum(["single", "multiple"])
                  .describe("Question type: 'single' or 'multiple'"),
                options: z
                  .array(
                    z.object({
                      value: z.string().describe("Technical value of the option"),
                      label: z.string().describe("Display label for the option"),
                      description: z
                        .string()
                        .optional()
                        .describe("Additional description for the option"),
                      recommended: z
                        .boolean()
                        .optional()
                        .describe("Whether this is a recommended option"),
                    })
                  )
                  .describe(
                    "List of options. Note: An 'Other' option is automatically added for custom user input."
                  ),
              })
            )
            .min(1)
            .max(20)
            .describe("List of questions (up to 20 items)"),
        },
      },
      async ({ questions }) => {
        console.error("[MCP] Tool invoked: ask_user_question_plus");

        if (!questions || !Array.isArray(questions) || questions.length === 0) {
          const error = "Questions list cannot be empty";
          console.error("[MCP] Validation error:", error);
          return {
            content: [{ type: "text", text: `Error: ${error}` }],
            isError: true,
          };
        }

        if (questions.length > 20) {
          const error = "Questions list cannot exceed 20 items";
          console.error("[MCP] Validation error:", error);
          return {
            content: [{ type: "text", text: `Error: ${error}` }],
            isError: true,
          };
        }

        const sessionId = uuidv4();
        console.error("[MCP] Session created:", sessionId);

        try {
          const answer = await new Promise((resolve, reject) => {
            this.wsService
              .createSession(sessionId, questions, resolve, reject)
              .catch(reject);
          });

          console.error("[MCP] User answer received:", sessionId);

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(answer, null, 2),
              },
            ],
          };
        } catch (error: any) {
          console.error("[MCP] Session failed:", sessionId, error.message);

          const errorMessage = error.message || "Unknown error occurred";

          return {
            content: [
              {
                type: "text",
                text: errorMessage,
              },
            ],
            isError: true,
          };
        }
      }
    );
  }

  // Handle StreamableHTTP request
  async handleRequest(req: Request, res: Response): Promise<void> {
    const server = this.createServer();

    try {
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
      });

      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);

      res.on("close", () => {
        console.error("[MCP] Request closed");
        transport.close();
        server.close();
      });
    } catch (error) {
      console.error("[MCP] Request handling error:", error);

      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: {
            code: -32603,
            message: "Internal server error",
          },
          id: null,
        });
      }
    }
  }
}
