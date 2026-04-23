import {
  APIGatewayAuthorizerResult,
  APIGatewayTokenAuthorizerHandler
} from "aws-lambda";
import * as jose from "jose";
import { getAuth0VerifyConfig } from "../lib/auth0";

function buildPolicy(
  principalId: string,
  effect: "Allow" | "Deny",
  resourceArn: string,
  context?: Record<string, string>
): APIGatewayAuthorizerResult {
  return {
    principalId,
    policyDocument: {
      Version: "2012-10-17",
      Statement: [
        {
          Action: "execute-api:Invoke",
          Effect: effect,
          Resource: resourceArn
        }
      ]
    },
    context
  };
}

export const handler: APIGatewayTokenAuthorizerHandler = async (event) => {
  const tokenHeader = event.authorizationToken ?? "";
  const methodArn = event.methodArn;

  if (!tokenHeader.toLowerCase().startsWith("bearer ")) {
    throw new Error("Unauthorized");
  }

  const token = tokenHeader.slice(7).trim();
  if (!token) {
    throw new Error("Unauthorized");
  }

  try {
    const { issuer, audience, jwksUrl } = getAuth0VerifyConfig();
    const JWKS = jose.createRemoteJWKSet(new URL(jwksUrl));

    const { payload } = await jose.jwtVerify(token, JWKS, {
      issuer,
      audience
    });

    const sub = typeof payload.sub === "string" ? payload.sub : "user";
    const scope =
      typeof payload.scope === "string"
        ? payload.scope
        : Array.isArray(payload.scope)
          ? payload.scope.join(" ")
          : "";

    return buildPolicy(sub, "Allow", methodArn, { sub, scope });
  } catch {
    throw new Error("Unauthorized");
  }
};
