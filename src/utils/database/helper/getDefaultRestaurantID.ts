export async function getDefaultRestaurantID() {
	if (!process.env.MONGODB_URI) return undefined;

	const { default: connectDB } = await import("#utils/database/connect");
	const { Profiles } = await import("#utils/database/models/profile");

	await connectDB();
	const profile = await Profiles.findOne().sort({ createdAt: 1 }).select("restaurantID orderUrlSlug").lean();
	return profile?.orderUrlSlug || profile?.restaurantID;
}
