# Agents and Tools

Chat Buddy utilizes the `@openai/agents` SDK to dynamically determine when to chat naturally and when to trigger specific tools or handoffs.

## The Core Agent

The primary agent is initialized with a distinct personality configured via `src/agents/agent.servce.ts`. By default, the agent is designed to be:

- Casual, funny, and street-smart.
- A reflection of the user's vibe.
- Capable of answering questions, writing, or planning.

### Handoffs

If the user requests to set up a meeting or a reminder, the Core Agent performs a **handoff** to the `setReminderandMeetAgent`. This secondary agent is strictly responsible for interacting with the Google Calendar API.

## Custom Tools

The agent has access to several custom tools written in TypeScript:

- **`getTime`**: Returns the current time in ISO format (Asia/Kolkata timezone).
- **`getChatHistory`**: Retrieves the recent conversation history for deep context.
- **`getStarredContacts`**: Can fetch specific contacts if requested.
- **Google Calendar Services**: The bot can read and write to your Google Calendar to schedule meetings (generating Google Meet links) and set reminders.

Adding new tools is straightforward: simply create a new tool definition in `src/tools/` and add it to the `tools` array in the agent configuration inside `src/agents/agent.servce.ts`.
