/**
 * CalendarAdapter Service
 */
import { google, calendar_v3 } from "googleapis";
import { resolveGoogleTokenPath } from "../config/googleOAuthPaths.js";
import { GoogleAuthError } from "../auth/googleAuth.js";
import fs from "fs";

type EventType = calendar_v3.Schema$Event;

export const createBaseEvent = (
  title: string,
  description: string,
  dateTime: string,
): calendar_v3.Schema$Event => {
  const start = new Date(dateTime);
  const end = new Date(start.getTime() + 60 * 60 * 1000);

  return {
    summary: title,
    description: description,
    start: {
      dateTime: start.toISOString(),
      timeZone: "Asia/Kolkata",
    },
    end: {
      dateTime: end.toISOString(),
      timeZone: "Asia/Kolkata",
    },
  };
};

export const createEvent = async (
  auth: any /* eslint-disable-line @typescript-eslint/no-explicit-any */,
  event: EventType,
): Promise<calendar_v3.Schema$Event> => {
  const cal = google.calendar({
    version: "v3",
    auth,
  });

  try {
    const result = await cal.events.insert({
      calendarId: "primary",
      requestBody: event,
      conferenceDataVersion: event.conferenceData ? 1 : 0,
      sendNotifications: true,
      sendUpdates: "all",
    });

    return result.data;
  } catch (error: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) {
    if (error.code === 401 || (error.message && error.message.includes("Invalid Credentials"))) {
      const tokenPath = resolveGoogleTokenPath();
      if (fs.existsSync(tokenPath)) {
        fs.unlinkSync(tokenPath);
      }
      throw new GoogleAuthError(
        "Google Calendar token expired or revoked. Run 'chat-buddy login' to re-authenticate.",
        "INVALID_AUTH",
      );
    }
    throw error;
  }
};
