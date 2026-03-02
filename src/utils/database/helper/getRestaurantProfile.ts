import connectDB from "#utils/database/connect";
import { Profiles, type TProfile } from "#utils/database/models/profile";

const SEO_FIELDS = "name restaurantID orderUrlSlug description address avatar cover categories themeColor" as const;

export async function getRestaurantProfile(restaurantID: string) {
	await connectDB();
	return Profiles.findOne<TProfile>({ $or: [{ restaurantID }, { orderUrlSlug: restaurantID }] })
		.select(SEO_FIELDS)
		.lean();
}
