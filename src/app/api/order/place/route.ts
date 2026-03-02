import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import connectDB from "#utils/database/connect";
import { Menus, type TMenu, type TModifierLevel, type TTemperatureOption } from "#utils/database/models/menu";
import { Orders, type TOrder, type TProduct } from "#utils/database/models/order";
import { authOptions } from "#utils/helper/authHelper";
import { CatchNextResponse } from "#utils/helper/common";

const levels: TModifierLevel[] = ["none", "lite", "reg", "extra"];
const temperatures: TTemperatureOption[] = ["hot", "cold"];

export async function POST(req: Request) {
	try {
		const session = await getServerSession(authOptions);
		const body = await req.json();

		if (!session) throw { status: 401, message: "Authentication Required" };
		if (!body?.products.length) throw { status: 400, message: "Can't place order on empty cart" };

		await connectDB();
		const products: TProduct[] = await Promise.all(
			body?.products?.map(async (product: TOrderPlaceProduct) => {
				const menuItem = await Menus.findById<TMenu>(product?._id).lean();

				if (!menuItem) throw { status: 404, message: "Ordered product(s) not found." };

				const config = menuItem.customization;
				const selected = product?.selectedCustomization ?? {};
				const selectedCustomization = {
					sweetness: config?.sweetness?.enabled
						? levels.includes((selected?.sweetness ?? config?.sweetness?.defaultLevel ?? "reg") as TModifierLevel)
							? (selected?.sweetness ?? config?.sweetness?.defaultLevel ?? "reg")
							: "reg"
						: undefined,
					ice: config?.ice?.enabled
						? levels.includes((selected?.ice ?? config?.ice?.defaultLevel ?? "reg") as TModifierLevel)
							? (selected?.ice ?? config?.ice?.defaultLevel ?? "reg")
							: "reg"
						: undefined,
					temperature: config?.temperature?.enabled
						? temperatures.includes((selected?.temperature ?? config?.temperature?.defaultValue ?? "cold") as TTemperatureOption)
							? (selected?.temperature ?? config?.temperature?.defaultValue ?? "cold")
							: "cold"
						: undefined,
					milk: selected?.milk && config?.milkOptions?.includes(selected.milk) ? selected.milk : config?.defaultMilk,
					flavors:
						selected?.flavors
							?.filter((flavor) => config?.flavorOptions?.includes(flavor.name))
							.map((flavor) => ({
								name: flavor.name,
								level: levels.includes(flavor.level) ? flavor.level : "reg",
							})) ?? [],
				};

				return {
					product: product?._id,
					quantity: product?.quantity,
					selectedCustomization,
					price: menuItem?.price,
					tax: ((menuItem?.price * menuItem?.taxPercent) / 100).toFixed(2),
				};
			}),
		);

		const restaurantID = session?.restaurant?.username;
		const table = session?.restaurant?.table;
		const customer = session?.customer?._id;
		const order = await Orders.findOne<TOrder>({ restaurantID, customer, state: "active" });

		if (order) {
			order.products = [...order.products, ...products];
			await order.save();

			return NextResponse.json({ status: 200, message: "Additional items ordered successfully" });
		}

		const newOrder = new Orders({ restaurantID, table, customer, products: products });
		await newOrder.save();

		return NextResponse.json({ status: 200, message: "Order placed successfully" });
	} catch (err) {
		console.log(err);
		return CatchNextResponse(err);
	}
}

type TOrderPlaceProduct = {
	_id: string;
	quantity: number;
	selectedCustomization?: {
		sweetness?: TModifierLevel;
		ice?: TModifierLevel;
		temperature?: TTemperatureOption;
		milk?: string;
		flavors?: Array<{ name: string; level: TModifierLevel }>;
	};
};

export const dynamic = "force-dynamic";
