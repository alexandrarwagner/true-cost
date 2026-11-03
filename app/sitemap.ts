import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/** The pages worth indexing; a result or a full calculation belongs to the person who made it. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/privacy`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
