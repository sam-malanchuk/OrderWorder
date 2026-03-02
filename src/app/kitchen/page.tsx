"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useMemo } from "react";
import useSWR from "swr";
import { Button, Spinner } from "xtreme-ui";

import { fetcher } from "#utils/helper/common";

import "./kitchen.scss";

type TKitchenOrder = {
	_id: string;
	table: string;
	customer: {
		fname: string;
		lname: string;
	};
	state: "active" | "reject" | "cancel" | "complete";
	products: Array<{ adminApproved: boolean }>;
};

const Kitchen = () => {
	const session = useSession();
	const router = useRouter();
	const { data, isLoading, mutate } = useSWR<TKitchenOrder[] | { message?: string }>(session.status === "authenticated" ? "/api/admin/order" : null, fetcher, {
		refreshInterval: 5000,
	});
	const orders = Array.isArray(data) ? data : [];

	useEffect(() => {
		if (session.status === "unauthenticated") router.replace("/");
		if (session.data?.role === "customer") router.replace("/");
	}, [router, session.data?.role, session.status]);

	const { received, inProgress } = useMemo(() => {
		return orders.reduce(
			(acc, order) => {
				if (order.state !== "active") return acc;
				if (order.products.some((product) => !product.adminApproved)) acc.received.push(order);
				else acc.inProgress.push(order);
				return acc;
			},
			{ received: [] as TKitchenOrder[], inProgress: [] as TKitchenOrder[] },
		);
	}, [orders]);

	const orderAction = async (orderID: string, action: "accept" | "complete") => {
		const req = await fetch("/api/admin/order/action", { method: "POST", body: JSON.stringify({ orderID, action }) });
		if (req.ok) await mutate();
	};

	if (session.status === "loading" || isLoading) return <Spinner fullpage label="Loading kitchen screen..." />;

	return (
		<div className="kitchenBoard">
			<header>
				<h1>Kitchen Screen</h1>
				<p>Manage all incoming and active orders in one place.</p>
			</header>

			<div className="columns">
				<section>
					<div className="title">Received ({received.length})</div>
					<div className="list">
						{received.map((order) => (
							<div className="orderCard" key={order._id.toString()}>
								<div>
									<p className="name">{`${order?.customer?.fname} ${order?.customer?.lname}`}</p>
									<p className="table">Table {order.table}</p>
								</div>
								<Button size="mini" icon="f00c" iconType="solid" label="Accept" onClick={() => orderAction(order._id, "accept")} />
							</div>
						))}
					</div>
				</section>

				<section>
					<div className="title">In Progress ({inProgress.length})</div>
					<div className="list">
						{inProgress.map((order) => (
							<div className="orderCard" key={order._id.toString()}>
								<div>
									<p className="name">{`${order?.customer?.fname} ${order?.customer?.lname}`}</p>
									<p className="table">Table {order.table}</p>
								</div>
								<Button
									size="mini"
									icon="f00c"
									iconType="solid"
									label="Complete"
									type="primarySuccess"
									onClick={() => orderAction(order._id, "complete")}
								/>
							</div>
						))}
					</div>
				</section>
			</div>
		</div>
	);
};

export default Kitchen;
