/**
 * Agent Guardrails
 * Uses an LLM to evaluate inputs and outputs to ensure safety.
 * Blocks explicit language, code generation, essay writing, and sensitive data.
 */
import { InputGuardrail, OutputGuardrail, Agent, run } from "@openai/agents";

const safetyAgent = new Agent({
  name: "Safety_Guardrail_Agent",
  model: "gpt-3.5-turbo",
  instructions: `You are a strict safety and content moderation guardrail for a WhatsApp bot.
Your job is to analyze the provided text and determine if it violates any of the following rules:
1. Contains explicit, offensive, abusive, or bad words in English, Hindi, or ANY other language (e.g., slurs, profanity, gaali).
2. Asks to write code, scripts, or programs (e.g., Python, JavaScript, React).
3. Asks to write essays, articles, or long stories.
4. Contains sensitive data like Credit Card numbers or Social Security Numbers.

If the text violates ANY of these rules, you must output exactly: UNSAFE
If the text is safe (e.g., casual chatting, scheduling meetings, talking about the user), output exactly: SAFE

Output ONLY the word UNSAFE or SAFE. Do not explain your reasoning.`,
});

const checkContentSafety = async (text: string): Promise<boolean> => {
  try {
    const result = await run(safetyAgent, text);
    const evaluation = result.finalOutput?.trim().toUpperCase();

    if (evaluation === "UNSAFE") {
      return false;
    }

    return true;
  } catch (error) {
    console.error("Safety Agent evaluation failed:", error);
    return true;
  }
};

export const agentGuardrail: OutputGuardrail = {
  name: "output_guardrail",
  execute: async (output: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) => {
    const text = typeof output === "string" ? output : JSON.stringify(output);

    const isSafe = await checkContentSafety(text);

    if (!isSafe) {
      return {
        outputInfo: "Output blocked due to inappropriate or restricted content.",
        tripwireTriggered: true,
      };
    }

    return {
      outputInfo: null,
      tripwireTriggered: false,
    };
  },
};

export const inputGuardrails: InputGuardrail = {
  name: "input_guardrail",
  execute: async (input: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) => {
    const text = typeof input === "string" ? input : JSON.stringify(input);

    const isSafe = await checkContentSafety(text);

    if (!isSafe) {
      return {
        inputInfo: "Input blocked due to restricted content.",
        outputInfo: null,
        tripwireTriggered: true,
      };
    }

    return {
      inputInfo: null,
      outputInfo: null,
      tripwireTriggered: false,
    };
  },
};
