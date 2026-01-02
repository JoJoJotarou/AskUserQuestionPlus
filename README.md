# AskUserQuestionPlus

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://img.shields.io/npm/v/ask-user-question-plus.svg)](https://www.npmjs.com/package/ask-user-question-plus)

一个功能强大的 MCP (Model Context Protocol) 服务器，通过精美的 TUI 风格 Web 界面让 LLM（如 Claude）向用户提问。

![TUI Interface](./assets/screenshot.png)

## ✨ 特性

- **🎨 TUI 风格界面**：浏览器中呈现像素级完美的类终端外观（暗/浅色主题）
- **⌨️ 全键盘操作**：支持方向键、Tab、Space、Enter 快捷键
- **📊 丰富交互**：单选、多选、推荐选项、自定义输入（Other）
- **🔄 实时通信**：基于 WebSocket 的实时消息传递
- **⏱️ 超时保护**：可配置超时（默认 10 分钟）
- **📈 可扩展**：支持 1-20 个问题，每个问题选项数量不限

### Claude Code AskUserQuestion Tool vs AskUserQuestionPlus

| 对比项       | AskUserQuestion (内置) | ask-user-question-plus (MCP) |
| ------------ | ---------------------- | ---------------------------- |
| 问题数量限制 | 1-4 个                 | 1-20 个                      |
| 选项数量限制 | 2-4 个                 | 无限制                       |

## 📦 安装

### 方式 1：直接安装（推荐）

```bash
npm install -g ask-user-question-plus
```

### 方式 2：从源码构建

```bash
git clone https://github.com/JoJoJotarou/AskUserQuestionPlus.git
cd AskUserQuestionPlus
npm install
npm run build
```

## 🚀 配置

将此服务器添加到你的 MCP 客户端配置文件（Claude Desktop 的 `claude_desktop_config.json` 或 Claude Code 配置）。

### Claude Desktop 配置

**基础配置：**

```json
{
  "mcpServers": {
    "ask-user-question-plus": {
      "command": "npx",
      "args": ["ask-user-question-plus"]
    }
  }
}
```

**自定义超时（毫秒）：**

```json
{
  "mcpServers": {
    "ask-user-question-plus": {
      "command": "npx",
      "args": ["ask-user-question-plus", "--timeout=300000"]
    }
  }
}
```

### 启动参数

| 参数               | 说明           | 默认值           | 示例               |
| ------------------ | -------------- | ---------------- | ------------------ |
| `--timeout=<毫秒>` | 会话超时时间   | 600000 (10 分钟) | `--timeout=300000` |
| `--port=<端口>`    | WebSocket 端口 | 3456             | `--port=8080`      |

## 📖 使用方法

### 基本流程

1. 启动与 Claude 的对话
2. 让 Claude 使用工具：`使用 ask_user_question_plus 工具问我 3 个问题`
3. 浏览器自动打开问卷界面
4. 使用键盘（方向键、Space、Enter）回答问题
5. 提交后浏览器标签页自动关闭

### 键盘快捷键

| 快捷键             | 功能                          |
| ------------------ | ----------------------------- |
| `↑` `↓`            | 在选项之间移动 / 滚动问题内容 |
| `←` `→` / `Tab`    | 在问题标签页之间切换          |
| `Space`            | 选中/取消选中当前选项         |
| `Cmd/Ctrl + Enter` | 进入审查模式 / 提交答案       |

## 🔧 工具 API

### MCP 工具：`ask_user_question_plus`

**输入 Schema：**

```typescript
{
  questions: [
    {
      id: string;              // 问题唯一标识
      header: string;          // 标签标题（≤12 字符推荐）
      text: string;            // 问题文本
      type: "single" | "multiple";  // 单选或多选
      options: [
        {
          value: string;        // 选项值
          label: string;        // 选项标签
          description?: string; // 选项描述（可选）
          recommended?: boolean;// 是否推荐（可选）
        }
      ]
    }
  ]  // 最少 1 个，最多 20 个问题
}
```

**输出 Schema：**

```typescript
{
  [questionId: string]: string | string[]  // 单选为字符串，多选为数组
}
```

> **💡 提示**：前端会自动为每个问题添加 "Other (自定义输入)" 选项，无需手动指定。

### 使用示例

**单选问题：**

```json
{
  "questions": [
    {
      "id": "framework",
      "header": "Framework",
      "text": "选择你的前端框架：",
      "type": "single",
      "options": [
        {
          "value": "react",
          "label": "React",
          "description": "用于构建用户界面的 JavaScript 库",
          "recommended": true
        },
        {
          "value": "vue",
          "label": "Vue",
          "description": "渐进式 JavaScript 框架"
        }
      ]
    }
  ]
}
```

**多选问题：**

```json
{
  "questions": [
    {
      "id": "features",
      "header": "Features",
      "text": "你需要哪些功能？（可多选）",
      "type": "multiple",
      "options": [
        {
          "value": "auth",
          "label": "用户认证",
          "description": "登录、注册、密码重置"
        },
        {
          "value": "api",
          "label": "REST API",
          "description": "RESTful API 端点"
        },
        {
          "value": "db",
          "label": "数据库",
          "description": "PostgreSQL/MySQL 支持"
        }
      ]
    }
  ]
}
```

## 🛠️ 开发

### 运行开发模式

```bash
npm run dev
```

### 构建项目

```bash
npm run build
```

### 目录结构

```
ask-user-question-plus/
├── src/
│   ├── index.ts           # 主入口文件
│   ├── ws-service.ts      # WebSocket 服务
│   └── mcp-server.ts      # MCP 服务器逻辑
├── public/
│   └── index.html         # TUI 前端界面
├── dist/                  # 编译输出目录
└── package.json           # 项目配置
```

### 技术栈

- **后端**：Node.js 20+, TypeScript, Express, ws, @modelcontextprotocol/sdk, Zod
- **前端**：原生 HTML/CSS/JavaScript（单文件 1184 行）

## 🐳 Docker 部署

```bash
# 使用 Docker Compose
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

## 🤝 贡献

欢迎贡献！请提交 [Issues](https://github.com/JoJoJotarou/AskUserQuestionPlus/issues) 或 Pull Requests。

## 📄 许可证

[MIT License](LICENSE)

## 🔗 相关链接

- [GitHub 仓库](https://github.com/JoJoJotarou/AskUserQuestionPlus)
- [npm 包](https://www.npmjs.com/package/ask-user-question-plus)
- [问题反馈](https://github.com/JoJoJotarou/AskUserQuestionPlus/issues)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Claude Code](https://github.com/anthropics/claude-code)

---

**注意**：此工具需要浏览器支持，确保系统可以自动打开默认浏览器。
