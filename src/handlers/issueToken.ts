/**
 * Public **token issuance** endpoint: `POST /auth/token` (no API Gateway authorizer).
 *
 * Purpose:
 * - Accepts static client credentials (`clientId`, `clientSecret`) matching env-configured
 *   `API_CLIENT_ID` / `API_CLIENT_SECRET`.
 * - On success, returns a short-lived **HS256 JWT** (`access_token`) that callers place in
 *   `Authorization: Bearer ...` for `/items` routes (protected by `authorizer.ts`).
 *
 * HTTP semantics:
 * - `400` — body is not valid JSON
 * - `401` — wrong client id/secret (generic message; no distinction to slow enumeration)
 * - `500` — missing/misconfigured server env or unexpected signing failure
 *
 * @see src/lib/jwtAuth.ts (mintAccessToken, safeEqualStrings)
 * @see serverless.yml (issueToken function: POST /auth/token without authorizer)
 */

import { APIGatewayProxyHandler } from "aws-lambda";
import { json } from "../lib/response";
import {
  getExpectedClientCredentials,
  mintAccessToken,
  safeEqualStrings
} from "../lib/jwtAuth";

/** JSON body for POST /auth/token */
interface TokenRequestBody {
  clientId?: string;
  clientSecret?: string;
}

/**
 * Lambda handler for `POST /auth/token`.
 *
 * @returns API Gateway proxy result with OAuth-style token payload or error JSON
 */
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
