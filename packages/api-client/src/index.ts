export async function getApiHealth(baseUrl: string): Promise<{ status: string }> {
  const response = await fetch(`${baseUrl}/health`);
  if (!response.ok) {
    throw new Error("API health check failed");
  }
  return response.json() as Promise<{ status: string }>;
}
