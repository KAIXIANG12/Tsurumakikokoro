import type { SupportLocation } from "../data/locations";

export interface SiteConfig {
  title: string;
  birthdayDate: string;
  heroSlogan: string;
  mapPinned: boolean;
}

export interface BlessingDraft {
  nickname: string;
  message: string;
  imageUrl?: string;
}

export interface AdminDataSource {
  listLocations(): Promise<SupportLocation[]>;
  createLocation(payload: Omit<SupportLocation, "id">): Promise<SupportLocation>;
  updateLocation(id: string, payload: Partial<SupportLocation>): Promise<SupportLocation>;
  deleteLocation(id: string): Promise<void>;
  submitBlessing(payload: BlessingDraft): Promise<void>;
  updateSiteConfig(payload: Partial<SiteConfig>): Promise<SiteConfig>;
}

export class CloudBaseDataSource implements AdminDataSource {
  async listLocations(): Promise<SupportLocation[]> {
    throw new Error("Connect this method to CloudBase collection: locations");
  }

  async createLocation(): Promise<SupportLocation> {
    throw new Error("Connect this method to a CloudBase cloud function");
  }

  async updateLocation(): Promise<SupportLocation> {
    throw new Error("Connect this method to a CloudBase cloud function");
  }

  async deleteLocation(): Promise<void> {
    throw new Error("Connect this method to a CloudBase cloud function");
  }

  async submitBlessing(): Promise<void> {
    throw new Error("Connect this method to CloudBase collection: blessings");
  }

  async updateSiteConfig(): Promise<SiteConfig> {
    throw new Error("Connect this method to CloudBase collection: site_config");
  }
}
