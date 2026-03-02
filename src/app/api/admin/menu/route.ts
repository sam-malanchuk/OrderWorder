import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import connectDB from "#utils/database/connect";
import { Menus, type TFoodType, type TMenu, type TVeg } from "#utils/database/models/menu";
import { authOptions } from "#utils/helper/authHelper";
import { CatchNextResponse } from "#utils/helper/common";

const vegOptions: TVeg[] = ["veg", "non-veg", "contains-egg"];
const foodTypeOptions: TFoodType[] = ["spicy", "extra-spicy", "sweet"];
const levelOptions = ["none", "lite", "reg", "extra"] as const;

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
		const customization = body?.customization;
		const defaultFlavors =
			customization?.defaultFlavors?.map((flavor: { name: string; level: string }) => ({
				name: flavor?.name?.trim(),
				level: levelOptions.includes(flavor?.level as (typeof levelOptions)[number]) ? flavor.level : "reg",
			})) ?? [];

		if (!name) throw { status: 400, message: "Menu item name is required" };
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
			existing.description = description || "";
			existing.category = category;
			existing.price = price;
			existing.taxPercent = taxPercent;
			existing.veg = veg;
			existing.foodType = foodType || undefined;
			existing.image = image || undefined;
			if (hidden !== undefined) existing.hidden = !!hidden;
			existing.customization = {
				enabled: !!customization?.enabled,
				sweetness: {
					enabled: !!customization?.sweetness?.enabled,
					defaultLevel: levelOptions.includes(customization?.sweetness?.defaultLevel) ? customization?.sweetness?.defaultLevel : "reg",
				},
				ice: {
					enabled: !!customization?.ice?.enabled,
					defaultLevel: levelOptions.includes(customization?.ice?.defaultLevel) ? customization?.ice?.defaultLevel : "reg",
				},
				milkOptions: customization?.milkOptions?.map((v: string) => v.trim()).filter(Boolean) ?? [],
				defaultMilk: customization?.defaultMilk?.trim() ?? "",
				flavorOptions: customization?.flavorOptions?.map((v: string) => v.trim()).filter(Boolean) ?? [],
				defaultFlavors: defaultFlavors.filter((v: { name: string }) => v.name),
			};

			await existing.save();
			return NextResponse.json({ status: 200, message: "Menu item updated successfully" });
		}

		const item = new Menus({
			name,
			description: description || "",
			category,
			price,
			taxPercent,
			veg,
			foodType: foodType || undefined,
			image: image || undefined,
			hidden: hidden ?? false,
			customization: {
				enabled: !!customization?.enabled,
				sweetness: {
					enabled: !!customization?.sweetness?.enabled,
					defaultLevel: levelOptions.includes(customization?.sweetness?.defaultLevel) ? customization?.sweetness?.defaultLevel : "reg",
				},
				ice: {
					enabled: !!customization?.ice?.enabled,
					defaultLevel: levelOptions.includes(customization?.ice?.defaultLevel) ? customization?.ice?.defaultLevel : "reg",
				},
				milkOptions: customization?.milkOptions?.map((v: string) => v.trim()).filter(Boolean) ?? [],
				defaultMilk: customization?.defaultMilk?.trim() ?? "",
				flavorOptions: customization?.flavorOptions?.map((v: string) => v.trim()).filter(Boolean) ?? [],
				defaultFlavors: defaultFlavors.filter((v: { name: string }) => v.name),
			},
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

export async function DELETE(req: Request) {
	try {
		await connectDB();
		const session = await getServerSession(authOptions);
		const body = await req.json();

		if (!session) throw { status: 401, message: "Authentication Required" };
		if (!body?.itemId) throw { status: 400, message: "Menu item id is required" };

		const restaurantID = session?.username;
		const existing = await Menus.findById<TMenu>(body.itemId);
		if (!existing) throw { status: 404, message: "Menu item not found" };
		if (existing.restaurantID !== restaurantID) throw { status: 403, message: "Unauthorized menu delete" };

		await Menus.deleteOne({ _id: body.itemId });
		return NextResponse.json({ status: 200, message: "Menu item deleted successfully" });
	} catch (err) {
		console.log(err);
		return CatchNextResponse(err);
	}
}
