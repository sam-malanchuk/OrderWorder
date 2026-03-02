import { getServerSession } from "next-auth";

import { authOptions } from "#utils/helper/authHelper";
import connectDB from "../connect";
import { Profiles, type TProfile } from "../models/profile";

export const getThemeColor = async (username?: string, target: "admin" | "frontend" | "ready" = "admin") => {
	if (!username) {
		const session = await getServerSession(authOptions);
		return session?.themeColor;
	}

	await connectDB();
	const profile = await Profiles.findOne<TProfile>({ $or: [{ restaurantID: username }, { orderUrlSlug: username }] });
	if (!profile) return undefined;
	if (target === "frontend") return profile.themeFrontend ?? profile.themeColor;
	if (target === "ready") return profile.themeReady ?? profile.themeColor;
	return profile.themeAdmin ?? profile.themeColor;
};
