import type { PortfolioVideo } from "./video";

export type PortfolioMedia = {
  id: string;
  url: string;
  lightboxUrl: string;
  thumbUrl: string | null;
  width: number;
  height: number;
  alt: string;
  sortOrder: number;
};

export type PortfolioEntry = {
  id: string;
  title: string;
  description: string | null;
  video: PortfolioVideo | null;
  createdAt: string;
  published: boolean;
  media: PortfolioMedia[];
};

export type PortfolioPage = {
  entries: PortfolioEntry[];
  nextCursor: string | null;
};

export type PortfolioMonth = {
  key: string;
  label: string;
  count: number;
};

export type PortfolioDay = {
  date: string;
  count: number;
  thumbUrl: string | null;
};

export type PortfolioActivity = {
  month: string | null;
  months: PortfolioMonth[];
  days: PortfolioDay[];
};
