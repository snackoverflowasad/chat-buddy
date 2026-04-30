/**
 * GooleReminder Service
 */
import { google } from "googleapis";
import { getAuth } from "../utils/googleAuth.js";
import { calendar_v3 } from "googleapis";
import { createEvent } from "../utils/response.js";

type eventType = calendar_v3.Schema$Event;

export const createReminder = async (
  title: string,
  description: string,
  dateTime: string,
): Promise<void> => {
  const auth = await getAuth();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const calendar = google.calendar({ version: "v3", auth: auth as any /* eslint-disable-line @typescript-eslint/no-explicit-any */ });
  const start = new Date(dateTime);
  const end = new Date(start.getTime() + 60 * 60 * 1000);

  const event: eventType = {
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
    reminders: {
      useDefault: false,
      overrides: [
        { method: "popup", minutes: 10 },
        { method: "email", minutes: 10 },
      ],
    },
  };
  const res = createEvent(event);
  console.log("Reminder created successfully!");
  res
    .catch((err) => {
      console.log(err);
    })
    .then((res) => {
      console.log(res);
    });
};
