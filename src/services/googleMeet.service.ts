/**
 * GoogleMeet Service
 */
import { google } from "googleapis";
import { getAuth } from "../utils/googleAuth.js";
import { calendar_v3 } from "googleapis";
import { createEvent } from "../utils/response.js";

type eventType = calendar_v3.Schema$Event;

export const createMeeting = async (
  title: string,
  description: string,
  date: string,
  attendeeEmails: string[],
): Promise<calendar_v3.Schema$Event> => {
  const auth = await getAuth();
  google.calendar({ version: "v3", auth: auth as any /* eslint-disable-line @typescript-eslint/no-explicit-any */ });

  const event: eventType = {
    summary: title,
    description,
    start: {
      dateTime: date,
      timeZone: "Asia/Kolkata",
    },
    end: {
      dateTime: new Date(new Date(date).getTime() + 60 * 60 * 1000).toISOString(),
      timeZone: "Asia/Kolkata",
    },
    attendees: attendeeEmails.map((email) => ({ email })),
    conferenceData: {
      createRequest: {
        requestId: Math.random().toString(36).substring(7),
      },
    },
  };

  const createdEvent = await createEvent(event);
  return createdEvent;
};
