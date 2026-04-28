export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
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
  const result = text ? JSON.parse(text) : {};

  if (!response.ok) {
    throw new ApiError(response.status, result.message ?? "Request failed");
  }

  return result as T;
}
