/**
 * Response
 */
import { google, calendar_v3 } from "googleapis";
import { getAuth } from "../utils/googleAuth.js";

type EventType = calendar_v3.Schema$Event;

export const createEvent = async (event: EventType): Promise<calendar_v3.Schema$Event> => {
  const auth = await getAuth();

  const cal = google.calendar({
    version: "v3",
    auth: auth as any, // eslint-disable-line @typescript-eslint/no-explicit-any
  });

  const result = await cal.events.insert({
    calendarId: "primary",
    requestBody: event,
    conferenceDataVersion: event.conferenceData ? 1 : 0,
    sendNotifications: true,
    sendUpdates: "all",
  });

  return result.data;
};
