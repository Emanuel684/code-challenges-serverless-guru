/**
 * Self-issued JWT utilities for this API.
 *
 * **Flow**
 * - `src/handlers/issueToken.ts` accepts `clientId` / `clientSecret`, then calls `mintAccessToken` to return an HS256 JWT.
 * - API Gateway invokes `src/handlers/authorizer.ts`, which calls `verifyBearerJwt` on the `Authorization: Bearer <token>`
 *   value before CRUD Lambdas run.
 *
 * **Algorithms and claims**
 * - Signing: **HS256** with `JWT_SECRET` (symmetric key; anyone with the secret can forge tokens—rotate if leaked).
 * - Standard claims: `iss` / `aud` from env, `sub` set to the configured client id, `iat` / `exp`, plus custom `scope`.
 *
 * **Environment** (injected per stage via Serverless `provider.environment`)
 * - `JWT_SECRET`, `JWT_ISSUER`, `JWT_AUDIENCE`, `API_CLIENT_ID`, `API_CLIENT_SECRET`
 * - Optional `JWT_EXPIRES_IN` (seconds; bounded to reduce accidental multi-week tokens)
 */
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { timingSafeEqual } from "node:crypto";

/** Minimum `JWT_SECRET` length so HS256 keys are not trivially short. */
const MIN_SECRET_LENGTH = 32;

/**
 * Loads and UTF-8 encodes `JWT_SECRET` for `jose` signing/verification.
 *
 * @returns Secret material as bytes suitable for HS256.
 * @throws If `JWT_SECRET` is missing or shorter than {@link MIN_SECRET_LENGTH}.
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
 * Reads fixed `iss` / `aud` strings that must match every minted and verified JWT.
 *
 * @returns `issuer` and `audience` strings used in `SignJWT` / `jwtVerify`.
 * @throws If either env var is missing or whitespace-only.
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
 * Token lifetime in whole seconds for new access tokens.
 *
 * @returns Seconds until `exp` (default **3600** when `JWT_EXPIRES_IN` unset).
 * @throws If set but not an integer in **[60, 604800]** (1 minute … 7 days).
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
 * Expected credentials for `POST /auth/token` (not the JWT subject—see `mintAccessToken`).
 *
 * @returns Server-side client id and secret from env.
 * @throws If either is missing or whitespace-only.
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
 * Constant-time string comparison to reduce timing leaks when checking secrets.
 *
 * @param a - Usually user-supplied (e.g. request body field).
 * @param b - Usually expected secret from env.
 * @returns `true` only if UTF-8 byte sequences are identical **and** same length.
 */
export function safeEqualStrings(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ba.length !== bb.length) {
    return false;
  }
  return timingSafeEqual(ba, bb);
}

/** Default OAuth-style scope string embedded in access tokens (authorizer passes through to `context`). */
const DEFAULT_SCOPE = "menu-items:read menu-items:write";

/**
 * Creates a signed access token for a principal (here: the validated API client id).
 *
 * @param subjectClientId - Value for JWT `sub` (after credentials match `API_CLIENT_*`).
 * @returns Raw JWT string and `expires_in` echo for the HTTP response body.
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
 * Validates a bearer JWT: signature, `alg`, `iss`, `aud`, and `exp`.
 *
 * @param token - Raw JWT (no `Bearer ` prefix).
 * @returns Decoded payload on success.
 * @throws On invalid signature, wrong issuer/audience, expired token, or wrong algorithm (wrapped by authorizer as 401).
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
