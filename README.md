<div align="center">

# 🤖 Chat Buddy

[![npm version](https://img.shields.io/npm/v/chat-buddy?style=for-the-badge&color=CB3837&logo=npm&logoColor=white)](https://www.npmjs.com/package/chat-buddy)
[![npm downloads](https://img.shields.io/npm/dm/chat-buddy?style=for-the-badge&color=0576b9&logo=npm&logoColor=white)](https://www.npmjs.com/package/chat-buddy)
[![license](https://img.shields.io/github/license/shouri123/BotWithHaki?style=for-the-badge&color=green)](https://github.com/shouri123/BotWithHaki)
[![node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)

**A Highly Personalized, Personality-Driven WhatsApp AI Assistant**

Built with the OpenAI Agents SDK · Custom Tools · Per-User Memory · Guardrails

---

[Installation](#-installation) · [Quick Start](#-quick-start) · [Commands](#-commands) · [Architecture](#%EF%B8%8F-architecture) · [Chat Commands](#-in-chat-commands) · [Security](#-security--privacy)

</div>

---

## 📖 What is Chat Buddy?

**Chat Buddy** is an AI-powered WhatsApp assistant that runs entirely from your terminal. It acts as your personal proxy — answering messages, scheduling calendar events, and managing chats with a personality you define.

### ✨ Highlights

| Feature | Description |
|---------|-------------|
| 🧠 **Agentic Core** | Powered by the OpenAI Agents SDK with dynamic tool-calling |
| 💬 **Short-Term Memory** | Per-user conversation context for natural, flowing replies |
| 🔐 **AES-256 Encryption** | API keys encrypted locally — never stored in plain text |
| 🛡️ **Guardrails** | Output validation layer blocks unsafe or off-brand responses |
| 📅 **Google Calendar** | Schedule meetings & reminders directly from WhatsApp |
| 🌐 **Zero Config Deploy** | Install globally, run the wizard, scan QR — done |

---

## 📦 Installation

```bash
# Install globally
npm i -g chat-buddy

# Or use directly with npx (no install needed)
npx chat-buddy init
```

> **Requirements:** Node.js ≥ 18.0.0

---

## 🚀 Quick Start

```bash
# Step 1 — Run the interactive setup wizard
npx chat-buddy init

# Step 2 — Start the bot
npx chat-buddy run

# Step 3 — Scan the QR code in WhatsApp → Linked Devices → Link a Device
```

That's it. Your AI assistant is now live on WhatsApp.

---

## 🛠 Commands

Chat Buddy provides a full CLI to manage your bot lifecycle:

### `chat-buddy init`

```bash
npx chat-buddy init
```

Launches the **interactive setup wizard**. You'll be prompted to enter:

| Prompt | Description |
|--------|-------------|
| **Username** | Your name — the agent uses this to know who it represents |
| **Agent Name** | The bot's display name (e.g. "Luffy", "Jarvis") |
| **OpenAI API Key** | Your `sk-...` key that powers the AI agent |
| **Google API Key** | Your `AIza...` key for Google Calendar integration |

All secrets are **encrypted with AES-256-CBC** and stored at `~/.botwithaki/config.json`. They are never sent anywhere except to the respective API services.

> ⚠️ Running `init` again will **overwrite** your existing configuration.

---

### `chat-buddy run`

```bash
npx chat-buddy run
```

Starts the WhatsApp bot. This command:

1. Loads and decrypts your saved configuration
2. Falls back to `.env` file if no config is found
3. Validates that required API keys exist
4. Initializes the `whatsapp-web.js` client
5. Displays a **QR code** in the terminal for WhatsApp linking

**First-time setup:**

```
Scan QR to login:
▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
█ ▄▄▄▄▄ █ ▀▄ ...
█ █   █ █▀▀▄ ...
...
```

Open WhatsApp → **Settings** → **Linked Devices** → **Link a Device** → Scan the code.

**Subsequent runs:** Your session is persisted automatically. No QR scan needed unless you run `chat-buddy new --config` to reset auth.

---

### `chat-buddy login` (alias: `chat-buddy log`)

```bash
npx chat-buddy login
```

Generates a **Google Calendar OAuth token** (`token.json`) by opening the Google consent screen in your browser.

| Detail | Value |
|--------|-------|
| **Scope** | `https://www.googleapis.com/auth/calendar` |
| **Requires** | `credentials.json` in your working directory |
| **Output** | `token.json` saved to your working directory |

This is required for the bot's calendar features (scheduling meetings, setting reminders).

> **How to get `credentials.json`:**
> 1. Go to [Google Cloud Console](https://console.cloud.google.com/)
> 2. Create a project → Enable the **Google Calendar API**
> 3. Create **OAuth 2.0 credentials** (Desktop App type)
> 4. Download the JSON and rename it to `credentials.json`
> 5. Place it in the directory where you run `chat-buddy`

---

### `chat-buddy key`

```bash
npx chat-buddy key
```

**Rotate your API keys** without re-running the full setup wizard. Useful when:
- Your OpenAI key has been compromised or expired
- You want to switch to a different Google project
- You're migrating to a new API key

**How it works:**
1. Loads your existing encrypted config
2. Prompts for new keys — **leave blank to keep the current value**
3. Re-encrypts and saves the updated config instantly

```
  🔄 API Key Rotation
  ─────────────────────────────────────────

  Leave a field blank to keep the current key.

  ➤ New OpenAI API key (sk-...): sk-proj-new-key-here
  ➤ New Google API key (AIza...):            ← left blank, keeps existing

  ✔ API keys updated securely!
```

---

### `chat-buddy new --config`

```bash
npx chat-buddy new --config
```

The **all-in-one reconfiguration** command. Use this when you want to give your bot a fresh start:

| Step | Action |
|------|--------|
| 🤖 **Rename Agent** | Change the bot's agent name (e.g. "Luffy" → "Jarvis") |
| 🔑 **Rotate Keys** | Enter new OpenAI and/or Google API keys |
| 🗑️ **Reset WhatsApp** | Deletes the saved WhatsApp session (`~/.botwithaki/.wwebjs_auth`) |
| 🗑️ **Reset Google** | Deletes the Google OAuth token (`token.json`) |

After running this, the next `chat-buddy run` will require a fresh QR scan and (optionally) re-running `chat-buddy login` for calendar access.

```
  ⚡ Chat-Buddy — Full Reconfiguration
  ─────────────────────────────────────────

  🤖 New Agent Identity
     Current agent name: Luffy
  ➤ New agent name (leave blank to keep): Jarvis

  🔑 API Key Rotation
     Leave blank to keep the current key.
  ➤ New OpenAI API key (sk-...):
  ➤ New Google API key (AIza...):

  🗑  Clearing auth sessions...
     ✓ WhatsApp session cleared
     ✓ Google token removed

  ✔ Reconfiguration complete!

  ✓ Agent name: Jarvis
  ✓ API keys updated securely
  ✓ Auth sessions cleared — re-scan QR on next run
```

---

## ⚙️ Architecture

```
┌──────────────────────────────────────────────────┐
│                  WhatsApp Client                 │
│              (whatsapp-web.js + QR)              │
└───────────────────────┬──────────────────────────┘
                        │ incoming message
                        ▼
┌──────────────────────────────────────────────────┐
│              Message Handler Service             │
│       (routing, command parsing, flow ctrl)      │
└───────────────────────┬──────────────────────────┘
                        │
              ┌─────────┴─────────┐
              ▼                   ▼
┌──────────────────┐   ┌──────────────────────────┐
│  Memory Service  │   │   OpenAI Agent Runner    │
│ (per-user context│   │  (Agents SDK + tools)    │
│  last 15 msgs)   │   │                          │
└──────────────────┘   └────────────┬─────────────┘
                                    │
                        ┌───────────┴───────────┐
                        ▼                       ▼
              ┌──────────────────┐   ┌─────────────────┐
              │   Tool Layer     │   │  Guardrails     │
              │ • /time          │   │ • Output filter │
              │ • /schedule      │   │ • Safety check  │
              │ • /history       │   │ • Persona lock  │
              │ • Google Calendar│   │                 │
              └──────────────────┘   └─────────────────┘
                                              │
                                              ▼
                                    ┌─────────────────┐
                                    │  WhatsApp Reply │
                                    └─────────────────┘
```

---

## 💬 In-Chat Commands

These commands can be sent directly in any WhatsApp chat to control the bot:

| Command | Description |
|---------|-------------|
| `/history` | Display the recent conversation context (useful for debugging) |
| `/reset` | Clear the bot's short-term memory for your user |
| `/schedule` | Schedule a Google Calendar event via natural language |
| `/time` | Get the current time from the bot |

---

## 🗂 Project Structure

```
BotWithHaki/
├── src/
│   ├── cli/                 # CLI commands
│   │   ├── index.ts         # Command registration (init, run, log, key, new)
│   │   ├── init.ts          # Interactive setup wizard
│   │   └── run.ts           # Bot startup logic
│   ├── config/              # Agent personality & protocol settings
│   ├── guardrails/          # Output validation & safety tripwires
│   ├── services/            # Message handling, memory, command parsing
│   ├── storage/             # Encrypted config & chat history stores
│   ├── tools/               # Agent-callable tools (time, calendar, etc.)
│   ├── utils/               # Google auth, banner, helpers
│   ├── bot.ts               # WhatsApp client configuration
│   └── index.ts             # Library exports for programmatic usage
├── package.json
├── tsconfig.json
├── LICENSE
└── README.md
```

---

## 🔒 Security & Privacy

| Layer | How it works |
|-------|-------------|
| **Encrypted Storage** | API keys are encrypted with **AES-256-CBC** using a machine-derived key (hostname + username + salt). Config files are useless if copied to another machine. |
| **Ephemeral Memory** | Chat history lives only in RAM (last 15 messages per user). Cleared completely on restart. No remote databases. |
| **Guardrails** | A validation pipeline ensures the AI never exposes system config, generates offensive content, or responds to out-of-scope queries. |
| **Restrictive Permissions** | On Unix systems, config files are set to `600` (owner-only) and the storage directory to `700`. |

---

## 🔧 Development

```bash
# Clone the repo
git clone https://github.com/shouri123/BotWithHaki.git
cd BotWithHaki

# Install dependencies
npm install

# Build
npm run build

# Run in dev mode (build + start)
npm run dev
```

---

## Installation Notes
Some deprecation warnings may appear during `npm install`. 
These come from `whatsapp-web.js` internals and do not affect functionality.

---

## 📄 License

This project is licensed under the **[MIT License](LICENSE)**.

---

<div align="center">

**Built with ❤️ by [Asad Hussain](https://www.asadhussain.in/)**

[![GitHub](https://img.shields.io/badge/GitHub-snackoverflowasad-181717?style=for-the-badge&logo=github)](https://github.com/snackoverflowasad)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Asad%20Hussain-0A66C2?style=for-the-badge&logo=linkedin)](https://www.linkedin.com/in/asad-hussain-765502319/)
[![Portfolio](https://img.shields.io/badge/Portfolio-asadhussain.in-FF5722?style=for-the-badge&logo=google-chrome&logoColor=white)](https://www.asadhussain.in/)

</div>
