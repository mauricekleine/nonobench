import type { MetadataRoute } from "next";

import { RESULTS_TIMESTAMP, SITE_URL } from "@/lib/data";

export default function sitemap(): MetadataRoute.Sitemap {
	return [
		{ url: `${SITE_URL}/`, lastModified: RESULTS_TIMESTAMP, changeFrequency: "weekly", priority: 1 },
		{ url: `${SITE_URL}/puzzles`, lastModified: RESULTS_TIMESTAMP, changeFrequency: "monthly", priority: 0.7 },
		{ url: `${SITE_URL}/llms.txt`, lastModified: RESULTS_TIMESTAMP, changeFrequency: "weekly", priority: 0.5 },
	];
}
