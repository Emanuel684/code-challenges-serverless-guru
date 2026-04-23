/**
 * List all menu items (`GET /menu-items`). Uses DynamoDB Scan (demo-friendly).
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
