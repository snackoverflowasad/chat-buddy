import { Agent, InputGuardrail, OutputGuardrail, run } from "@openai/agents";
import z from "zod";
// import { handleMessages } from "../services/messageHandler.service.js";

// output guardrails
export const agentGuardrail: OutputGuardrail = {
  name: "output_guardrail",
  execute: async (args) => {
    try {
      const agentOutput = args.agentOutput as string;
      const res = await run(checkOutput, agentOutput);
      const isSafe = res.finalOutput?.isSafe === true;
      return {
        outputInfo: res.finalOutput?.outputInfo ?? null,
        tripwireTriggered: !isSafe,
      };
    } catch (error) {
      console.error("Guardrail execution error:", error);
      return {
        outputInfo: "Guardrail internal error",
        tripwireTriggered: false,
      };
    }
  },
};

const checkOutput = new Agent({
  name: "Output checker",
  instructions:
    "Validates the agent's response to ensure it is safe, appropriate, and free from offensive language before sending it to the user.",
  outputType: z.object({
    outputInfo: z.string().optional().describe("reason why it is not safe"),
    isSafe: z.boolean().describe("if output is safe"),
  }),
});

// input guardrails
export const inputGuardrails: InputGuardrail = {
  name: "input_guardrail",
  execute: async (args) => {
    try {
      const userMessage = args.input as string;
      const res = await run(checkInput, userMessage);
      const isSafe = res.finalOutput?.isSafe === true;
      return {
        inputInfo: res.finalOutput?.inputInfo ?? null,
        outputInfo: res.finalOutput?.inputInfo ?? null,
        tripwireTriggered: !isSafe,
      };
    } catch (error) {
      console.error("Guardrail execution error:", error);
      return {
        inputInfo: "Guardrail internal error",
        outputInfo: "Guardrail internal error",
        tripwireTriggered: false,
      };
    }
  },
};

const checkInput = new Agent({
  name: "Input checker",
  instructions: `Validate user input before sending it to the agent.
                 -  Ensure the input is:
                 -  Safe and appropriate
                 -  Free from offensive, abusive, or harmful language
                 -  Clear and concise
                 -  Related to the user’s request or context
                 -  Clear and understandable
                 -  If the input contains offensive or unsafe content:
                 -  Do NOT send it to the agent.
                 -  No GF/BF thing or specifically couple related thing.
                 -  Ask the user to rephrase politely.
                 -  If the input is unclear, incomplete, or confusing:
                 -  Do NOT forward it directly.
                 -  Ask a clarifying question to help fix the prompt.
                 -  If the input is valid:
                 -  Forward it to the agent without modification (or after minor cleaning like trimming spaces).
                 -  When asking for clarification:
                 -  Be polite and helpful.
                 -  Guide the user toward writing a clear and specific prompt.`,
  outputType: z.object({
    inputInfo: z
      .string()
      .optional()
      .describe("Reason or additional information about the validation result"),

    isSafe: z
      .boolean()
      .describe("Indicates whether the user input is safe and appropriate"),
  }),
});
