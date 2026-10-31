export interface SiteItem {
  id: string;
  url: string;
  title: string;
  description: string;
  category: string;
  faviconUrl: string;
  previewImageUrl: string;
  createdAt: number;
  visitCount?: number;
  displayOrder?: number;
  badge?: string;
  rating?: number;
  usersCount?: string;
  tags?: string[];
  features?: string[];
  techStack?: string[];
}

export interface SiteMetadataFetchResult {
  url: string;
  domain: string;
  title: string;
  description: string;
  category: string;
  faviconUrl: string;
  previewImageUrl: string;
  screenshotUrl?: string;
  bannerUrl?: string | null;
  thumIoScreenshot?: string;
  wpMshots?: string;
}
