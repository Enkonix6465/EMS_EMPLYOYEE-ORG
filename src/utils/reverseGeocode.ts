const GOOGLE_MAPS_API_KEY = "https://api64.ipify.org?format=json"; // Replace with your key

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed to fetch address");
  const data = await response.json();
  if (data.status === "OK" && data.results.length > 0) {
    return data.results[0].formatted_address;
  }
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}
