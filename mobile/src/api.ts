// Emulator address. Physical phone: adb reverse tcp:3000 tcp:3000 and use 127.0.0.1.
// Replace with an HTTPS API address for production.
export const API_URL = 'http://127.0.0.1:3000';
export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}
export async function request<T>(
  path: string,
  token?: string,
  method = 'GET',
  body?: unknown,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`${API_URL}${path}`, {
      method,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    if (response.status === 204) return undefined as T;
    const data = await response.json();
    if (!response.ok)
      throw new ApiError(data.message ?? 'Request failed', response.status);
    return data;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new Error(
      'Cannot reach the server. Check your connection and try again.',
    );
  } finally {
    clearTimeout(timer);
  }
}

