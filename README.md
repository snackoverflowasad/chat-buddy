<div align="center">
<h1>Chat Buddy</h1>

[![npm version](https://img.shields.io/npm/v/chat-buddy)](https://www.npmjs.com/package/chat-buddy)
[![npm downloads](https://img.shields.io/npm/dm/chat-buddy)](https://www.npmjs.com/package/chat-buddy)
[![license](https://img.shields.io/github/license/Asad-bot07/BotWithHaki)](https://github.com/Asad-bot07/BotWithHaki)

  <p><strong>A Highly Personalized, Personality-Driven WhatsApp AI Assistant</strong></p>

  <p>
    Built with the OpenAI Agents SDK, custom tools, memory architecture, and robust guardrails.
  </p>
</div>

---

## 📖 Overview

**Chat Buddy** is an advanced WhatsApp AI assistant packaged as a CLI tool. Originally built to act as a personal proxy when unavailable, it offers a seamless blend of context-aware intelligence, automated scheduling, and a uniquely engaging personality.

Whether you need it to mirror conversational slang, schedule calendar events, or just manage your WhatsApp chats smartly while you're busy, Chat Buddy delivers an intelligent, personality-driven bot experience.

### 🌟 Key Capabilities
- **Agentic Core**: Built on the OpenAI Agents SDK for dynamic, tool-enabled responses.
- **Short-Term Memory**: Per-user context tracking to ensure natural, flowing conversations.
- **Interactive CLI Setup**: Secure onboarding wizard to locally encrypt API keys and preferences.
- **Tool-Calling Ecosystem**: Automatically handles tasks like fetching history, returning current time, or scheduling.
- **Guardrail Protected**: Output validation layer prevents undesirable or unsafe language.

---

## 🚀 Getting Started

### 1. Install

```bash
npm i chat-buddy
```

### 2. Initialize

Run the setup wizard to configure your bot identity and API keys:

```bash
npx chat-buddy init
```

You'll be asked for:
- **Username** — your name (so the agent knows who it represents).
- **Agent Name** — what your bot will be called.
- **OpenAI API Key** — your `sk-...` key to power the agent.
- **Google API Key** — for Google Calendar integrations.

> All keys are encrypted with AES-256 and stored locally. They are **never** sent anywhere except to the respective API services.

### 3. Start the Bot

```bash
npx chat-buddy run
```

1. A **QR code** will appear in your terminal.
2. Open **WhatsApp** on your phone → Settings → **Linked Devices** → **Link a Device**.
3. Scan the terminal's QR code.
4. The terminal will log: `WhatsApp Bot is READY and connected!`

> **Session Persistence**: Your session is saved securely. On subsequent runs, you won't need to scan the QR code again unless you reset auth sessions.

---

## 🛠 CLI Commands

| Command | Description |
|---|---|
| `npx chat-buddy init` | Run the interactive setup wizard (username, agent name, API keys) |
| `npx chat-buddy run` | Start the WhatsApp AI bot |
| `npx chat-buddy log` | Generate a Google Calendar OAuth token (`token.json`) |
| `npx chat-buddy key` | Rotate/update your OpenAI and Google API keys |
| `npx chat-buddy new --config` | Full reconfiguration — change agent name, rotate API keys & reset all auth sessions (WhatsApp + Google) |

### Command Details

#### `chat-buddy init`
Interactive setup wizard. Prompts for your name, agent name, OpenAI API key, and Google API key. Encrypts all secrets and writes them to `~/.botwithaki/config.json`.

#### `chat-buddy run`
Starts the WhatsApp bot. Loads your encrypted config, sets environment variables, and initialises the `whatsapp-web.js` client. A QR code is printed for first-time linking.

#### `chat-buddy log`
Launches Google's OAuth consent flow in your browser so you can authorise Calendar access. Saves the resulting token to `token.json` in your working directory. This replaces the old `npm run log` workflow.

#### `chat-buddy key`
Lets you swap out your OpenAI and/or Google API keys without re-running the full setup. Leave a field blank to keep the current key. Keys are re-encrypted and saved instantly.

#### `chat-buddy new --config`
The all-in-one reconfiguration command:
1. **Change agent name** — give your bot a new identity.
2. **Rotate API keys** — enter new OpenAI/Google keys (leave blank to keep).
3. **Reset auth sessions** — deletes the stored WhatsApp session and Google token so you start fresh on the next `run`.

---

## ⚙️ How It Works

```text
Incoming WhatsApp Message
       ↓
Message Handler (Flow Controller)
       ↓
Memory Store (Context Injection)
       ↓
OpenAI Agent Execution (Tool Invocation)
       ↓
Guardrails Layer (Safety & Persona Check)
       ↓
WhatsApp Reply
```

### In-chat Commands
| Command | Action |
|---|---|
| `/history` | Display recent chat context for debugging |
| `/reset` | Clear short-term user memory |
| `/schedule` | Schedule a Google Calendar event |
| `/time` | Show the current time |

---

## 🗂 Project Structure

```text
├── src/
│   ├── cli/             # CLI commands (init, run, log, key, new)
│   ├── config/          # Agent instructions and core protocol settings
│   ├── guardrails/      # Output validation & tripwires
│   ├── services/        # Message handling, memory, and command parsing
│   ├── storage/         # Secure local caching of keys and chat history
│   ├── tools/           # Callable tools inside the AI Agent
│   ├── utils/           # Google auth helper, banner, etc.
│   ├── index.ts         # Library exports for programmatic usage
│   └── bot.ts           # whatsapp-web.js client configuration
└── package.json
```

---

## 🔒 Safety & Privacy

1. **Guardrails**: A stringent output validation pipeline ensures the AI never exposes personal system configurations, generates offensive content, or answers out-of-bounds queries.
2. **Ephemeral Memory**: Chat history lives solely in RAM. It is cleared on restart — no remote databases involved.
3. **Encrypted Credentials**: API keys are encrypted with AES-256-CBC using a machine-derived key. Your secrets are useless if the config file is copied to another machine.

---

## 📄 License & Contact

This project is licensed under the **[MIT License](LICENSE)**.

Developed by [Asad Hussain](mailto:techie.asad.dev@gmail.com).  
- **GitHub**: [@snackoverflowasad](https://github.com/snackoverflowasad)  
- **LinkedIn**: [Asad Hussain](https://www.linkedin.com/in/asad-hussain-765502319/)  
- **Portfolio**: [asadhussain.in](https://www.asadhussain.in/)