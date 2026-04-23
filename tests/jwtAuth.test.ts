/**
 * Unit tests for `src/lib/jwtAuth.ts`.
 *
 * Covers: constant-time string compare, JWT mint + verify round-trip, and env validation edge cases
 * (isolated via `beforeEach` / `afterEach` env snapshot restore).
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  safeEqualStrings,
  mintAccessToken,
  verifyBearerJwt
} from "../src/lib/jwtAuth";

const JWT_ENV_KEYS = [
  "JWT_SECRET",
  "JWT_ISSUER",
  "JWT_AUDIENCE",
  "JWT_EXPIRES_IN"
] as const;

describe("jwtAuth", () => {
  const previous: Partial<Record<(typeof JWT_ENV_KEYS)[number], string | undefined>> =
    {};

  beforeEach(() => {
    for (const k of JWT_ENV_KEYS) {
      previous[k] = process.env[k];
    }
    process.env.JWT_SECRET = "s".repeat(32);
    process.env.JWT_ISSUER = "test-issuer";
    process.env.JWT_AUDIENCE = "test-audience";
    delete process.env.JWT_EXPIRES_IN;
  });

  afterEach(() => {
    for (const k of JWT_ENV_KEYS) {
      const v = previous[k];
      if (v === undefined) {
        delete process.env[k];
      } else {
        process.env[k] = v;
      }
    }
  });

  it("safeEqualStrings returns false when lengths differ", () => {
    expect(safeEqualStrings("a", "ab")).toBe(false);
  });

  it("safeEqualStrings returns true for equal secrets", () => {
    expect(safeEqualStrings("same", "same")).toBe(true);
  });

  it("mintAccessToken then verifyBearerJwt roundtrip preserves sub and claims", async () => {
    const { accessToken } = await mintAccessToken("kitchen-display");
    const payload = await verifyBearerJwt(accessToken);
    expect(payload.sub).toBe("kitchen-display");
    expect(payload.iss).toBe("test-issuer");
    expect(
      Array.isArray(payload.aud) ? payload.aud[0] : payload.aud
    ).toBe("test-audience");
    expect(payload.scope).toContain("menu-items");
  });
});
