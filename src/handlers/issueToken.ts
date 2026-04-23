/**
 * **Public** token endpoint: `POST /auth/token` (no API Gateway authorizer on this route).
 *
 * **Purpose**
 * - Lets API clients exchange a static **client id + secret** (configured per stage via `API_CLIENT_*` env vars)
 *   for a short-lived **HS256 JWT** used on protected routes (`Authorization: Bearer ...`).
 *
 * **Security note**
 * - Treat `API_CLIENT_SECRET` like a password. Rate limiting / WAF are not implemented here (demo scope).
 *
 * **Request body** (JSON)
 * - `clientId`, `clientSecret` — must match `API_CLIENT_ID` / `API_CLIENT_SECRET` using constant-time compare
 *   (`safeEqualStrings` in `src/lib/jwtAuth.ts`).
 *
 * **Responses**
 * - `200` — `{ access_token, token_type: "Bearer", expires_in }` where `expires_in` matches JWT lifetime.
 * - `400` — Malformed JSON body.
 * - `401` — Wrong or missing credentials (same message for both to avoid leaking which field failed).
 * - `500` — Missing/invalid server env (e.g. `JWT_SECRET` too short) or unexpected runtime error.
 */
import { APIGatewayProxyHandler } from "aws-lambda";
import { json } from "../lib/response";
import {
  getExpectedClientCredentials,
  mintAccessToken,
  safeEqualStrings
} from "../lib/jwtAuth";

interface TokenRequestBody {
  clientId?: string;
  clientSecret?: string;
}

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const expected = getExpectedClientCredentials();
    let body: TokenRequestBody = {};
    if (event.body) {
      try {
        body = JSON.parse(event.body) as TokenRequestBody;
      } catch {
        return json(400, { message: "Invalid JSON body." });
      }
    }

    const idOk = safeEqualStrings(body.clientId ?? "", expected.clientId);
    const secretOk = safeEqualStrings(
      body.clientSecret ?? "",
      expected.clientSecret
    );

    if (!idOk || !secretOk) {
      return json(401, { message: "Invalid client credentials." });
    }

    const { accessToken, expiresIn } = await mintAccessToken(expected.clientId);

    return json(200, {
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: expiresIn
    });
  } catch {
    return json(500, { message: "Could not issue token." });
  }
};
