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
  createdAt: string;
  published: boolean;
  media: PortfolioMedia[];
};

export type PortfolioPage = {
  entries: PortfolioEntry[];
  nextCursor: string | null;
};
