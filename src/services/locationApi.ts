import { initialSupportLocations, type SupportLocation } from "../data/locations";

export async function listSupportLocations(): Promise<SupportLocation[]> {
  const endpoint = import.meta.env.VITE_LOCATIONS_API_URL as string | undefined;
  if (!endpoint) return initialSupportLocations;

  try {
    const response = await fetch(endpoint, {
      headers: {
        Accept: "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`Locations API failed: ${response.status}`);
    }

    const payload = (await response.json()) as SupportLocation[];
    return Array.isArray(payload) ? payload : initialSupportLocations;
  } catch (error) {
    console.warn(error);
    return initialSupportLocations;
  }
}
