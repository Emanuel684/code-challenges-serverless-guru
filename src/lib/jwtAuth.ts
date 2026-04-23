import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { timingSafeEqual } from "node:crypto";

const MIN_SECRET_LENGTH = 32;

export function getJwtSigningSecret(): Uint8Array {
  const s = process.env.JWT_SECRET?.trim();
  if (!s || s.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `JWT_SECRET must be set and at least ${MIN_SECRET_LENGTH} characters.`
    );
  }
  return new TextEncoder().encode(s);
}

export function getJwtIssuerAudience(): { issuer: string; audience: string } {
  const issuer = process.env.JWT_ISSUER?.trim();
  const audience = process.env.JWT_AUDIENCE?.trim();
  if (!issuer || !audience) {
    throw new Error("JWT_ISSUER and JWT_AUDIENCE must be set.");
  }
  return { issuer, audience };
}

/** Token lifetime in seconds (default 3600). Bounds reduce misconfiguration. */
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

export function safeEqualStrings(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ba.length !== bb.length) {
    return false;
  }
  return timingSafeEqual(ba, bb);
}

const DEFAULT_SCOPE = "items:read items:write";

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
