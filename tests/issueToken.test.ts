/**
 * Tests for `src/handlers/issueToken.ts` (public `POST /auth/token`).
 *
 * Scenarios: happy-path token JSON, bad credentials, invalid JSON body, with env vars sandboxed per test.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { APIGatewayProxyEvent, Context, Callback } from "aws-lambda";
import { handler } from "../src/handlers/issueToken";

const ENV_KEYS = [
  "JWT_SECRET",
  "JWT_ISSUER",
  "JWT_AUDIENCE",
  "API_CLIENT_ID",
  "API_CLIENT_SECRET",
  "JWT_EXPIRES_IN"
] as const;

describe("issueToken handler", () => {
  const previous: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> = {};

  beforeEach(() => {
    for (const k of ENV_KEYS) {
      previous[k] = process.env[k];
    }
    process.env.JWT_SECRET = "t".repeat(32);
    process.env.JWT_ISSUER = "coffee-issuer";
    process.env.JWT_AUDIENCE = "coffee-audience";
    process.env.API_CLIENT_ID = "demo-client";
    process.env.API_CLIENT_SECRET = "demo-secret";
    delete process.env.JWT_EXPIRES_IN;
  });

  afterEach(() => {
    for (const k of ENV_KEYS) {
      const v = previous[k];
      if (v === undefined) {
        delete process.env[k];
      } else {
        process.env[k] = v;
      }
    }
  });

  const noop: Callback = () => undefined;

  it("returns 200 with access_token for valid credentials", async () => {
    const event = {
      body: JSON.stringify({
        clientId: "demo-client",
        clientSecret: "demo-secret"
      })
    } as APIGatewayProxyEvent;

    const res = await handler(event, {} as Context, noop);
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body ?? "{}") as {
      access_token?: string;
      token_type?: string;
      expires_in?: number;
    };
    expect(body.token_type).toBe("Bearer");
    expect(typeof body.access_token).toBe("string");
    expect(body.access_token?.length).toBeGreaterThan(10);
    expect(typeof body.expires_in).toBe("number");
  });

  it("returns 401 for invalid client secret", async () => {
    const event = {
      body: JSON.stringify({
        clientId: "demo-client",
        clientSecret: "wrong"
      })
    } as APIGatewayProxyEvent;

    const res = await handler(event, {} as Context, noop);
    expect(res.statusCode).toBe(401);
  });

  it("returns 400 for invalid JSON body", async () => {
    const event = { body: "not-json" } as APIGatewayProxyEvent;
    const res = await handler(event, {} as Context, noop);
    expect(res.statusCode).toBe(400);
  });
});
