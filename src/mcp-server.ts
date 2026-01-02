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
          "一个基于 MCP 的用户交互工具，用于向用户提出结构化问题并收集反馈。该工具支持单选、多选类型的问题，允许标记推荐选项，并支持任意数量的问题与答案选项。前端会自动为每个问题添加 'Other'（自定义输入）选项，适用于复杂配置与决策流程。",
        inputSchema: {
          questions: z
            .array(
              z.object({
                id: z.string().describe("问题唯一标识"),
                header: z
                  .string()
                  .max(12)
                  .describe("问题标题（最多 12 个字符）"),
                text: z.string().describe("问题文本"),
                type: z
                  .enum(["single", "multiple"])
                  .describe("问题类型：single（单选）或 multiple（多选）"),
                options: z
                  .array(
                    z.object({
                      value: z.string().describe("选项值"),
                      label: z.string().describe("选项标签"),
                      description: z
                        .string()
                        .optional()
                        .describe("选项描述（可选）"),
                      recommended: z
                        .boolean()
                        .optional()
                        .describe("是否为推荐选项（可选）"),
                    })
                  )
                  .describe(
                    "选项列表（不限数量）。注意：前端会自动添加 'Other'（自定义输入）选项，用户可自定义输入。"
                  ),
              })
            )
            .min(1)
            .max(20)
            .describe("问题列表（最多可支持 20 个问题）"),
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
