/**
 * Auth0 JWT validation config from environment.
 * Set AUTH0_ISSUER_BASE_URL (e.g. https://YOUR_DOMAIN.auth0.com) and AUTH0_AUDIENCE (API identifier).
 */
export interface Auth0VerifyConfig {
  /** Issuer URL with trailing slash, matching JWT `iss` (Auth0 default). */
  issuer: string;
  audience: string;
  /** JWKS URL for signature verification. */
  jwksUrl: string;
}

export function getAuth0VerifyConfig(): Auth0VerifyConfig {
  const rawBase = process.env.AUTH0_ISSUER_BASE_URL?.trim();
  const audience = process.env.AUTH0_AUDIENCE?.trim();

  if (!rawBase || !audience) {
    throw new Error(
      "Missing AUTH0_ISSUER_BASE_URL or AUTH0_AUDIENCE. Both are required for JWT verification."
    );
  }

  const baseNoSlash = rawBase.replace(/\/+$/, "");
  const issuer = `${baseNoSlash}/`;
  const jwksUrl = `${baseNoSlash}/.well-known/jwks.json`;

  return { issuer, audience, jwksUrl };
}
