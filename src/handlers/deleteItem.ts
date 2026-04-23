/**
 * Delete a note by id (`DELETE /items/{id}`).
 *
 * - Protected by TOKEN authorizer.
 * - Uses `ConditionExpression: attribute_exists(id)` so a missing id yields
 *   `ConditionalCheckFailedException` → **404** (same pattern as update).
 *
 * Responses:
 * - `200` — deleted; body echoes `id`
 * - `400` — missing path `id`
 * - `404` — item id not found
 * - `500` — DynamoDB failure
 *
 * @see serverless.yml (deleteItem → DELETE /items/{id} + authorizer)
 */

import { APIGatewayProxyHandler } from "aws-lambda";
import { DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, getTableName } from "../lib/db";
import { json } from "../lib/response";

/** Lambda entry point for `DELETE /items/{id}`. */
export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const id = event.pathParameters?.id;
    if (!id) {
      return json(400, { message: "id path parameter is required." });
    }

    await docClient.send(
      new DeleteCommand({
        TableName: getTableName(),
        Key: { id },
        ConditionExpression: "attribute_exists(id)"
      })
    );

    return json(200, { message: "Item deleted.", data: { id } });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "name" in error &&
      error.name === "ConditionalCheckFailedException"
    ) {
      return json(404, { message: "Item not found." });
    }

    return json(500, {
      message: "Could not delete item.",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};
