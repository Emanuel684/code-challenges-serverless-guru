/**
 * Add a drink or food line item to the coffee shop menu (`POST /menu-items`).
 */
import { APIGatewayProxyHandler } from "aws-lambda";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from "uuid";
import { docClient, getTableName } from "../lib/db";
import { json } from "../lib/response";
import { MenuItem, MenuItemRequest } from "../lib/types";

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
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
    const available =
      typeof body.available === "boolean" ? body.available : true;

    const now = new Date().toISOString();
    const item: MenuItem = {
      id: uuidv4(),
      name: body.name.trim(),
      description,
      price: body.price,
      available,
      createdAt: now,
      updatedAt: now
    };

    await docClient.send(
      new PutCommand({
        TableName: getTableName(),
        Item: item
      })
    );

    return json(201, { message: "Menu item created.", data: item });
  } catch (error) {
    return json(500, {
      message: "Could not create menu item.",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};
