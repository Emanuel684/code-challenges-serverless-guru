/**
 * Fetch one menu item by id (`GET /menu-items/{id}`).
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
