import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { isValidThemeColor } from "xtreme-ui";

import connectDB from "#utils/database/connect";
import { Profiles, type TProfile } from "#utils/database/models/profile";
import { authOptions } from "#utils/helper/authHelper";
import { CatchNextResponse } from "#utils/helper/common";

export async function POST(req: Request) {
	try {
		await connectDB();
		const session = await getServerSession(authOptions);
		const { themeColor, target = "admin" } = await req.json();

		if (!session) throw { status: 401, message: "Authentication Required" };
		if (!isValidThemeColor(themeColor)) throw { status: 400, message: "Valid theme color is required" };
		if (!["admin", "frontend", "ready"].includes(target)) throw { status: 400, message: "Invalid theme target" };

		const profile = await Profiles.findOne<TProfile>({ restaurantID: session?.username });

		if (!profile) throw { status: 500, message: "Something went wrong" };

		if (target === "frontend") profile.themeFrontend = themeColor;
		else if (target === "ready") profile.themeReady = themeColor;
		else profile.themeAdmin = themeColor;
		await profile.save();

		return NextResponse.json({ status: 200, message: "Theme applied successfully" });
	} catch (err) {
		console.log(err);
		return CatchNextResponse(err);
	}
}

export const dynamic = "force-dynamic";
