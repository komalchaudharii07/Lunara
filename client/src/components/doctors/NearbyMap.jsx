import { useEffect, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

const userIcon = new L.Icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const healthcareIcon = new L.DivIcon({
  className: "",
  html: `
    <div style="
      width:34px;
      height:34px;
      border-radius:50%;
      background:#e58da4;
      border:3px solid white;
      box-shadow:0 3px 12px rgba(170,95,120,0.3);
      display:flex;
      align-items:center;
      justify-content:center;
      font-size:17px;
    ">
      🏥
    </div>
  `,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
  popupAnchor: [0, -18],
});

// OpenStreetMap data can be edited by anyone, so only allow real web links
const safeUrl = (value) => {
  if (!value) return "";
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
};

function LocationUpdater({ location, zoom = 12 }) {
  const map = useMap();

  useEffect(() => {
    if (location) {
      map.flyTo(location, zoom, {
        duration: 1.5,
      });
    }
  }, [location, zoom, map]);

  return null;
}

export default function NearbyMap({ careType }) {
  const [location, setLocation] = useState(null);
  const [places, setPlaces] = useState([]);

  const [locationInput, setLocationInput] = useState("");
  const [searchingLocation, setSearchingLocation] =
    useState(false);

  const [loading, setLoading] = useState(false);
  const [placesLoading, setPlacesLoading] =
    useState(false);

  const [radius, setRadius] = useState(null);
  const [error, setError] = useState("");
  const requestId = useRef(0);

  const getHealthcareQuery = () => {
    if (careType === "pcos") {
      return `
        nwr["amenity"="doctors"](around:__RADIUS__,__LAT__,__LON__);
        nwr["amenity"="clinic"](around:__RADIUS__,__LAT__,__LON__);
        nwr["amenity"="hospital"](around:__RADIUS__,__LAT__,__LON__);
      `;
    }

    if (careType === "pregnancy") {
      return `
        nwr["amenity"="doctors"](around:__RADIUS__,__LAT__,__LON__);
        nwr["amenity"="clinic"](around:__RADIUS__,__LAT__,__LON__);
        nwr["amenity"="hospital"](around:__RADIUS__,__LAT__,__LON__);
        nwr["healthcare:speciality"~"obstetrics|gynaecology|gynecology|fertility",i](around:__RADIUS__,__LAT__,__LON__);
      `;
    }

    if (careType === "periods") {
      return `
        nwr["amenity"="doctors"](around:__RADIUS__,__LAT__,__LON__);
        nwr["amenity"="clinic"](around:__RADIUS__,__LAT__,__LON__);
        nwr["amenity"="hospital"](around:__RADIUS__,__LAT__,__LON__);
        nwr["healthcare:speciality"~"gynaecology|gynecology",i](around:__RADIUS__,__LAT__,__LON__);
      `;
    }

    return `
      nwr["amenity"="doctors"](around:__RADIUS__,__LAT__,__LON__);
      nwr["amenity"="clinic"](around:__RADIUS__,__LAT__,__LON__);
      nwr["amenity"="hospital"](around:__RADIUS__,__LAT__,__LON__);
    `;
  };

  const searchHealthcare = async (
    latitude,
    longitude
  ) => {
    const myRequest = ++requestId.current;
    setPlacesLoading(true);
    setError("");
    setPlaces([]);
    setRadius(null);

    // First 10 km, then maximum 25 km
    const radii = [10000, 25000];

    const endpoints = [
      "https://overpass-api.de/api/interpreter",
      "https://overpass.private.coffee/api/interpreter",
    ];

    let anyRequestWorked = false;

    try {
      for (const currentRadius of radii) {
        const healthcareQuery = getHealthcareQuery()
          .replaceAll("__RADIUS__", currentRadius)
          .replaceAll("__LAT__", latitude)
          .replaceAll("__LON__", longitude);

        const query = `
          [out:json][timeout:30];
          (
            ${healthcareQuery}
          );
          out center tags;
        `;

        let data = null;

        for (const endpoint of endpoints) {
          try {
            const response = await fetch(endpoint, {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/x-www-form-urlencoded",
              },
              body: `data=${encodeURIComponent(query)}`,
            });

            if (!response.ok) {
              continue;
            }

            data = await response.json();
            break;
          } catch {
            continue;
          }
        }

        if (!data) {
          continue;
        }

        anyRequestWorked = true;

        const healthcarePlaces = data.elements
          .map((place) => {
            const lat =
              place.lat ?? place.center?.lat;

            const lon =
              place.lon ?? place.center?.lon;

            if (lat == null || lon == null) {
              return null;
            }

            const tags = place.tags || {};

            return {
              id: `${place.type}-${place.id}`,

              name:
                tags.name ||
                tags["name:en"] ||
                "Healthcare Facility",

              type:
                tags.amenity ||
                tags.healthcare ||
                "Healthcare",

              address:
                tags["addr:full"] ||
                [
                  tags["addr:housenumber"],
                  tags["addr:street"],
                  tags["addr:city"],
                  tags["addr:state"],
                ]
                  .filter(Boolean)
                  .join(", ") ||
                "Address not available",

              phone:
                tags.phone ||
                tags["contact:phone"] ||
                "",

              website: safeUrl(tags.website || tags["contact:website"]),

              specialty:
                tags["healthcare:speciality"] ||
                tags["healthcare:specialty"] ||
                "",

              openingHours:
                tags.opening_hours || "",

              position: [lat, lon],
            };
          })
          .filter(Boolean);

        // a newer search has started: ignore this older answer
        if (myRequest !== requestId.current) return;

        if (healthcarePlaces.length > 0) {
          setPlaces(healthcarePlaces);
          setRadius(currentRadius / 1000);
          setPlacesLoading(false);
          return;
        }
      }

      if (myRequest !== requestId.current) return;

      setPlaces([]);
      setError(
        anyRequestWorked
          ? "No healthcare places were found within 25 km."
          : "The map service isn't responding right now. Please try again in a moment."
      );
    } catch (err) {
      console.error(err);

      setError(
        "Unable to load nearby healthcare places right now."
      );
    } finally {
      if (myRequest === requestId.current) setPlacesLoading(false);
    }
  };

  // USE CURRENT LOCATION
  const getLocation = () => {
    if (!navigator.geolocation) {
      setError(
        "Location is not supported by your browser."
      );
      return;
    }

    setLoading(true);
    setError("");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const {
          latitude,
          longitude,
        } = position.coords;

        const userLocation = [
          latitude,
          longitude,
        ];

        setLocation(userLocation);
        setLocationInput("Current location");
        setLoading(false);

        await searchHealthcare(
          latitude,
          longitude
        );
      },
      (geoError) => {
        setError(
          geoError?.code === 1
            ? "Location access was denied. Please allow location permission."
            : geoError?.code === 3
            ? "Finding your location took too long. Try again or search for a place."
            : "Couldn't work out your location. Try searching for a place instead."
        );

        setLoading(false);
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  // SEARCH CITY / AREA / LANDMARK / PINCODE
  const searchLocation = async () => {
    const query = locationInput.trim();

    if (!query) {
      setError("Please enter a location.");
      return;
    }

    setSearchingLocation(true);
    setError("");

    try {
      const searchQueries = [
        query,
        `${query}, India`,
      ];

      let data = [];

      for (const searchQuery of searchQueries) {
        const url =
          `https://nominatim.openstreetmap.org/search?` +
          `q=${encodeURIComponent(searchQuery)}` +
          `&format=jsonv2` +
          `&addressdetails=1` +
          `&limit=5` +
          `&countrycodes=in`;

        const response = await fetch(url);

        if (!response.ok) {
          continue;
        }

        const results = await response.json();

        if (results.length > 0) {
          data = results;
          break;
        }
      }

      if (!data.length) {
        throw new Error(
          "Location not found. Try a city, area, landmark or pincode."
        );
      }

      // Best matching result
      const selected = data[0];

      const latitude = Number(selected.lat);
      const longitude = Number(selected.lon);

      const selectedLocation = [
        latitude,
        longitude,
      ];

      setLocation(selectedLocation);

      await searchHealthcare(
        latitude,
        longitude
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setSearchingLocation(false);
    }
  };

  return (
    <div className="relative h-[520px] overflow-hidden rounded-3xl border border-[#eadde1] bg-[#fdf5f7]">

      <MapContainer
        center={[20.5937, 78.9629]}
        zoom={5}
        scrollWheelZoom={true}
        className="h-full w-full"
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {location && (
          <>
            <LocationUpdater location={location} />

            <Marker
              position={location}
              icon={userIcon}
            >
              <Popup>
                <div className="text-center">
                  <p className="font-semibold text-[#292331]">
                    Selected location 💗
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    Healthcare search starts from here
                  </p>
                </div>
              </Popup>
            </Marker>
          </>
        )}

        {places.map((place) => (
          <Marker
            key={place.id}
            position={place.position}
            icon={healthcareIcon}
          >
            <Popup>
              <div className="min-w-[230px]">
                <p className="text-sm font-semibold text-[#292331]">
                  {place.name}
                </p>

                <p className="mt-1 text-xs capitalize text-[#d77f97]">
                  {place.type}
                </p>

                {place.specialty && (
                  <p className="mt-2 text-xs text-gray-500">
                    🩺 {place.specialty}
                  </p>
                )}

                <p className="mt-2 text-xs leading-5 text-gray-500">
                  📍 {place.address}
                </p>

                {place.phone && (
                  <p className="mt-1 text-xs text-gray-500">
                    📞 {place.phone}
                  </p>
                )}

                {place.openingHours && (
                  <p className="mt-1 text-xs text-gray-500">
                    🕐 {place.openingHours}
                  </p>
                )}

                {place.website && (
                  <a
                    href={place.website}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 block text-xs font-medium text-[#d77f97]"
                  >
                    Visit website →
                  </a>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* SEARCH PANEL */}
      <div className="absolute left-4 right-4 top-4 z-[1000] rounded-2xl border border-white/70 bg-white/95 p-4 shadow-lg backdrop-blur">

        <p className="text-sm font-semibold text-[#292331]">
          Where should we find care? 💗
        </p>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={locationInput}
            onChange={(e) =>
              setLocationInput(e.target.value)
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                searchLocation();
              }
            }}
            placeholder="Search city, area, landmark or pincode"
            className="h-11 flex-1 rounded-xl border border-[#eadde1] bg-[#fffafb] px-4 text-sm text-[#292331] outline-none placeholder:text-gray-400 focus:border-[#e58da4]"
          />

          <button
            onClick={searchLocation}
            disabled={searchingLocation || placesLoading}
            className="h-11 rounded-xl bg-[#292331] px-5 text-sm font-semibold text-white transition hover:bg-[#3b3444] disabled:opacity-60"
          >
            {searchingLocation
              ? "Searching..."
              : "Search"}
          </button>
        </div>

        {/* CURRENT LOCATION */}
        <button
          onClick={getLocation}
          disabled={loading || placesLoading}
          className="mt-2 text-xs font-medium text-[#d77f97] hover:text-[#c76e87] disabled:opacity-50"
        >
          📍 Use my current location
        </button>

        {placesLoading && (
          <p className="mt-2 text-xs text-gray-400">
            Looking for nearby healthcare...
          </p>
        )}

        {!placesLoading &&
          places.length > 0 &&
          radius && (
            <p className="mt-2 text-xs text-gray-400">
              Showing {places.length} healthcare places
              within {radius} km.
            </p>
          )}
      </div>

      {/* ERROR */}
      {error && (
        <div className="absolute bottom-4 left-4 right-4 z-[1000] rounded-2xl border border-[#f1d7de] bg-white/95 px-4 py-3 text-center shadow-lg backdrop-blur">
          <p className="text-xs text-red-500">
            {error}
          </p>
        </div>
      )}

      {/* INITIAL STATE */}
      {!location &&
        !loading &&
        !error && (
          <div className="pointer-events-none absolute inset-0 z-[500] flex items-center justify-center">
            <div className="rounded-2xl bg-white/90 px-6 py-4 text-center shadow-lg backdrop-blur">
              <div className="text-2xl">
                🌸
              </div>

              <p className="mt-2 text-sm font-semibold text-[#292331]">
                Find care wherever you need it
              </p>

              <p className="mt-1 text-xs text-gray-400">
                Search a location or use your current location
              </p>
            </div>
          </div>
        )}
    </div>
  );
}