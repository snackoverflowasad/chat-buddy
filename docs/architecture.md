# System Architecture

Chat Buddy is built to be a robust, private, and flexible AI assistant on WhatsApp. It leverages `whatsapp-web.js` for interacting with the WhatsApp network and Open Router for AI responses.

## High-Level Flow

1. **WhatsApp Client**: The bot connects to WhatsApp via a headless browser session (managed by Puppeteer). It scans for new messages and triggers events.
2. **Message Handler (`src/services/messageHandler.service.ts`)**:
   - Filters out bot messages, old messages, and broadcast messages.
   - Evaluates if the message is a command (e.g., `/time`, `/reset`). If so, it processes it immediately.
   - For regular messages, it utilizes a **Debounce Mechanism** (combining rapid messages from the same user).
3. **Agent Orchestration (`src/agents/agent.servce.ts`)**:
   - Compiles short-term chat history for context.
   - Initializes the Open Router chat flow with personality prompts and custom tools.
   - Evaluates handoffs (e.g., if the user wants to schedule a meeting, it hands off to the Calendar agent).
4. **Response**: The final AI-generated response (or command output) is sent back to the user on WhatsApp.

## Message Debouncing

To prevent excessive API calls and to handle the way humans naturally text (sending multiple short messages in a row), Chat Buddy buffers messages.

- By default, it waits `2200ms` (configurable via `CHAT_BUDDY_RESPONSE_DEBOUNCE_MS`) before sending the batched messages to the AI.
- This significantly reduces token usage and makes the bot's replies feel more cohesive.

## Security & Storage

- **Config Storage (`src/storage/configStore.ts`)**: API keys (Open Router, Google) are encrypted locally using `AES-256-CBC`. The encryption key is dynamically derived from your machine's hostname and username. Keys are never stored in plain text.
- **Memory (`src/storage/chatHistoryStore.ts`)**: Chat history is stored in ephemeral memory (RAM), retaining the last 15 messages per user for context. This memory is wiped upon reboot, ensuring privacy.
