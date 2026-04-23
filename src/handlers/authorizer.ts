/**
 * API Gateway **Lambda TOKEN authorizer** for protected HTTP routes (`/menu-items` CRUD).
 *
 * **When it runs**
 * - API Gateway calls this Lambda **before** invoking the target integration (each CRUD handler), passing
 *   `authorizationToken` (from `identitySource`: `Authorization` header) and `methodArn` for the request.
 *
 * **Success path**
 * - Expects `Authorization: Bearer <jwt>` where `<jwt>` was minted by `src/handlers/issueToken.ts`
 *   (same HS256 secret and `iss` / `aud` as `verifyBearerJwt` in `src/lib/jwtAuth.ts`).
 * - Returns an IAM policy with **Effect: Allow** on the **exact** `methodArn` so only this API method is permitted
 *   (no broad `execute-api:*` wildcard).
 * - Optionally forwards `sub` and `scope` into `context` for use in mapping templates or downstream Lambdas if needed later.
 *
 * **Failure path**
 * - Missing / non-Bearer token, or JWT verification failure: throws `Error("Unauthorized")`.
 *   API Gateway maps that to **401** for the client (do not return ad-hoc JSON from authorizers for this pattern).
 */
import {
  APIGatewayAuthorizerResult,
  APIGatewayTokenAuthorizerHandler
} from "aws-lambda";
import { verifyBearerJwt } from "../lib/jwtAuth";

/**
 * Builds the IAM policy document API Gateway expects from a TOKEN authorizer.
 *
 * @param principalId - Typically JWT `sub` (opaque client id string).
 * @param effect - `Allow` on success; reserved for future `Deny` branches.
 * @param resourceArn - Must be `event.methodArn` (or a documented wildcard if you enable caching later).
 * @param context - Optional string map surfaced on the authorized request (values must be strings).
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
