/**
 * **Read (single)** — fetch one menu item by primary key.
 *
 * - **Route**: `GET /menu-items/{id}`
 * - **Auth**: Bearer JWT (TOKEN authorizer).
 * - **DynamoDB**: `GetCommand` on partition key `id`.
 * - **Status codes**: `200` item found; `400` missing path `id`; `404` no item; `500` unexpected.
 */
import { APIGatewayProxyHandler } from "aws-lambda";
import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, getTableName } from "../lib/db";
import { json } from "../lib/response";

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
      return json(404, { message: "Menu item not found." });
    }

    return json(200, { message: "Menu item fetched.", data: result.Item });
  } catch (error) {
    return json(500, {
      message: "Could not fetch menu item.",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};
