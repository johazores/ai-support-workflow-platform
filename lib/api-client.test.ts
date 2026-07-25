import { describe, expect, it } from "vitest";
import { ApiError, apiClient } from "@/lib/api-client";

describe("ApiError", () => {
  it("captures status and message", () => {
    const error = new ApiError(404, "Not found");

    expect(error.status).toBe(404);
    expect(error.message).toBe("Not found");
    expect(error).toBeInstanceOf(Error);
  });

  it("preserves structured server details for actionable UI errors", () => {
    const details = {
      message: "Workflow is not ready to publish",
      issues: ["Connect the trigger to an action."],
    };
    const error = new ApiError(400, "Workflow is not ready to publish", details);

    expect(error.details).toEqual(details);
  });

  it("is an instance of Error", () => {
    const error = new ApiError(500, "Server error");
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ApiError);
  });
});

describe("apiClient", () => {
  it("is a function", () => {
    expect(typeof apiClient).toBe("function");
  });
});
