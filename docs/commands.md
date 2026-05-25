# Commands Guide

Chat Buddy can be controlled via the Command Line Interface (CLI) where it's running, or directly inside WhatsApp chats.

## CLI Commands

These commands are run in your terminal:

- `chat-buddy init`: Launches the interactive setup wizard to configure your username, agent name, and API keys.
- `chat-buddy run`: Starts the WhatsApp bot and displays the QR code for linking your account.
- `chat-buddy login`: Initiates the Google OAuth flow to grant the bot permission to manage your Google Calendar.
- `chat-buddy key`: Allows you to safely rotate your OpenAI or Google OAuth Client ID & Client Secret without fully resetting the bot.
- `chat-buddy new --config`: Performs a full reconfiguration, clearing previous sessions and allowing you to rename the agent and swap keys.

## In-Chat Commands

These commands can be sent by the user directly in any active WhatsApp chat:

- `/time`: Instantly returns the bot's current local time. Bypasses the AI.
- `/history`: Dumps the recent short-term memory (last 15 messages) for debugging purposes. Bypasses the AI.
- `/reset`: Clears the short-term memory for the current user. Useful if the AI gets confused or stuck in a loop.
- `/schedule [description]`: Specifically triggers the scheduling logic (though natural language scheduling without the slash command is also supported via Agent Handoffs).
