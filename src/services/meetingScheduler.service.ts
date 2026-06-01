/**
 * Meeting Scheduler Service
 */
import { createMeeting } from "./googleMeet.service.js";
import { addSessionMeetingRecord } from "../storage/sessionMeetingStore.js";
import { GoogleAuthError } from "../auth/googleAuth.js";
import { loadConfig } from "../storage/configStore.js";
import { resolveAuthContext, loadToken } from "../auth/googleAuth.js";

const OWNER_TIMEZONE = process.env.OWNER_TIMEZONE?.trim() || "Asia/Kolkata";

export type ScheduledMeetingResult = {
  success: boolean;
  reply: string;
  eventId?: string;
  meetLink?: string;
  scheduledFor?: string;
};

const meetingIntentPattern =
  /\b(schedule|book|set up|arrange|create|plan)\b.*\bmeeting\b|\bmeeting\b.*\b(schedule|book|set up|arrange|create|plan)\b/i;
const timePattern = /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i;

const getCalendarReadiness = (): { ready: boolean; reply?: string } => {
  const config = loadConfig();
  const authContext = resolveAuthContext(config || undefined);

  if (!authContext) {
    return {
      ready: false,
      reply:
        "Google Calendar is not configured yet. Enable Google Calendar in setup, then resend the meeting request.",
    };
  }

  try {
    loadToken();
  } catch (error) {
    if (error instanceof GoogleAuthError && error.code === "NO_TOKEN") {
      return {
        ready: false,
        reply:
          "Google Calendar is not logged in yet. Run `chat-buddy login` (or `npm run login`) to open Google sign-in in your browser, then resend the meeting request and I’ll create the Meet link.",
      };
    }

    return {
      ready: false,
      reply:
        "Google Calendar authentication is unavailable right now. Run chat-buddy login and try again.",
    };
  }

  return { ready: true };
};

const getTimeZoneParts = (
  date: Date,
  timeZone: string,
): { year: number; month: number; day: number } => {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(date);
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    year: Number(lookup.year),
    month: Number(lookup.month),
    day: Number(lookup.day),
  };
};

const getTimeZoneOffsetMinutes = (date: Date, timeZone: string): number => {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const zonedAsUtc = Date.UTC(
    Number(lookup.year),
    Number(lookup.month) - 1,
    Number(lookup.day),
    Number(lookup.hour),
    Number(lookup.minute),
    Number(lookup.second),
  );

  return (zonedAsUtc - date.getTime()) / 60000;
};

const makeDateInTimeZone = (
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): Date => {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, 0);
  let candidate = new Date(utcGuess);
  let offsetMinutes = getTimeZoneOffsetMinutes(candidate, timeZone);
  candidate = new Date(utcGuess - offsetMinutes * 60_000);

  const adjustedOffsetMinutes = getTimeZoneOffsetMinutes(candidate, timeZone);
  if (adjustedOffsetMinutes !== offsetMinutes) {
    offsetMinutes = adjustedOffsetMinutes;
    candidate = new Date(utcGuess - offsetMinutes * 60_000);
  }

  return candidate;
};

const addDays = (
  year: number,
  month: number,
  day: number,
  days: number,
): { year: number; month: number; day: number } => {
  const shifted = new Date(Date.UTC(year, month - 1, day + days));

  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
};

const extractMeetingTitle = (text: string, timeText: string): string => {
  const cleaned = text
    .replace(/^\/?schedule\b/i, " ")
    .replace(/\b(schedule|book|set up|arrange|create|plan)\b/gi, " ")
    .replace(/\b(meeting|call|calendar|event)\b/gi, " ")
    .replace(/\b(today|tomorrow|tonight|at|on|for|by|around)\b/gi, " ")
    .replace(timeText, " ")
    .replace(/[^a-zA-Z0-9\s'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned || "Meeting";
};

const buildScheduledDate = (text: string, timeMatch: RegExpMatchArray): Date | null => {
  const meridiem = timeMatch[3]?.toLowerCase();
  const rawHour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2] ?? "0");

  if (
    !Number.isFinite(rawHour) ||
    rawHour < 1 ||
    rawHour > 12 ||
    !Number.isFinite(minute) ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  let hour = rawHour % 12;
  if (meridiem === "pm") {
    hour += 12;
  }

  const nowParts = getTimeZoneParts(new Date(), OWNER_TIMEZONE);
  const targetParts = /\btomorrow\b/i.test(text)
    ? addDays(nowParts.year, nowParts.month, nowParts.day, 1)
    : nowParts;

  let scheduledFor = makeDateInTimeZone(
    targetParts.year,
    targetParts.month,
    targetParts.day,
    hour,
    minute,
    OWNER_TIMEZONE,
  );

  if (!/\btomorrow\b/i.test(text) && scheduledFor.getTime() <= Date.now()) {
    const nextDay = addDays(targetParts.year, targetParts.month, targetParts.day, 1);
    scheduledFor = makeDateInTimeZone(
      nextDay.year,
      nextDay.month,
      nextDay.day,
      hour,
      minute,
      OWNER_TIMEZONE,
    );
  }

  return scheduledFor;
};

const formatScheduledTime = (date: Date): string => {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: OWNER_TIMEZONE,
    dateStyle: "medium",
    timeStyle: "short",
    hour12: true,
  }).format(date);
};

export const tryCreateMeetingFromText = async (
  requestedBy: string,
  text: string,
): Promise<ScheduledMeetingResult | null> => {
  const normalized = text.trim();
  if (!meetingIntentPattern.test(normalized)) {
    return null;
  }

  const timeMatch = normalized.match(timePattern);
  if (!timeMatch) {
    return null;
  }

  const scheduledFor = buildScheduledDate(normalized, timeMatch);
  if (!scheduledFor) {
    return {
      success: false,
      reply: "I couldn't understand the time. Try something like: schedule meeting at 8pm.",
    };
  }

  const title = extractMeetingTitle(normalized, timeMatch[0]);

  const readiness = getCalendarReadiness();
  if (!readiness.ready) {
    return {
      success: false,
      reply: readiness.reply ?? "Google Calendar is not ready yet.",
    };
  }

  try {
    const result = await createMeeting(title, "", scheduledFor.toISOString(), []);
    const meetLink = result.hangoutLink;

    if (meetLink) {
      addSessionMeetingRecord({
        requestedBy,
        title,
        meetingTime: scheduledFor.toISOString(),
        meetLink,
        eventId: result.id ?? undefined,
      });
    }

    return {
      success: true,
      eventId: result.id ?? undefined,
      meetLink: meetLink ?? undefined,
      scheduledFor: scheduledFor.toISOString(),
      reply: meetLink
        ? `Done. ${title} is set for ${formatScheduledTime(scheduledFor)}. Meet link: ${meetLink}`
        : `Done. ${title} is set for ${formatScheduledTime(scheduledFor)}.`,
    };
  } catch (error: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) {
    if (error instanceof GoogleAuthError) {
      return {
        success: false,
        reply:
          error.code === "NO_TOKEN"
            ? "Google Calendar is not logged in yet. Open a second terminal in C:\\Users\\ASUS\\Downloads\\gssoc\\chat-buddy and run npm run login. It will open Google sign-in in your browser, then resend the meeting request and I’ll create the Meet link."
            : "Google Calendar is not configured yet. Enable Google Calendar in setup, then resend the meeting request.",
      };
    }

    if (typeof error?.message === "string" && /authentication failed/i.test(error.message)) {
      return {
        success: false,
        reply:
          "Google Calendar is not logged in yet. Run `chat-buddy login` (or `npm run login`) to open Google sign-in in your browser, then resend the meeting request and I’ll create the Meet link.",
      };
    }

    const message = error?.message ?? "Unknown error";
    return {
      success: false,
      reply: `I couldn't create the meeting: ${message}`,
    };
  }
};
