/**
 * Update menu item fields (`PUT /menu-items/{id}`).
 */
import { APIGatewayProxyHandler } from "aws-lambda";
import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, getTableName } from "../lib/db";
import { json } from "../lib/response";
import { MenuItemRequest } from "../lib/types";

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const id = event.pathParameters?.id;
    if (!id) {
      return json(400, { message: "id path parameter is required." });
    }

    const body = event.body
      ? (JSON.parse(event.body) as MenuItemRequest)
      : undefined;

    if (!body?.name || typeof body.name !== "string" || !body.name.trim()) {
      return json(400, { message: "name is required." });
    }

    if (body.price === undefined || typeof body.price !== "number") {
      return json(400, { message: "price is required and must be a number." });
    }

    if (!Number.isFinite(body.price) || body.price < 0) {
      return json(400, { message: "price must be a finite number >= 0." });
    }

    const description =
      typeof body.description === "string" ? body.description : "";
    if (typeof body.available !== "boolean") {
      return json(400, { message: "available is required and must be a boolean." });
    }

    const updatedAt = new Date().toISOString();
    const result = await docClient.send(
      new UpdateCommand({
        TableName: getTableName(),
        Key: { id },
        UpdateExpression:
          "SET #n = :name, description = :description, price = :price, available = :available, updatedAt = :updatedAt",
        ExpressionAttributeNames: { "#n": "name" },
        ConditionExpression: "attribute_exists(id)",
        ExpressionAttributeValues: {
          ":name": body.name.trim(),
          ":description": description,
          ":price": body.price,
          ":available": body.available,
          ":updatedAt": updatedAt
        },
        ReturnValues: "ALL_NEW"
      })
    );

    return json(200, { message: "Menu item updated.", data: result.Attributes });
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
      message: "Could not update menu item.",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};
