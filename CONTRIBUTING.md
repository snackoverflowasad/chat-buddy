# Contributing to Chat Buddy

First off, thank you for considering contributing to Chat Buddy! It's people like you that make it such a great tool.

## Prerequisites

Before you begin, ensure you have met the following requirements:

- **Node.js**: Version 18 or higher is required.
- **WhatsApp Account**: A WhatsApp account on your mobile device (you will need to scan a QR code to link the bot).
- **OpenAI API Key**: Required for the AI-powered capabilities.

## How to Fork and Clone

1. Fork the project on GitHub by clicking the "Fork" button in the top right corner of the repository page.
2. Clone your fork locally to your machine:
   ```bash
   git clone https://github.com/<your-username>/chat-buddy.git
   cd chat-buddy
   ```
3. Add the original repository as an upstream remote to keep your fork up-to-date:
   ```bash
   git remote add upstream https://github.com/snackoverflowasad/chat-buddy.git
   ```

## How to Run Locally

1. Install all dependencies:
   ```bash
   npm install
   ```
2. Set up your environment variables by creating a `.env` file in the root directory:
   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   ```
3. Run the development build:
   ```bash
   npm run dev
   ```
4. When the app starts, it will display a QR code in your terminal. Scan this code with your WhatsApp app (under "Linked Devices") to authenticate the bot.

## Project Structure Walkthrough

The main application code is located in the `src/` directory:

```text
src/
├── agents/       # Definitions for the AI agents built with the OpenAI Agents SDK.
├── cli/          # Command-line interface logic and prompts.
├── config/       # Configuration files and environment variable validation.
├── data/         # Data models, schemas, and constant values.
├── guardrails/   # Safety and validation mechanisms for AI inputs and outputs.
├── services/     # Core business logic and external service integrations.
├── storage/      # Data persistence logic (e.g., chat history, session state).
├── tools/        # Custom tools available to the AI agents.
├── types/        # TypeScript type definitions and interfaces.
├── utils/        # Helper functions and common utilities.
├── bot.ts        # The main bot initialization and WhatsApp client event handling logic.
└── index.ts      # The main entry point of the application.
```

## How to Pick an Issue

1. Check the [Issues](https://github.com/snackoverflowasad/chat-buddy/issues) tab for open issues.
2. Look for issues labeled `good first issue` or `help wanted` if you're new to the project.
3. Comment on the issue you want to work on, saying you're taking it so others know it's being worked on.
4. If you have a new idea for a feature or an architectural change, please open an issue to discuss it before you start coding!

## Pull Request Guidelines

1. **Create a new branch** for your feature or bug fix:
   ```bash
   git checkout -b feature/my-awesome-feature
   ```
2. Make your changes and commit them with clear, descriptive commit messages.
3. Push your branch to your fork:
   ```bash
   git push origin feature/my-awesome-feature
   ```
4. Open a Pull Request from your fork to the `main` branch of the original repository.
5. Provide a detailed description of your changes in the PR. Link any relevant issues (e.g., "Fixes #123").
6. Wait for a review! We will review your code and may suggest some changes.

## Docker Dev Setup Instructions

If you prefer to run the project using Docker without installing Node.js locally, follow these steps:

1. Ensure you have [Docker](https://docs.docker.com/get-docker/) installed on your machine.
2. Build the Docker image:
   ```bash
   docker build -t chat-buddy .
   ```
3. Run the container, passing in your OpenAI API key:
   ```bash
   docker run -it -e OPENAI_API_KEY=your_openai_api_key_here chat-buddy
   ```
   _(Note: The app requires scanning a QR code from the terminal, so you must run the container in interactive mode `-it` to see the terminal output)._

## How to Test Changes

- Write unit tests for any new features or bug fixes you introduce (if a test suite exists).
- Run the existing test suite before submitting your PR to ensure nothing is broken:
  ```bash
  npm test
  ```
- **Manually verify** your changes by running the bot locally and interacting with it via WhatsApp to ensure the core functionality works as expected.
