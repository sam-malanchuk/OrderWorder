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
	customer: { fname: string; lname: string };
	state: "active" | "reject" | "cancel" | "complete";
	products: Array<{
		name: string;
		category?: string;
		quantity: number;
		adminApproved: boolean;
		selectedCustomization?: {
			sweetness?: "none" | "lite" | "reg" | "extra";
			ice?: "none" | "lite" | "reg" | "extra";
			milk?: string;
			flavors?: Array<{ name: string; level: "none" | "lite" | "reg" | "extra" }>;
		};
	}>;
};

const Kitchen = () => {
	const session = useSession();
	const router = useRouter();
	const { data, isLoading, mutate } = useSWR<TKitchenOrder[] | { message?: string }>(session.status === "unauthenticated" ? null : "/api/admin/order", fetcher, {
		refreshInterval: 5000,
		revalidateOnFocus: true,
	});
	const { data: adminData } = useSWR<{ profile?: { categorySettings?: Array<{ name: string; color: string }> } }>("/api/admin", fetcher);
	const orders = Array.isArray(data) ? data : [];

	useEffect(() => {
		if (session.status === "unauthenticated" || session.data?.role === "customer") router.replace("/");
	}, [router, session.data?.role, session.status]);

	const { received, inProgress } = useMemo(
		() =>
			orders.reduce(
				(acc, order) => {
					if (order.state !== "active") return acc;
					if (order.products.some((product) => !product.adminApproved)) acc.received.push(order);
					else acc.inProgress.push(order);
					return acc;
				},
				{ received: [] as TKitchenOrder[], inProgress: [] as TKitchenOrder[] },
			),
		[orders],
	);

	const orderAction = async (orderID: string, action: "accept" | "complete" | "reject" | "rejectOnActive") => {
		const req = await fetch("/api/admin/order/action", { method: "POST", body: JSON.stringify({ orderID, action }) });
		if (req.ok) await mutate();
	};

	const getCategoryColor = (category?: string) => adminData?.profile?.categorySettings?.find((item) => item.name === category)?.color ?? "#64748b";
	if (session.status === "loading" || (isLoading && !data)) return <Spinner fullpage label="Loading kitchen screen..." />;

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
									<div className="itemsSummary">
										{order.products.map((product, idx) => (
											<div key={idx} className="itemLine" style={{ borderLeft: `8px solid ${getCategoryColor(product.category)}` }}>
												<p className="itemName">{`${product.name} x${product.quantity}`}</p>
												<div className="modifiers">
													{product.selectedCustomization?.sweetness && <span>{`Sweetness: ${product.selectedCustomization.sweetness}`}</span>}
													{product.selectedCustomization?.ice && <span>{`Ice: ${product.selectedCustomization.ice}`}</span>}
													{product.selectedCustomization?.milk && <span>{`Milk: ${product.selectedCustomization.milk}`}</span>}
													{product.selectedCustomization?.flavors?.map((flavor, flavorIdx) => (
														<span key={flavorIdx}>{`${flavor.name}: ${flavor.level}`}</span>
													))}
												</div>
											</div>
										))}
									</div>
								</div>
								<div style={{ display: "grid", gap: ".25rem" }}>
									<Button size="mini" icon="f00c" iconType="solid" label="Accept" onClick={() => orderAction(order._id, "accept")} />
									<Button size="mini" icon="f00d" iconType="solid" type="secondaryDanger" onClick={() => orderAction(order._id, "reject")} />
								</div>
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
									<div className="itemsSummary">
										{order.products.map((product, idx) => (
											<div key={idx} className="itemLine" style={{ borderLeft: `8px solid ${getCategoryColor(product.category)}` }}>
												<p className="itemName">{`${product.name} x${product.quantity}`}</p>
												<div className="modifiers">
													{product.selectedCustomization?.sweetness && <span>{`Sweetness: ${product.selectedCustomization.sweetness}`}</span>}
													{product.selectedCustomization?.ice && <span>{`Ice: ${product.selectedCustomization.ice}`}</span>}
													{product.selectedCustomization?.milk && <span>{`Milk: ${product.selectedCustomization.milk}`}</span>}
													{product.selectedCustomization?.flavors?.map((flavor, flavorIdx) => (
														<span key={flavorIdx}>{`${flavor.name}: ${flavor.level}`}</span>
													))}
												</div>
											</div>
										))}
									</div>
								</div>
								<div style={{ display: "grid", gap: ".25rem" }}>
									<Button
										size="mini"
										icon="f00c"
										iconType="solid"
										label="Complete"
										type="primarySuccess"
										onClick={() => orderAction(order._id, "complete")}
									/>
									<Button size="mini" icon="f1f8" iconType="solid" type="secondaryDanger" onClick={() => orderAction(order._id, "rejectOnActive")} />
								</div>
							</div>
						))}
					</div>
				</section>
			</div>
		</div>
	);
};

export default Kitchen;
