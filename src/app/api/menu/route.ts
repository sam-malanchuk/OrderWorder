import omit from "lodash/omit";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { getRestaurantData } from "#utils/database/helper/account";
import type { TMenu } from "#utils/database/models/menu";
import { Profiles, type TProfile } from "#utils/database/models/profile";
import type { TTable } from "#utils/database/models/table";
import { authOptions } from "#utils/helper/authHelper";
import { CatchNextResponse } from "#utils/helper/common";

export async function GET(req: Request) {
	try {
		let username = new URL(req.url).searchParams.get("id");

		if (!username) {
			const session = await getServerSession(authOptions);
			username = session?.username ?? null;
		}
		if (!username) throw { status: 400, message: "Restaurant id is required to fetch menu" };

		let account = null;
		const profileBySlug = await Profiles.findOne<TProfile>({ orderUrlSlug: username }).select("restaurantID").lean();
		if (profileBySlug?.restaurantID) {
			account = await getRestaurantData(profileBySlug.restaurantID);
		} else {
			const profileById = await Profiles.findOne<TProfile>({ restaurantID: username }).select("restaurantID orderUrlSlug").lean();
			if (profileById?.orderUrlSlug) throw { status: 404, message: "Restaurant URL has changed" };
			account = await getRestaurantData(username);
		}
		if (!account) throw { status: 404, message: `Account with restaurant id: ${username} is not found` };

		const profile = omit(account?.profile, ["__v", "_id"]) as typeof account.profile & { categorySettings?: Array<{ name: string; color: string; hidden: boolean }> };
		if (!profile.categorySettings?.length) profile.categorySettings = (profile.categories ?? []).map((name: string) => ({ name, color: "#64748b", hidden: false }));

		return NextResponse.json({
			...omit(account, ["__v", "_id", "kitchens", "password", "profile", "menus", "tables"]),
			profile,
			menus: account?.menus.map((v: TMenu) => omit(v, ["__v"])),
			tables: account?.tables.map((v: TTable) => omit(v, ["__v", "_id"])),
		});
	} catch (err) {
		console.log(err);
		return CatchNextResponse(err);
	}
}

export const dynamic = "force-dynamic";
