export class APIError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = 'APIError';
  }
}

export function handleAPIError(error: unknown): Response {
  console.error('API Error:', error);
  if (error instanceof APIError) {
    return Response.json({ error: error.message }, { status: error.statusCode });
  }
  return Response.json({ error: 'Ein Fehler ist aufgetreten' }, { status: 500 });
}
