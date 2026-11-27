/**
 * Curated list of Indian cities for manual location selection.
 *
 * This is an original, hand-maintained dataset of public geographic facts
 * (city name, state, approximate city-centre coordinates). It exists so the
 * app never depends on a third-party geocoding service and manual selection
 * always works even when browser location permission is denied
 * (brief sections 5.1 and 11).
 *
 * Coordinates are approximate city-centre values suitable for area-level,
 * modelled air-quality data; they are never treated as a household address.
 */

export interface City {
  name: string;
  state: string;
  lat: number;
  lon: number;
}

export const CITIES: City[] = [
  { name: "Delhi", state: "Delhi", lat: 28.6139, lon: 77.209 },
  { name: "New Delhi", state: "Delhi", lat: 28.6219, lon: 77.2148 },
  { name: "Gurugram", state: "Haryana", lat: 28.4595, lon: 77.0266 },
  { name: "Noida", state: "Uttar Pradesh", lat: 28.5355, lon: 77.391 },
  { name: "Ghaziabad", state: "Uttar Pradesh", lat: 28.6692, lon: 77.4538 },
  { name: "Faridabad", state: "Haryana", lat: 28.4089, lon: 77.3178 },
  { name: "Greater Noida", state: "Uttar Pradesh", lat: 28.4744, lon: 77.504 },
  { name: "Mumbai", state: "Maharashtra", lat: 19.076, lon: 72.8777 },
  { name: "Navi Mumbai", state: "Maharashtra", lat: 19.033, lon: 73.0297 },
  { name: "Thane", state: "Maharashtra", lat: 19.2183, lon: 72.9781 },
  { name: "Pune", state: "Maharashtra", lat: 18.5204, lon: 73.8567 },
  { name: "Nagpur", state: "Maharashtra", lat: 21.1458, lon: 79.0882 },
  { name: "Nashik", state: "Maharashtra", lat: 19.9975, lon: 73.7898 },
  { name: "Aurangabad", state: "Maharashtra", lat: 19.8762, lon: 75.3433 },
  { name: "Bengaluru", state: "Karnataka", lat: 12.9716, lon: 77.5946 },
  { name: "Mysuru", state: "Karnataka", lat: 12.2958, lon: 76.6394 },
  { name: "Hubballi", state: "Karnataka", lat: 15.3647, lon: 75.124 },
  { name: "Mangaluru", state: "Karnataka", lat: 12.9141, lon: 74.856 },
  { name: "Hyderabad", state: "Telangana", lat: 17.385, lon: 78.4867 },
  { name: "Warangal", state: "Telangana", lat: 17.9689, lon: 79.5941 },
  { name: "Chennai", state: "Tamil Nadu", lat: 13.0827, lon: 80.2707 },
  { name: "Coimbatore", state: "Tamil Nadu", lat: 11.0168, lon: 76.9558 },
  { name: "Madurai", state: "Tamil Nadu", lat: 9.9252, lon: 78.1198 },
  { name: "Tiruchirappalli", state: "Tamil Nadu", lat: 10.7905, lon: 78.7047 },
  { name: "Kolkata", state: "West Bengal", lat: 22.5726, lon: 88.3639 },
  { name: "Howrah", state: "West Bengal", lat: 22.5958, lon: 88.2636 },
  { name: "Siliguri", state: "West Bengal", lat: 26.7271, lon: 88.3953 },
  { name: "Durgapur", state: "West Bengal", lat: 23.5204, lon: 87.3119 },
  { name: "Ahmedabad", state: "Gujarat", lat: 23.0225, lon: 72.5714 },
  { name: "Surat", state: "Gujarat", lat: 21.1702, lon: 72.8311 },
  { name: "Vadodara", state: "Gujarat", lat: 22.3072, lon: 73.1812 },
  { name: "Rajkot", state: "Gujarat", lat: 22.3039, lon: 70.8022 },
  { name: "Jaipur", state: "Rajasthan", lat: 26.9124, lon: 75.7873 },
  { name: "Jodhpur", state: "Rajasthan", lat: 26.2389, lon: 73.0243 },
  { name: "Udaipur", state: "Rajasthan", lat: 24.5854, lon: 73.7125 },
  { name: "Kota", state: "Rajasthan", lat: 25.2138, lon: 75.8648 },
  { name: "Lucknow", state: "Uttar Pradesh", lat: 26.8467, lon: 80.9462 },
  { name: "Kanpur", state: "Uttar Pradesh", lat: 26.4499, lon: 80.3319 },
  { name: "Varanasi", state: "Uttar Pradesh", lat: 25.3176, lon: 82.9739 },
  { name: "Agra", state: "Uttar Pradesh", lat: 27.1767, lon: 78.0081 },
  { name: "Prayagraj", state: "Uttar Pradesh", lat: 25.4358, lon: 81.8463 },
  { name: "Meerut", state: "Uttar Pradesh", lat: 28.9845, lon: 77.7064 },
  { name: "Patna", state: "Bihar", lat: 25.5941, lon: 85.1376 },
  { name: "Gaya", state: "Bihar", lat: 24.7914, lon: 85.0002 },
  { name: "Bhagalpur", state: "Bihar", lat: 25.2425, lon: 86.9842 },
  { name: "Bhopal", state: "Madhya Pradesh", lat: 23.2599, lon: 77.4126 },
  { name: "Indore", state: "Madhya Pradesh", lat: 22.7196, lon: 75.8577 },
  { name: "Jabalpur", state: "Madhya Pradesh", lat: 23.1815, lon: 79.9864 },
  { name: "Gwalior", state: "Madhya Pradesh", lat: 26.2183, lon: 78.1828 },
  { name: "Raipur", state: "Chhattisgarh", lat: 21.2514, lon: 81.6296 },
  { name: "Bhilai", state: "Chhattisgarh", lat: 21.2094, lon: 81.427 },
  { name: "Chandigarh", state: "Chandigarh", lat: 30.7333, lon: 76.7794 },
  { name: "Amritsar", state: "Punjab", lat: 31.634, lon: 74.8723 },
  { name: "Ludhiana", state: "Punjab", lat: 30.901, lon: 75.8573 },
  { name: "Jalandhar", state: "Punjab", lat: 31.326, lon: 75.5762 },
  { name: "Patiala", state: "Punjab", lat: 30.3398, lon: 76.3869 },
  { name: "Dehradun", state: "Uttarakhand", lat: 30.3165, lon: 78.0322 },
  { name: "Haridwar", state: "Uttarakhand", lat: 29.9457, lon: 78.1642 },
  { name: "Shimla", state: "Himachal Pradesh", lat: 31.1048, lon: 77.1734 },
  { name: "Jammu", state: "Jammu & Kashmir", lat: 32.7266, lon: 74.857 },
  { name: "Srinagar", state: "Jammu & Kashmir", lat: 34.0837, lon: 74.7973 },
  { name: "Guwahati", state: "Assam", lat: 26.1445, lon: 91.7362 },
  { name: "Dibrugarh", state: "Assam", lat: 27.4728, lon: 94.912 },
  { name: "Bhubaneswar", state: "Odisha", lat: 20.2961, lon: 85.8245 },
  { name: "Cuttack", state: "Odisha", lat: 20.4625, lon: 85.883 },
  { name: "Ranchi", state: "Jharkhand", lat: 23.3441, lon: 85.3096 },
  { name: "Jamshedpur", state: "Jharkhand", lat: 22.8046, lon: 86.2029 },
  { name: "Dhanbad", state: "Jharkhand", lat: 23.7957, lon: 86.4304 },
  { name: "Kochi", state: "Kerala", lat: 9.9312, lon: 76.2673 },
  { name: "Thiruvananthapuram", state: "Kerala", lat: 8.5241, lon: 76.9366 },
  { name: "Kozhikode", state: "Kerala", lat: 11.2588, lon: 75.7804 },
  { name: "Visakhapatnam", state: "Andhra Pradesh", lat: 17.6868, lon: 83.2185 },
  { name: "Vijayawada", state: "Andhra Pradesh", lat: 16.5062, lon: 80.648 },
  { name: "Guntur", state: "Andhra Pradesh", lat: 16.3067, lon: 80.4365 },
  { name: "Tirupati", state: "Andhra Pradesh", lat: 13.6288, lon: 79.4192 },
  { name: "Goa (Panaji)", state: "Goa", lat: 15.4909, lon: 73.8278 },
  { name: "Puducherry", state: "Puducherry", lat: 11.9416, lon: 79.8083 },
  { name: "Moradabad", state: "Uttar Pradesh", lat: 28.8386, lon: 78.7733 },
  { name: "Panipat", state: "Haryana", lat: 29.3909, lon: 76.9635 },
  { name: "Sonipat", state: "Haryana", lat: 28.9931, lon: 77.0154 },
  { name: "Rohtak", state: "Haryana", lat: 28.8955, lon: 76.6066 },
];

export function searchCities(query: string, limit = 8): City[] {
  const q = query.trim().toLowerCase();
  if (!q) return CITIES.slice(0, limit);
  const starts = CITIES.filter((c) => c.name.toLowerCase().startsWith(q));
  const contains = CITIES.filter(
    (c) =>
      !c.name.toLowerCase().startsWith(q) &&
      (c.name.toLowerCase().includes(q) ||
        c.state.toLowerCase().includes(q))
  );
  return [...starts, ...contains].slice(0, limit);
}

export function findCity(name: string): City | undefined {
  const q = name.trim().toLowerCase();
  return CITIES.find((c) => c.name.toLowerCase() === q);
}
