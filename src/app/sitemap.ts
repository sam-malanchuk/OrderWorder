import type { MetadataRoute } from "next";
import connectDB from "#utils/database/connect";
import { Profiles } from "#utils/database/models/profile";
import { SITE_URL } from "#utils/seo/constants";

const staticEntries: MetadataRoute.Sitemap = [
	{
		url: SITE_URL,
		lastModified: new Date(),
		changeFrequency: "weekly",
		priority: 1,
	},
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	try {
		await connectDB();
		const restaurants = await Profiles.find({}, { restaurantID: 1, orderUrlSlug: 1, updatedAt: 1 }).lean();

		const restaurantEntries: MetadataRoute.Sitemap = restaurants.map((r) => ({
			url: `${SITE_URL}/${r.orderUrlSlug || r.restaurantID}`,
			lastModified: r.updatedAt ?? new Date(),
			changeFrequency: "daily",
			priority: 0.8,
		}));

		return [...staticEntries, ...restaurantEntries];
	} catch (error) {
		console.error("Failed to generate dynamic sitemap entries; returning static sitemap.", error);
		return staticEntries;
	}
}
