/**
 * List all notes (`GET /items`).
 *
 * - Protected by TOKEN authorizer.
 * - Uses DynamoDB **Scan** for simplicity (fine for demos; production APIs usually use
 *   `Query` with a partition key design, pagination tokens, and/or GSIs).
 *
 * Responses:
 * - `200` — `data` is an array of items (possibly empty)
 * - `500` — DynamoDB failure
 *
 * @see serverless.yml (listItems → GET /items + authorizer)
 */

import { APIGatewayProxyHandler } from "aws-lambda";
import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, getTableName } from "../lib/db";
import { json } from "../lib/response";

/** Lambda entry point for `GET /items`. */
export const handler: APIGatewayProxyHandler = async () => {
  try {
    const result = await docClient.send(
      new ScanCommand({
        TableName: getTableName()
      })
    );

    return json(200, { message: "Items fetched.", data: result.Items ?? [] });
  } catch (error) {
    return json(500, {
      message: "Could not fetch items.",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};
