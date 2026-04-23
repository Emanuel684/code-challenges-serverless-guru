/**
 * API Gateway **Lambda TOKEN authorizer** for all protected `/items` routes.
 *
 * Flow:
 * 1. API Gateway passes the caller's `Authorization` header as `event.authorizationToken`
 *    (see `serverless.yml` → `identitySource: method.request.header.Authorization`).
 * 2. This Lambda must return an IAM policy **Allow** or **Deny** for `execute-api:Invoke`
 *    on the incoming `methodArn`, or throw `Unauthorized` so API Gateway returns 401.
 * 3. On success, optional `context` key/value pairs are forwarded to the target Lambda
 *    as `event.requestContext.authorizer` (useful for future RBAC or audit).
 *
 * Token format: `Authorization: Bearer <jwt>` where `<jwt>` is HS256-signed by this
 * service (`src/lib/jwtAuth.ts`), same secret/issuer/audience as `issueToken`.
 *
 * @see https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-use-lambda-authorizer.html
 * @see serverless.yml (authorizer blocks on CRUD http events)
 */

import {
  APIGatewayAuthorizerResult,
  APIGatewayTokenAuthorizerHandler
} from "aws-lambda";
import { verifyBearerJwt } from "../lib/jwtAuth";

/**
 * Builds the IAM policy document API Gateway expects from a TOKEN authorizer.
 *
 * @param principalId - IAM principal id (here: JWT `sub` or fallback)
 * @param effect - Allow or Deny invoke on the given resource ARN
 * @param resourceArn - Usually `event.methodArn` to scope Allow to the single route
 * @param context - Optional string map surfaced to downstream Lambdas
 */
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

/**
 * TOKEN authorizer entry point.
 *
 * @remarks
 * - Throws `Error("Unauthorized")` on missing/invalid token → API Gateway **401**.
 * - Successful verification returns **Allow** only for this `methodArn` (no wildcard),
 *   so each route is authorized independently (authorizer cache TTL is 0 in IaC).
 */
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
    // Do not leak verification details to clients; API Gateway maps this to 401.
    throw new Error("Unauthorized");
  }
};
