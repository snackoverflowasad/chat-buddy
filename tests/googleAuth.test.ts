import { describe, test, expect, afterEach } from "vitest";
import { resolveAuthContext, getGoogleCredentialsJson, GoogleAuthError } from "../src/auth/googleAuth.js";
import type { BotConfig } from "../src/storage/configStore.js";

const makeConfig = (overrides: Partial<BotConfig> = {}): BotConfig => ({
  username: "Asad",
  agentName: "Luffy",
  openaiApiKey: "sk-test",
  enableGoogleCalendar: true,
  googleOAuthClientId: "config-client-id",
  googleOAuthClientSecret: "config-client-secret",
  allowGroupReplies: false,
  timezone: "Asia/Kolkata",
  ...overrides,
});

describe("resolveAuthContext()", () => {
  afterEach(() => {
    delete process.env.GOOGLE_OAUTH_CLIENT_ID;
    delete process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  });

  test("returns env source when both env vars are set", () => {
    process.env.GOOGLE_OAUTH_CLIENT_ID = "env-client-id";
    process.env.GOOGLE_OAUTH_CLIENT_SECRET = "env-client-secret";
    expect(resolveAuthContext()).toEqual({
      clientId: "env-client-id",
      clientSecret: "env-client-secret",
      source: "env",
    });
  });

  test("env vars take priority over config", () => {
    process.env.GOOGLE_OAUTH_CLIENT_ID = "env-id";
    process.env.GOOGLE_OAUTH_CLIENT_SECRET = "env-secret";
    const result = resolveAuthContext(makeConfig());
    expect(result?.source).toBe("env");
    expect(result?.clientId).toBe("env-id");
  });

  test("returns config source when config is valid and env vars are absent", () => {
    delete process.env.GOOGLE_OAUTH_CLIENT_ID;
    delete process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    expect(resolveAuthContext(makeConfig())).toEqual({
      clientId: "config-client-id",
      clientSecret: "config-client-secret",
      source: "config",
    });
  });

  test("returns null when no env vars and no config provided", () => {
    delete process.env.GOOGLE_OAUTH_CLIENT_ID;
    delete process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    expect(resolveAuthContext()).toBeNull();
  });

  test("returns null when config has enableGoogleCalendar set to false", () => {
    delete process.env.GOOGLE_OAUTH_CLIENT_ID;
    delete process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    expect(resolveAuthContext(makeConfig({ enableGoogleCalendar: false }))).toBeNull();
  });

  test("returns null when config is missing client credentials", () => {
    delete process.env.GOOGLE_OAUTH_CLIENT_ID;
    delete process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    const result = resolveAuthContext(
      makeConfig({ googleOAuthClientId: undefined, googleOAuthClientSecret: undefined }),
    );
    expect(result).toBeNull();
  });
});

describe("getGoogleCredentialsJson()", () => {
  const auth = { clientId: "my-client-id", clientSecret: "my-secret", source: "env" as const };

  test("returns valid JSON containing the client ID and secret", () => {
    const parsed = JSON.parse(getGoogleCredentialsJson(auth));
    expect(parsed.installed.client_id).toBe("my-client-id");
    expect(parsed.installed.client_secret).toBe("my-secret");
  });

  test("defaults redirect URI to http://localhost", () => {
    const parsed = JSON.parse(getGoogleCredentialsJson(auth));
    expect(parsed.installed.redirect_uris).toContain("http://localhost");
  });

  test("uses a custom redirect URI when provided", () => {
    const parsed = JSON.parse(getGoogleCredentialsJson(auth, "http://localhost:3000/callback"));
    expect(parsed.installed.redirect_uris).toContain("http://localhost:3000/callback");
  });

  test("sets project_id to 'chat-buddy'", () => {
    const parsed = JSON.parse(getGoogleCredentialsJson(auth));
    expect(parsed.installed.project_id).toBe("chat-buddy");
  });
});

describe("GoogleAuthError", () => {
  test("is an instance of Error", () => {
    const err = new GoogleAuthError("not authenticated", "NO_TOKEN");
    expect(err).toBeInstanceOf(Error);
  });

  test("has the name 'GoogleAuthError'", () => {
    const err = new GoogleAuthError("msg", "NO_CONFIG");
    expect(err.name).toBe("GoogleAuthError");
  });

  test("exposes the message passed to the constructor", () => {
    const err = new GoogleAuthError("Run login first", "NO_TOKEN");
    expect(err.message).toBe("Run login first");
  });

  test("exposes the code passed to the constructor", () => {
    expect(new GoogleAuthError("m", "NO_TOKEN").code).toBe("NO_TOKEN");
    expect(new GoogleAuthError("m", "NO_CONFIG").code).toBe("NO_CONFIG");
    expect(new GoogleAuthError("m", "INVALID_AUTH").code).toBe("INVALID_AUTH");
  });
});
