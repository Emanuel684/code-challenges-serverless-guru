/**
 * Fetch a single note by id (`GET /items/{id}`).
 *
 * - Protected by TOKEN authorizer.
 * - Reads DynamoDB item by partition key `id` from path parameter.
 *
 * Responses:
 * - `200` — item found
 * - `400` — missing path `id`
 * - `404` — no item with that id
 * - `500` — DynamoDB failure
 *
 * @see serverless.yml (getItem → GET /items/{id} + authorizer)
 */

import { APIGatewayProxyHandler } from "aws-lambda";
import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, getTableName } from "../lib/db";
import { json } from "../lib/response";

/** Lambda entry point for `GET /items/{id}`. */
export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const id = event.pathParameters?.id;
    if (!id) {
      return json(400, { message: "id path parameter is required." });
    }

    const result = await docClient.send(
      new GetCommand({
        TableName: getTableName(),
        Key: { id }
      })
    );

    if (!result.Item) {
      return json(404, { message: "Item not found." });
    }

    return json(200, { message: "Item fetched.", data: result.Item });
  } catch (error) {
    return json(500, {
      message: "Could not fetch item.",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};
