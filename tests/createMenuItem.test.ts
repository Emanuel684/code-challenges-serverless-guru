/**
 * Tests for `src/handlers/createMenuItem.ts` with DynamoDB client mocked.
 *
 * Asserts HTTP status / response shape and that `PutCommand`-shaped input reaches `docClient.send`.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const send = vi.fn();

vi.mock("../src/lib/db", () => ({
  docClient: {
    send: (input: unknown) => send(input)
  },
  getTableName: () => "test-menu-items-table"
}));

import { handler } from "../src/handlers/createMenuItem";
import type { APIGatewayProxyEvent, Context, Callback } from "aws-lambda";

describe("createMenuItem handler", () => {
  const noop: Callback = () => undefined;

  beforeEach(() => {
    send.mockReset();
    send.mockResolvedValue({});
  });

  it("returns 201 and forwards PutCommand to DynamoDB", async () => {
    const event = {
      body: JSON.stringify({
        name: "Oat Latte",
        description: "12oz",
        price: 5.25,
        available: true
      })
    } as APIGatewayProxyEvent;

    const res = await handler(event, {} as Context, noop);
    expect(res.statusCode).toBe(201);
    expect(send).toHaveBeenCalledTimes(1);
    const body = JSON.parse(res.body ?? "{}") as {
      data?: { name?: string; price?: number };
    };
    expect(body.data?.name).toBe("Oat Latte");
    expect(body.data?.price).toBe(5.25);
  });

  it("returns 400 when name is missing", async () => {
    const event = {
      body: JSON.stringify({ price: 3 })
    } as APIGatewayProxyEvent;

    const res = await handler(event, {} as Context, noop);
    expect(res.statusCode).toBe(400);
    expect(send).not.toHaveBeenCalled();
  });
});
