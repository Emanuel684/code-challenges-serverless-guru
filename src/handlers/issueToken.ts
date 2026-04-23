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
