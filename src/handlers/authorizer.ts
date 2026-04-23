import {
  APIGatewayAuthorizerResult,
  APIGatewayTokenAuthorizerHandler
} from "aws-lambda";
import { verifyBearerJwt } from "../lib/jwtAuth";

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
    const payload = await verifyBearerJwt(token);
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
