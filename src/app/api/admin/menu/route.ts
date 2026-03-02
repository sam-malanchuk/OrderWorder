import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import connectDB from "#utils/database/connect";
import { Menus, type TFoodType, type TMenu, type TVeg } from "#utils/database/models/menu";
import { authOptions } from "#utils/helper/authHelper";
import { CatchNextResponse } from "#utils/helper/common";

const vegOptions: TVeg[] = ["veg", "non-veg", "contains-egg"];
const foodTypeOptions: TFoodType[] = ["spicy", "extra-spicy", "sweet"];

export async function POST(req: Request) {
	try {
		await connectDB();
		const session = await getServerSession(authOptions);
		const body = await req.json();

		if (!session) throw { status: 401, message: "Authentication Required" };

		const restaurantID = session?.username;
		if (!restaurantID) throw { status: 401, message: "Restaurant context missing" };

		const name = body?.name?.trim();
		const description = body?.description?.trim();
		const category = body?.category?.trim();
		const image = body?.image?.trim();
		const veg = body?.veg?.trim();
		const foodType = body?.foodType?.trim();
		const hidden = body?.hidden;
		const price = Number(body?.price);
		const taxPercent = Number(body?.taxPercent);

		if (!name) throw { status: 400, message: "Menu item name is required" };
		if (!description) throw { status: 400, message: "Description is required" };
		if (!category) throw { status: 400, message: "Category is required" };
		if (!Number.isFinite(price)) throw { status: 400, message: "Valid price is required" };
		if (!Number.isFinite(taxPercent)) throw { status: 400, message: "Valid tax percent is required" };
		if (!vegOptions.includes(veg)) throw { status: 400, message: "Valid veg type is required" };
		if (foodType && !foodTypeOptions.includes(foodType)) throw { status: 400, message: "Invalid food type" };

		if (body?.itemId) {
			const existing = await Menus.findById<TMenu>(body.itemId);
			if (!existing) throw { status: 404, message: "Menu item not found" };
			if (existing.restaurantID !== restaurantID) throw { status: 403, message: "Unauthorized menu edit" };

			existing.name = name;
			existing.description = description;
			existing.category = category;
			existing.price = price;
			existing.taxPercent = taxPercent;
			existing.veg = veg;
			existing.foodType = foodType || undefined;
			existing.image = image || undefined;
			if (hidden !== undefined) existing.hidden = !!hidden;

			await existing.save();
			return NextResponse.json({ status: 200, message: "Menu item updated successfully" });
		}

		const item = new Menus({
			name,
			description,
			category,
			price,
			taxPercent,
			veg,
			foodType: foodType || undefined,
			image: image || undefined,
			hidden: hidden ?? false,
			restaurantID,
		});
		await item.save();

		return NextResponse.json({ status: 200, message: "Menu item created successfully" });
	} catch (err) {
		console.log(err);
		return CatchNextResponse(err);
	}
}

export const dynamic = "force-dynamic";
