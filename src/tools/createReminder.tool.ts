/**
 * CreateReminder Tool
 */
import { tool } from "@openai/agents";
import { z } from "zod";
import { createReminder } from "../services/gooleReminder.service.js";

export const ReminderInputSchema = z
  .object({
    title: z.string(),
    description: z.string().default(""),
    date: z.string(),
  })
  .strict();

export const ReminderOutputSchema = z
  .object({
    success: z.boolean(),
    message: z.string(),
    eventId: z.string().optional(),
    scheduledFor: z.string().optional(),
    error: z.string().optional(),
  })
  .strict();

export const createReminderTool = tool({
  name: "create_reminder",
  description: "Create a Google Calendar reminder for the user",
  parameters: ReminderInputSchema,

  execute: async (input) => {
    try {
      console.log("TOOL INPUT:", input);
      const result = await createReminder(input.title, input.description ?? "", input.date);
      console.log("TOOL RESULT:", result);
      return {
        success: true,
        message: "Reminder created successfully",
        eventId: (result as any /* eslint-disable-line @typescript-eslint/no-explicit-any */)?.id,
        scheduledFor: input.date,
      };
    } catch (error: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) {
      console.error("TOOL ERROR:", error);
      console.error("ERROR MESSAGE:", error?.message);
      return {
        success: false,
        message: "Failed to create reminder",
        error: error?.message ?? "Unknown error",
      };
    }
  },
});
