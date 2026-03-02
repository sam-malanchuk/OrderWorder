import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import connectDB from "#utils/database/connect";
import { Accounts, type TAccount } from "#utils/database/models/account";
import { authOptions } from "#utils/helper/authHelper";
import { CatchNextResponse } from "#utils/helper/common";

export async function GET() {
	try {
		await connectDB();
		const session = await getServerSession(authOptions);
		if (!session) throw { status: 401, message: "Authentication Required" };

		const account = await Accounts.findOne<TAccount>({ username: session?.username }).populate("profile").populate("tables").populate("menus").lean();

		if (!account) throw { status: 500, message: "Unable to fetch data" };

		const profile = account.profile
			? {
					...account.profile,
					categorySettings: account.profile.categorySettings?.length
						? account.profile.categorySettings
						: (account.profile.categories ?? []).map((name: string) => ({ name, color: "#64748b", hidden: false })),
					milkOptions: account.profile.milkOptions ?? [],
					addonOptions: account.profile.addonOptions ?? [],
				}
			: undefined;

		return NextResponse.json({
			profile,
			menus: account.menus,
			tables: account.tables,
		});
	} catch (err) {
		console.log(err);
		return CatchNextResponse(err);
	}
}

export const dynamic = "force-dynamic";
