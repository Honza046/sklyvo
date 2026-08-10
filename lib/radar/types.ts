export type RadarDiscoverySource = "places" | "web" | "linkedin";

export type RadarLead = {
  id: string;
  name: string;
  address: string;
  rating: number | null;
  placeId: string | null;
  url: string;
  phone: string;
  email: string | null;
  placeTypes: string[];
  linkedinUrl: string | null;
  discoverySources: RadarDiscoverySource[];
};

export type RadarSourceFlags = {
  places: boolean;
  web: boolean;
  linkedin: boolean;
};

export const DEFAULT_RADAR_SOURCES: RadarSourceFlags = {
  places: true,
  web: true,
  linkedin: true,
};

export type RadarOrchestrateInput = {
  query: string;
  limit: number;
  regionCode?: string | null;
  excludeCrm?: boolean;
  deepScan?: boolean;
  sources?: Partial<RadarSourceFlags>;
  /** When set, used instead of loading CRM keys (automated path). */
  crmKeys?: {
    placeIds: Set<string>;
    domains: Set<string>;
    names: Set<string>;
  } | null;
};

export type RadarProviderHit = {
  name: string;
  address?: string;
  rating?: number | null;
  placeId?: string | null;
  url?: string | null;
  phone?: string | null;
  email?: string | null;
  placeTypes?: string[];
  linkedinUrl?: string | null;
  source: RadarDiscoverySource;
};
