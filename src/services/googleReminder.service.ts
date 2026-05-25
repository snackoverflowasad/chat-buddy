/**
 * GoogleReminder Service
 */
import { calendar_v3 } from "googleapis";
import { createEvent, createBaseEvent } from "./calendarAdapter.service.js";
import { getAuthedClient } from "../auth/googleAuthBootstrap.js";

type eventType = calendar_v3.Schema$Event;

export const createReminder = async (
  title: string,
  description: string,
  dateTime: string,
): Promise<calendar_v3.Schema$Event> => {
  const baseEvent = createBaseEvent(title, description, dateTime);

  const event: eventType = {
    ...baseEvent,
    reminders: {
      useDefault: false,
      overrides: [
        { method: "popup", minutes: 10 },
        { method: "email", minutes: 10 },
      ],
    },
  };

  const authClient = getAuthedClient();

  return await createEvent(authClient, event);
};
