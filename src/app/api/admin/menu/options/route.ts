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
		const body = await req.json();
		if (!session) throw { status: 401, message: "Authentication Required" };

		const profile = await Profiles.findOne<TProfile>({ restaurantID: session.username });
		if (!profile) throw { status: 404, message: "Profile not found" };

		profile.categorySettings = (body?.categorySettings ?? [])
			.map((item: { name: string; color?: string; hidden?: boolean }) => ({
				name: item.name?.trim()?.toLowerCase(),
				color: item.color || "#64748b",
				hidden: !!item.hidden,
			}))
			.filter((item: { name: string }) => item.name);
		profile.categories = profile.categorySettings?.map((item) => item.name) ?? [];

		profile.milkOptions = (body?.milkOptions ?? [])
			.map((item: { name: string; hidden?: boolean }) => ({ name: item.name?.trim(), hidden: !!item.hidden }))
			.filter((item: { name: string }) => item.name);
		profile.addonOptions = (body?.addonOptions ?? [])
			.map((item: { name: string; hidden?: boolean }) => ({ name: item.name?.trim(), hidden: !!item.hidden }))
			.filter((item: { name: string }) => item.name);

		await profile.save();
		return NextResponse.json({ status: 200, message: "Menu options saved" });
	} catch (err) {
		console.log(err);
		return CatchNextResponse(err);
	}
}

export const dynamic = "force-dynamic";
