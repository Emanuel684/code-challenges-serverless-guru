/**
 * Remove a menu item (`DELETE /menu-items/{id}`).
 */
import { APIGatewayProxyHandler } from "aws-lambda";
import { DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, getTableName } from "../lib/db";
import { json } from "../lib/response";

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

    return json(200, { message: "Menu item deleted.", data: { id } });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "name" in error &&
      error.name === "ConditionalCheckFailedException"
    ) {
      return json(404, { message: "Menu item not found." });
    }

    return json(500, {
      message: "Could not delete menu item.",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};
