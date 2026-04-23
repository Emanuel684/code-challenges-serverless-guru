/**
 * HTTP response helpers for API Gateway Lambda proxy integration.
 *
 * All REST handlers return `APIGatewayProxyResult` with JSON bodies and a permissive
 * CORS header so browser clients can call the API during demos (tighten `Allow-Origin`
 * in production if you serve a fixed web app origin).
 *
 * @see AWS Lambda proxy integration response shape
 */

import { APIGatewayProxyResult } from "aws-lambda";

type Payload = Record<string, unknown>;

/**
 * Builds a JSON Lambda proxy response with standard headers.
 *
 * @param statusCode - HTTP status (e.g. 200, 201, 400, 404, 500)
 * @param payload - Serializable object; becomes JSON string in `body`
 * @returns API Gateway–compatible result object
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
