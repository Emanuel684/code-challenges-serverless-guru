/**
 * Self-issued JWT authentication (HS256) shared by:
 * - `issueToken` handler: mints access tokens after client credential check
 * - `authorizer` handler: verifies Bearer tokens before CRUD Lambdas run
 *
 * Required environment (set at deploy time via `serverless.yml` / CI secrets):
 * - `JWT_SECRET` — symmetric signing key (minimum length enforced below)
 * - `JWT_ISSUER` / `JWT_AUDIENCE` — must match claims in issued and presented JWTs
 * - `API_CLIENT_ID` / `API_CLIENT_SECRET` — static client credentials for `POST /auth/token`
 *
 * Optional:
 * - `JWT_EXPIRES_IN` — lifetime in seconds (bounded); default 3600 if unset/empty
 *
 * @see src/handlers/issueToken.ts
 * @see src/handlers/authorizer.ts
 * @see serverless.yml (provider.environment)
 */

import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { timingSafeEqual } from "node:crypto";

/** Minimum secret length aligns with common HMAC key guidance for HS256. */
const MIN_SECRET_LENGTH = 32;

/**
 * Loads and encodes the HS256 signing key from `JWT_SECRET`.
 *
 * @returns UTF-8 bytes of the secret for `jose`
 * @throws Error if missing or shorter than {@link MIN_SECRET_LENGTH}
 */
export function getJwtSigningSecret(): Uint8Array {
  const s = process.env.JWT_SECRET?.trim();
  if (!s || s.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `JWT_SECRET must be set and at least ${MIN_SECRET_LENGTH} characters.`
    );
  }
  return new TextEncoder().encode(s);
}

/**
 * Reads fixed issuer and audience strings used in every access token.
 *
 * @returns `{ issuer, audience }` for `iss` / `aud` JWT claims
 * @throws Error if either env var is missing
 */
export function getJwtIssuerAudience(): { issuer: string; audience: string } {
  const issuer = process.env.JWT_ISSUER?.trim();
  const audience = process.env.JWT_AUDIENCE?.trim();
  if (!issuer || !audience) {
    throw new Error("JWT_ISSUER and JWT_AUDIENCE must be set.");
  }
  return { issuer, audience };
}

/**
 * Token lifetime in seconds.
 *
 * Default `3600` when unset or empty. Upper bound avoids accidentally minting
 * very long-lived tokens from a typo.
 *
 * @returns Seconds until `exp` claim
 * @throws Error if set and outside [60, 604800]
 */
export function getJwtExpiresInSeconds(): number {
  const raw = process.env.JWT_EXPIRES_IN?.trim();
  if (!raw) {
    return 3600;
  }
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 60 || n > 86400 * 7) {
    throw new Error(
      "JWT_EXPIRES_IN must be a number of seconds between 60 and 604800."
    );
  }
  return n;
}

/**
 * Expected client credentials for the public token endpoint.
 *
 * @throws Error if either env var is missing
 */
export function getExpectedClientCredentials(): {
  clientId: string;
  clientSecret: string;
} {
  const clientId = process.env.API_CLIENT_ID?.trim();
  const clientSecret = process.env.API_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error("API_CLIENT_ID and API_CLIENT_SECRET must be set.");
  }
  return { clientId, clientSecret };
}

/**
 * Constant-time string comparison to reduce timing leaks when validating secrets.
 *
 * Returns `false` when lengths differ (no `timingSafeEqual` call in that case).
 */
export function safeEqualStrings(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ba.length !== bb.length) {
    return false;
  }
  return timingSafeEqual(ba, bb);
}

/** Default OAuth-style scope string embedded in the access token payload. */
const DEFAULT_SCOPE = "items:read items:write";

/**
 * Signs a new access token (HS256) for a validated client.
 *
 * Claims: `sub` = client id, `iss` / `aud` from env, `iat` / `exp`, custom `scope`.
 *
 * @param subjectClientId - Typically the configured API client id (JWT `sub`)
 * @returns JWT string and `expiresIn` seconds (for JSON response)
 */
export async function mintAccessToken(
  subjectClientId: string
): Promise<{ accessToken: string; expiresIn: number }> {
  const secret = getJwtSigningSecret();
  const { issuer, audience } = getJwtIssuerAudience();
  const expiresIn = getJwtExpiresInSeconds();

  const accessToken = await new SignJWT({ scope: DEFAULT_SCOPE })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(subjectClientId)
    .setIssuer(issuer)
    .setAudience(audience)
    .setIssuedAt()
    .setExpirationTime(`${expiresIn}s`)
    .sign(secret);

  return { accessToken, expiresIn };
}

/**
 * Verifies a Bearer JWT using the same secret and claim constraints as minting.
 *
 * @param token - Raw JWT (no `Bearer ` prefix)
 * @returns Decoded payload on success
 * @throws Error from `jose` on invalid signature, wrong `iss`/`aud`, or expiry
 */
export async function verifyBearerJwt(token: string): Promise<JWTPayload> {
  const secret = getJwtSigningSecret();
  const { issuer, audience } = getJwtIssuerAudience();
  const { payload } = await jwtVerify(token, secret, {
    issuer,
    audience,
    algorithms: ["HS256"]
  });
  return payload;
}
