import { NextResponse } from "next/server";

import connectDB from "#utils/database/connect";
import type { TCustomer } from "#utils/database/models/customer";
import { Orders, type TOrder } from "#utils/database/models/order";
import { CatchNextResponse } from "#utils/helper/common";

const fiveMinutesMs = 5 * 60 * 1000;

type TOrderBoardStatus = "received" | "inProgress" | "ready";

type TOrderWithMeta = TOrder & { updatedAt: string | Date; _id: string };

const getStatus = (order: TOrderWithMeta): TOrderBoardStatus | null => {
	if (order.state === "complete") return "ready";
	if (order.state !== "active") return null;

	if (order.products.some(({ adminApproved }) => !adminApproved)) return "received";
	if (order.products.some(({ adminApproved }) => adminApproved)) return "inProgress";

	return null;
};

export async function GET(_: Request, { params }: { params: Promise<{ restaurant: string }> }) {
	try {
		const { restaurant } = await params;

		if (!restaurant) throw { status: 400, message: "Restaurant username is required" };

		await connectDB();
		const orders = ((await Orders.find({ restaurantID: restaurant }).populate<{ customer: TCustomer }>("customer").lean()) as unknown as TOrderWithMeta[]) ?? [];

		const now = Date.now();
		const boardOrders = orders
			.map((order) => {
				const status = getStatus(order);
				if (!status) return null;

				const updatedAt = new Date(order.updatedAt).getTime();
				if (status === "ready" && now - updatedAt > fiveMinutesMs) return null;

				const customerName = [order.customer?.fname, order.customer?.lname].filter(Boolean).join(" ").trim();
				return {
					id: order._id,
					name: customerName || `Table ${order.table}`,
					table: order.table,
					status,
					updatedAt: order.updatedAt,
				};
			})
			.filter(Boolean)
			.sort((a, b) => new Date(b?.updatedAt ?? 0).getTime() - new Date(a?.updatedAt ?? 0).getTime());

		return NextResponse.json(boardOrders);
	} catch (err) {
		console.log(err);
		return CatchNextResponse(err);
	}
}

export const dynamic = "force-dynamic";
