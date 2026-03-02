"use client";

import { use, useMemo } from "react";
import useSWR from "swr";

import { fetcher } from "#utils/helper/common";

import "./ready.scss";

type TReadyBoardOrder = {
	id: string;
	name: string;
	table: string;
	status: "received" | "inProgress" | "ready";
	updatedAt: string;
};

const OrderReadyPage = ({ params }: { params: Promise<{ restaurant: string }> }) => {
	const { restaurant } = use(params);
	const { data: orders = [] } = useSWR<TReadyBoardOrder[]>(`/api/order-ready/${restaurant}`, fetcher, { refreshInterval: 5000 });

	const columns = useMemo(
		() => ({
			received: orders.filter((order) => order.status === "received"),
			inProgress: orders.filter((order) => order.status === "inProgress"),
			ready: orders.filter((order) => order.status === "ready"),
		}),
		[orders],
	);

	return (
		<div className="orderReadyBoard">
			<header>
				<h1>Order Ready Screen</h1>
			</header>
			<main>
				<BoardColumn title="Received" items={columns.received} />
				<BoardColumn title="In Progress" items={columns.inProgress} />
				<BoardColumn title="Order Ready" items={columns.ready} />
			</main>
		</div>
	);
};

const BoardColumn = ({ title, items }: { title: string; items: TReadyBoardOrder[] }) => {
	return (
		<section className="boardColumn">
			<div className="columnTitle">
				{title} <span>{items.length}</span>
			</div>
			<div className="columnList">
				{items.map((order) => (
					<div className="orderName" key={order.id.toString()}>
						{order.name}
					</div>
				))}
			</div>
		</section>
	);
};

export default OrderReadyPage;
