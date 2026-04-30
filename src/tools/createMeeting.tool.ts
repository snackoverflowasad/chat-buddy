/**
 * CreateMeeting Tool
 */
import { tool } from "@openai/agents";
import { z } from "zod";
import pc from "picocolors";
import { createMeeting } from "../services/googleMeet.service.js";
import { getRequestedByFromContext } from "../storage/runContext.js";
import { addSessionMeetingRecord } from "../storage/sessionMeetingStore.js";

export const MeetingInputSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().default(""),
  date: z.string().describe("ISO 8601 datetime string"),
  attendees: z
    .array(z.string().email("Invalid email format"))
    .min(1, "At least one attendee is required"),
});

export const MeetingOutputSchema = z
  .object({
    success: z.boolean(),
    message: z.string(),
    eventId: z.string().optional(),
    meetLink: z.string().url().optional(),
    scheduledFor: z.string().optional(),
    error: z.string().optional(),
  })
  .strict();

export type MeetingOutput = z.infer<typeof MeetingOutputSchema>;

export const createMeetingTool = tool({
  name: "create_meeting",
  description: "Create a Google Calendar meeting with a Google Meet link and invite attendees",
  parameters: MeetingInputSchema,

  execute: async (input): Promise<MeetingOutput> => {
    try {
      const result = await createMeeting(
        input.title,
        input.description ?? "",
        input.date,
        input.attendees,
      );

      const requestedBy = getRequestedByFromContext() ?? "unknown";
      const meetLink = result?.hangoutLink ?? "N/A";

      if (result?.hangoutLink) {
        addSessionMeetingRecord({
          requestedBy,
          title: input.title,
          meetingTime: input.date,
          meetLink: result.hangoutLink,
          eventId: result.id ?? undefined,
        });
      }

      console.log(pc.green("[meeting]"));
      console.log(pc.green(`requestedBy: ${requestedBy}`));
      console.log(pc.green(`title: ${input.title}`));
      console.log(pc.green(`dateTime: ${input.date}`));
      console.log(pc.green(`meetLink: ${meetLink}`));

      const output: MeetingOutput = {
        success: true,
        message: result?.hangoutLink
          ? `Meeting created successfully. Meet link: ${result.hangoutLink}. Time: ${input.date}`
          : "Meeting created successfully",
        eventId: result?.id ?? undefined,
        meetLink: result?.hangoutLink ?? undefined,
        scheduledFor: input.date,
      };

      return MeetingOutputSchema.parse(output);
    } catch (error: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) {
      console.error("TOOL ERROR:", error);
      console.error("ERROR MESSAGE:", error?.message);
      return MeetingOutputSchema.parse({
        success: false,
        message: "Failed to create meeting",
        error: error?.message ?? "Unknown error",
      });
    }
  },
});
