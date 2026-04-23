import { APIGatewayProxyResult } from "aws-lambda";

type Payload = Record<string, unknown>;

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
