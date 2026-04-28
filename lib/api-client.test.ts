import { describe, it, expect } from "vitest";
import { ApiError, apiClient } from "@/lib/api-client";

// We can't easily test fetch in unit tests without mocking,
// so test the ApiError class and structure
describe("ApiError", () => {
  it("captures status and message", () => {
    const error = new ApiError(404, "Not found");

    expect(error.status).toBe(404);
    expect(error.message).toBe("Not found");
    expect(error).toBeInstanceOf(Error);
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
