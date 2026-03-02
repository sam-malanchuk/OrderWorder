import clsx from "clsx";
import { useInView } from "react-intersection-observer";

import QuantityButton from "#components/base/QuantityButton";
import type { TMenu } from "#utils/database/models/menu";

import "./itemCard.scss";

const ItemCard = (props: TItemCardProps) => {
	const { className, item, staticCard, increaseQuantity, decreaseQuantity } = props;
	const [cardRef, inView] = useInView({ triggerOnce: true, threshold: 0 });
	const getTotalPrice = () => {
		return item.quantity ? item.price * item.quantity : item.price;
	};

	const classList = clsx("itemCard", className, staticCard && "staticCard");

	return (
		<div className={classList} ref={cardRef}>
			{inView && (
				<>
					{item.image && (
						<div className="picture">
							<span style={{ background: `url(${item.image})` }} />
						</div>
					)}
					<div className="options">
						<p className="title">{item.name}</p>
						{item.selectedCustomization && (
							<p className="subtitle">
								{item.selectedCustomization.sweetness ? `Sweetness: ${item.selectedCustomization.sweetness}` : ""}
								{item.selectedCustomization.ice ? ` • Ice: ${item.selectedCustomization.ice}` : ""}
								{item.selectedCustomization.milk ? ` • Milk: ${item.selectedCustomization.milk}` : ""}
								{item.selectedCustomization.flavors?.length
									? ` • Flavors: ${item.selectedCustomization.flavors.map((f) => `${f.name} (${f.level})`).join(", ")}`
									: ""}
							</p>
						)}
						<div className="footer">
							<div className="price">
								{!staticCard && getTotalPrice() > 0 && <p className="rupee">{getTotalPrice()}</p>}
								{staticCard && item.price > 0 && (
									<p className="rupee">
										{item.price} <span>✕</span> {item.quantity}
									</p>
								)}
							</div>
							{staticCard ? (
								getTotalPrice() > 0 && <div className="totalAmount rupee">{getTotalPrice()}</div>
							) : (
								<QuantityButton
									className="addToCart"
									quantity={item.quantity}
									increaseQuantity={() => increaseQuantity?.(item)}
									decreaseQuantity={() => decreaseQuantity?.(item)}
								/>
							)}
						</div>
					</div>
				</>
			)}
		</div>
	);
};

export default ItemCard;

type TItemCardProps = {
	className?: string;
	item: TMenuCustom;
	staticCard?: boolean;
	increaseQuantity?: (item: TMenuCustom) => void;
	decreaseQuantity?: (item: TMenuCustom) => void;
};

type TMenuCustom = TMenu & {
	quantity: number;
	selectedCustomization?: {
		sweetness?: "none" | "lite" | "reg" | "extra";
		ice?: "none" | "lite" | "reg" | "extra";
		milk?: string;
		flavors?: Array<{ name: string; level: "none" | "lite" | "reg" | "extra" }>;
	};
};
