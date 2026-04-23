/**
 * Update an existing note (`PUT /items/{id}`).
 *
 * - Protected by TOKEN authorizer.
 * - Requires full `title` and `content` in body (same shape as create).
 * - Uses `ConditionExpression: attribute_exists(id)` so DynamoDB returns
 *   `ConditionalCheckFailedException` when the id does not exist → mapped to **404**.
 *
 * Responses:
 * - `200` — updated attributes returned (`ALL_NEW`)
 * - `400` — missing path `id` or missing body fields / invalid JSON (parse throws → 500)
 * - `404` — item id not found (conditional failure)
 * - `500` — other DynamoDB errors
 *
 * @see serverless.yml (updateItem → PUT /items/{id} + authorizer)
 */

import { APIGatewayProxyHandler } from "aws-lambda";
import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, getTableName } from "../lib/db";
import { json } from "../lib/response";
import { ItemRequest } from "../lib/types";

/** Lambda entry point for `PUT /items/{id}`. */
export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const id = event.pathParameters?.id;
    if (!id) {
      return json(400, { message: "id path parameter is required." });
    }

    // Malformed JSON throws → 500 (same pattern as createItem).
    const body = event.body ? (JSON.parse(event.body) as ItemRequest) : undefined;
    if (!body?.title || !body?.content) {
      return json(400, { message: "title and content are required." });
    }

    const updatedAt = new Date().toISOString();
    const result = await docClient.send(
      new UpdateCommand({
        TableName: getTableName(),
        Key: { id },
        UpdateExpression: "SET title = :title, content = :content, updatedAt = :updatedAt",
        ConditionExpression: "attribute_exists(id)",
        ExpressionAttributeValues: {
          ":title": body.title,
          ":content": body.content,
          ":updatedAt": updatedAt
        },
        ReturnValues: "ALL_NEW"
      })
    );

    return json(200, { message: "Item updated.", data: result.Attributes });
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
      message: "Could not update item.",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};
