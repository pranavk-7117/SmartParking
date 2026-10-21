import React, { useEffect, useMemo, useState } from 'react';
import {
  Bike,
  Car,
  Check,
  MapPin,
  Navigation,
  ParkingSquare,
  RefreshCw,
  Search,
} from 'lucide-react';

interface AvailableSpot {
  locationCode: string;
  category: 'Car' | 'Scooter';
}

interface PublicSite {
  siteId: string;
  siteName: string;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  carHourlyRate: number;
  scooterHourlyRate: number;
  availableSpots: AvailableSpot[];
}

interface DisplayResponse {
  allSites?: PublicSite[];
}

interface SpotWithSite extends AvailableSpot {
  site: PublicSite;
  rate: number;
  selectionId: string;
}

type SpotFilter = 'All' | 'Car' | 'Scooter';

const formatPrice = (price: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(price);

const getMapUrl = (site: PublicSite) => {
  const destination =
    typeof site.latitude === 'number' && typeof site.longitude === 'number'
      ? `${site.latitude},${site.longitude}`
      : site.address;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination)}`;
};

export const ParkingLanding: React.FC = () => {
  const [sites, setSites] = useState<PublicSite[]>([]);
  const [selectedSpotIds, setSelectedSpotIds] = useState<Set<string>>(() => new Set());
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<SpotFilter>('All');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadAvailability = async () => {
      try {
        const response = await fetch('/api/v1/display');
        const data = (await response.json()) as DisplayResponse & { error?: string };
        if (!response.ok) {
          throw new Error(data.error || `Unable to load parking availability (${response.status})`);
        }
        if (!Array.isArray(data.allSites)) {
          throw new Error('Parking availability response is incomplete');
        }
        if (isMounted) {
          setSites(data.allSites);
          setError(null);
          setUpdatedAt(new Date());
          setSelectedSpotIds((selected) => {
            const availableIds = new Set(
              data.allSites!.flatMap((site) =>
                site.availableSpots.map((spot) => `${site.siteId}:${spot.locationCode}`)
              )
            );
            return new Set([...selected].filter((id) => availableIds.has(id)));
          });
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load parking availability');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void loadAvailability();
    const intervalId = window.setInterval(() => void loadAvailability(), 15_000);
    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const spots = useMemo<SpotWithSite[]>(
    () =>
      sites.flatMap((site) =>
        site.availableSpots.map((spot) => ({
          ...spot,
          site,
          rate: spot.category === 'Car' ? site.carHourlyRate : site.scooterHourlyRate,
          selectionId: `${site.siteId}:${spot.locationCode}`,
        }))
      ),
    [sites]
  );

  const filteredSpots = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return spots.filter((spot) => {
      const matchesFilter = filter === 'All' || spot.category === filter;
      const matchesQuery =
        !normalizedQuery ||
        spot.site.siteName.toLowerCase().includes(normalizedQuery) ||
        spot.site.address.toLowerCase().includes(normalizedQuery) ||
        spot.locationCode.toLowerCase().includes(normalizedQuery);
      return matchesFilter && matchesQuery;
    });
  }, [filter, query, spots]);

  const selectedSpots = spots.filter((spot) => selectedSpotIds.has(spot.selectionId));
  const selectedHourlyTotal = selectedSpots.reduce((total, spot) => total + spot.rate, 0);

  const toggleSpot = (selectionId: string) => {
    setSelectedSpotIds((selected) => {
      const next = new Set(selected);
      if (next.has(selectionId)) next.delete(selectionId);
      else next.add(selectionId);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-[#f5f7f5] text-neutral-900">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <a href="/" className="flex items-center gap-2.5" aria-label="ParkIT home">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-700 text-white">
              <ParkingSquare className="h-5 w-5" />
            </span>
            <span className="text-xl font-extrabold tracking-tight">ParkIT</span>
          </a>
          <div className="flex items-center gap-2 text-sm font-medium text-neutral-500" aria-live="polite">
            <span className={`h-2.5 w-2.5 rounded-full ${error ? 'bg-amber-500' : 'bg-emerald-500'}`} />
            <span>{updatedAt ? 'Live availability' : 'Connecting'}</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 pb-32 pt-10 sm:px-8 sm:pt-14">
        <section className="mb-8 max-w-3xl">
          <p className="mb-3 text-sm font-bold uppercase tracking-[0.16em] text-emerald-700">
            Find a parking spot
          </p>
          <h1 className="text-3xl font-black tracking-tight sm:text-5xl">
            Available parking, right where you need it.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-neutral-600">
            Browse open car and scooter spots, compare hourly prices, and get directions to the parking location.
          </p>
        </section>

        <section className="mb-6 flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
          <label className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <span className="sr-only">Search parking spots or locations</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by parking location or spot ID"
              className="h-11 w-full rounded-xl border border-neutral-200 bg-neutral-50 pl-10 pr-3 text-sm outline-none transition focus:border-emerald-600 focus:bg-white"
            />
          </label>
          <div className="flex gap-2" role="group" aria-label="Filter by vehicle type">
            {(['All', 'Car', 'Scooter'] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setFilter(option)}
                aria-pressed={filter === option}
                className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                  filter === option
                    ? 'bg-emerald-700 text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                {option === 'All' ? 'All spots' : option}
              </button>
            ))}
          </div>
        </section>

        <div className="mb-4 flex items-center justify-between gap-4">
          <p className="text-sm font-semibold text-neutral-600">
            {isLoading ? 'Loading available spots…' : `${filteredSpots.length} available ${filteredSpots.length === 1 ? 'spot' : 'spots'}`}
          </p>
          {updatedAt && (
            <p className="flex items-center gap-1.5 text-xs text-neutral-400">
              <RefreshCw className="h-3.5 w-3.5" />
              Updated {updatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="alert">
            {error}. Availability will be retried automatically.
          </div>
        )}

        {isLoading && sites.length === 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Loading parking spots">
            {[0, 1, 2].map((item) => (
              <div key={item} className="h-52 animate-pulse rounded-2xl border border-neutral-200 bg-white" />
            ))}
          </div>
        ) : filteredSpots.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredSpots.map((spot) => {
              const isSelected = selectedSpotIds.has(spot.selectionId);
              const VehicleIcon = spot.category === 'Car' ? Car : Bike;
              return (
                <article
                  key={spot.selectionId}
                  className={`rounded-2xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                    isSelected ? 'border-emerald-600 ring-1 ring-emerald-600' : 'border-neutral-200'
                  }`}
                >
                  <div className="mb-5 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                        <VehicleIcon className="h-5 w-5" />
                      </span>
                      <div>
                        <h2 className="font-bold">{spot.category} parking</h2>
                        <p className="mt-0.5 text-sm text-neutral-500">Spot {spot.locationCode}</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                      Available
                    </span>
                  </div>

                  <div className="mb-4 border-t border-neutral-100 pt-4">
                    <p className="font-semibold text-neutral-800">{spot.site.siteName}</p>
                    <p className="mt-1 flex items-start gap-1.5 text-sm leading-5 text-neutral-500">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{spot.site.address}</span>
                    </p>
                  </div>

                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">Hourly price</p>
                      <p className="mt-0.5 text-xl font-extrabold text-neutral-900">
                        {formatPrice(spot.rate)}<span className="text-sm font-medium text-neutral-500"> / hour</span>
                      </p>
                    </div>
                    <a
                      href={getMapUrl(spot.site)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 hover:text-emerald-900"
                      aria-label={`Get directions to ${spot.site.siteName}`}
                    >
                      <Navigation className="h-4 w-4" />
                      Directions
                    </a>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleSpot(spot.selectionId)}
                    aria-pressed={isSelected}
                    className={`mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold transition ${
                      isSelected
                        ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                        : 'bg-neutral-900 text-white hover:bg-neutral-700'
                    }`}
                  >
                    {isSelected ? <Check className="h-4 w-4" /> : <ParkingSquare className="h-4 w-4" />}
                    {isSelected ? 'Selected' : 'Select spot'}
                  </button>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-neutral-300 bg-white px-6 py-16 text-center">
            <ParkingSquare className="mx-auto h-9 w-9 text-neutral-300" />
            <h2 className="mt-4 text-lg font-bold text-neutral-800">
              {spots.length === 0 ? 'No spots are available right now' : 'No spots match your search'}
            </h2>
            <p className="mt-2 text-sm text-neutral-500">
              {spots.length === 0
                ? 'Check back soon for live parking availability.'
                : 'Try another location, spot ID, or vehicle type.'}
            </p>
          </div>
        )}
      </main>

      {selectedSpots.length > 0 && (
        <aside className="fixed inset-x-0 bottom-0 z-30 border-t border-neutral-200 bg-white/95 shadow-[0_-8px_30px_rgba(17,24,39,0.08)] backdrop-blur">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <div>
              <p className="text-sm font-bold text-neutral-900">
                {selectedSpots.length} selected {selectedSpots.length === 1 ? 'spot' : 'spots'}
              </p>
              <p className="mt-0.5 text-xs text-neutral-500">
                {selectedSpots.map((spot) => spot.locationCode).join(', ')}
              </p>
            </div>
            <div className="flex items-center justify-between gap-4 sm:justify-end">
              <div className="text-right">
                <p className="text-xs font-medium text-neutral-500">Selected hourly total</p>
                <p className="text-xl font-extrabold text-emerald-800">
                  {formatPrice(selectedHourlyTotal)}<span className="text-sm font-semibold text-neutral-500"> / hour</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSpotIds(new Set())}
                className="rounded-xl border border-neutral-200 px-4 py-2.5 text-sm font-semibold text-neutral-600 hover:bg-neutral-50"
              >
                Clear
              </button>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
};
