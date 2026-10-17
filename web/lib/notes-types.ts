export type Accent = "sumi" | "shu" | "ai" | "matcha" | "kin";
export const ACCENTS: Accent[] = ["sumi", "shu", "ai", "matcha", "kin"];

export type NoteSummary = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  ownerSub: string;
  ownerName: string;
  visibility: "private" | "public";
  accent: Accent;
  coverKey: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  readingMinutes: number;
};

export type Note = NoteSummary & { body: string };
