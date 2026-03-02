import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import connectDB from "#utils/database/connect";
import { Profiles, type TProfile } from "#utils/database/models/profile";
import { authOptions } from "#utils/helper/authHelper";
import { CatchNextResponse } from "#utils/helper/common";

export async function POST(req: Request) {
	try {
		await connectDB();
		const session = await getServerSession(authOptions);
		const { name, avatar, orderUrlSlug, printUrl } = await req.json();

		if (!session) throw { status: 401, message: "Authentication Required" };
		if (!name?.trim()) throw { status: 400, message: "Company name is required" };

		const sanitizedOrderUrlSlug = orderUrlSlug?.trim()?.toLowerCase();
		if (sanitizedOrderUrlSlug && !/^[a-z0-9]+$/.test(sanitizedOrderUrlSlug))
			throw { status: 400, message: "Order URL must be one word using only letters and numbers" };

		const existingSlugProfile =
			sanitizedOrderUrlSlug &&
			(await Profiles.findOne<TProfile>({ orderUrlSlug: sanitizedOrderUrlSlug, restaurantID: { $ne: session?.username } }).select("restaurantID"));
		if (existingSlugProfile) throw { status: 409, message: "That order URL is already taken" };

		const profile = await Profiles.findOne<TProfile>({ restaurantID: session?.username });
		if (!profile) throw { status: 404, message: "Profile not found" };

		profile.name = name.trim();
		profile.avatar = avatar?.trim() ?? "";
		profile.orderUrlSlug = sanitizedOrderUrlSlug || undefined;
		profile.printUrl = printUrl?.trim() || undefined;
		await profile.save();

		return NextResponse.json({
			status: 200,
			message: "Company details saved",
			orderUrlSlug: profile.orderUrlSlug || profile.restaurantID,
			printUrl: profile.printUrl || "",
		});
	} catch (err) {
		console.log(err);
		return CatchNextResponse(err);
	}
}

export const dynamic = "force-dynamic";
