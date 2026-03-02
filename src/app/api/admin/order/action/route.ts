import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import connectDB from "#utils/database/connect";
import { Orders, type TOrder, type TProduct } from "#utils/database/models/order";
import { Profiles, type TProfile } from "#utils/database/models/profile";
import { authOptions } from "#utils/helper/authHelper";
import { CatchNextResponse } from "#utils/helper/common";

const actions = ["accept", "reject", "rejectOnActive", "complete"];
const maxPrintAttempts = 3;

type TPrintPayload = {
	customer: string;
	item: string;
	qty: number;
	mods: string[];
};

const formatProductMods = (product: TProduct) => {
	const selected = product.selectedCustomization;
	const mods: string[] = [];
	if (selected?.sweetness) mods.push(`Sweetness: ${selected.sweetness}`);
	if (selected?.ice) mods.push(`Ice: ${selected.ice}`);
	if (selected?.temperature) mods.push(`Temp: ${selected.temperature}`);
	if (selected?.milk) mods.push(`Milk: ${selected.milk}`);
	selected?.flavors?.forEach((flavor) => {
		mods.push(`${flavor.name}: ${flavor.level}`);
	});
	return mods;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const postLabelWithRetry = async (printUrl: string, payload: TPrintPayload) => {
	let lastError = "Unknown print server error";

	for (let attempt = 1; attempt <= maxPrintAttempts; attempt++) {
		try {
			const response = await fetch(printUrl, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});
			const data = await response.json().catch(() => ({}));

			if (response.ok && data?.ok === true) return;
			lastError = data?.error || `Printer request failed with status ${response.status}`;
		} catch (error) {
			lastError = error instanceof Error ? error.message : "Printer request failed";
		}

		if (attempt < maxPrintAttempts) await sleep(300 * attempt);
	}

	throw new Error(lastError);
};

const printOrderLabels = async (order: { customer?: { fname?: string; lname?: string }; table: string; products: TProduct[] }, sessionUsername?: string | null) => {
	if (!sessionUsername) return;

	const profile = await Profiles.findOne<TProfile>({ restaurantID: sessionUsername }).select("printUrl").lean();
	const printUrl = profile?.printUrl?.trim();
	if (!printUrl) return;

	const customerName = [order.customer?.fname, order.customer?.lname].filter(Boolean).join(" ").trim() || `Table ${order.table}`;

	for (const item of order.products) {
		const product = item as TProduct & { name?: string };
		const itemName = product?.name;
		if (!itemName) continue;

		const labelPayload: TPrintPayload = {
			customer: customerName,
			item: itemName,
			qty: 1,
			mods: formatProductMods(product),
		};

		const quantity = Math.max(1, Number(product.quantity) || 1);
		for (let i = 0; i < quantity; i++) {
			await postLabelWithRetry(printUrl, labelPayload);
		}
	}
};

export async function POST(req: Request) {
	try {
		const session = await getServerSession(authOptions);
		const body = await req.json();

		if (!session) throw { status: 401, message: "Authentication Required" };
		if (!body?.orderID) throw { status: 400, message: "Order id is required to perform an action" };
		if (!actions.includes(body?.action)) throw { status: 400, message: "Invalid action provided" };

		await connectDB();

		const order = await Orders.findById<TOrder>(body?.orderID).populate("customer");

		if (!order) throw { status: 400, message: `Order with id: ${body?.orderID} not found` };

		if (body.action === "accept")
			order.products.forEach((product: TProduct) => {
				product.adminApproved = true;
			});

		if (body.action === "reject") {
			if (!order.products.some(({ adminApproved }: TProduct) => adminApproved)) order.state = "reject";
			else order.products = order.products.filter(({ adminApproved }: TProduct) => adminApproved);
		}

		if (body.action === "rejectOnActive") order.state = "reject";

		if (body.action === "complete") {
			await printOrderLabels(order, session?.username);
			order.state = "complete";
		}

		await order.save();

		return NextResponse.json({ status: 200, message: "Order placed successfully" });
	} catch (err) {
		console.log(err);
		return CatchNextResponse(err);
	}
}

export const dynamic = "force-dynamic";
