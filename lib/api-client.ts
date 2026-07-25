export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type RequestOptions = {
  method?: string;
  body?: unknown;
};

export async function apiClient<T = unknown>(
  url: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = "GET", body } = options;

  const headers: HeadersInit = {};

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let result: Record<string, unknown> = {};

  try {
    result = text ? JSON.parse(text) : {};
  } catch {
    if (!response.ok) {
      throw new ApiError(response.status, "Request failed");
    }
  }

  if (!response.ok) {
    throw new ApiError(
      response.status,
      (result.message as string) ?? "Request failed",
      result,
    );
  }

  return result as T;
}
