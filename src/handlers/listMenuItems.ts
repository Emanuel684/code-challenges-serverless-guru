/**
 * **Read (collection)** — return every menu item in the table.
 *
 * - **Route**: `GET /menu-items`
 * - **Auth**: Bearer JWT (TOKEN authorizer).
 * - **DynamoDB**: `ScanCommand` — reads the whole table (acceptable for demos; production menus would use `Query` + GSIs/pagination).
 * - **Status codes**: `200` with `data` array (possibly empty); `500` on AWS/client errors.
 */
import { APIGatewayProxyHandler } from "aws-lambda";
import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, getTableName } from "../lib/db";
import { json } from "../lib/response";

export const handler: APIGatewayProxyHandler = async () => {
  try {
    const result = await docClient.send(
      new ScanCommand({
        TableName: getTableName()
      })
    );

    return json(200, {
      message: "Menu items fetched.",
      data: result.Items ?? []
    });
  } catch (error) {
    return json(500, {
      message: "Could not fetch menu items.",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};
