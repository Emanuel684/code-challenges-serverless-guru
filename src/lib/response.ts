/**
 * Small helper to return **JSON** HTTP responses from API Gateway Lambda proxy integrations.
 *
 * **Headers**
 * - Sets `Content-Type: application/json`.
 * - Sets `Access-Control-Allow-Origin: *` for browser demos; tighten to known origins in production APIs behind a domain.
 *
 * **Usage**
 * - Handlers return `APIGatewayProxyResult` objects; API Gateway serializes `body` as the HTTP response body.
 */
import { APIGatewayProxyResult } from "aws-lambda";

type Payload = Record<string, unknown>;

/**
 * @param statusCode - HTTP status (e.g. 200, 201, 400, 404, 500).
 * @param payload - Serializable JSON object (stringified into `body`).
 */
export const json = (
  statusCode: number,
  payload: Payload
): APIGatewayProxyResult => {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    },
    body: JSON.stringify(payload)
  };
};
