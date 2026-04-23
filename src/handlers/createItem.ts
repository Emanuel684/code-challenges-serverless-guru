/**
 * Create a new note (`POST /items`).
 *
 * - Protected by API Gateway TOKEN authorizer (Bearer JWT from `POST /auth/token`).
 * - Persists a new `Item` with server-generated `id` (UUID v4) and ISO timestamps.
 *
 * Responses:
 * - `201` — item created; body includes full `Item`
 * - `400` — missing `title` or `content`
 * - `500` — DynamoDB failure, or **invalid JSON** in `event.body` (JSON.parse throws)
 *
 * @see serverless.yml (createItem → POST /items + authorizer)
 */

import { APIGatewayProxyHandler } from "aws-lambda";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from "uuid";
import { docClient, getTableName } from "../lib/db";
import { json } from "../lib/response";
import { Item, ItemRequest } from "../lib/types";

/** Lambda entry point for `POST /items`. */
export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    // Note: malformed JSON throws here → caught as 500 (acceptable for this demo API).
    const body = event.body ? (JSON.parse(event.body) as ItemRequest) : undefined;
    if (!body?.title || !body?.content) {
      return json(400, { message: "title and content are required." });
    }

    const now = new Date().toISOString();
    const item: Item = {
      id: uuidv4(),
      title: body.title,
      content: body.content,
      createdAt: now,
      updatedAt: now
    };

    await docClient.send(
      new PutCommand({
        TableName: getTableName(),
        Item: item
      })
    );

    return json(201, { message: "Item created.", data: item });
  } catch (error) {
    return json(500, {
      message: "Could not create item.",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};
