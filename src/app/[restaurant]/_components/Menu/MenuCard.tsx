import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import { useInView } from "react-intersection-observer";

import QuantityButton from "#components/base/QuantityButton";
import type { TMenu } from "#utils/database/models/menu";

import "./menuCard.scss";

const MenuCard = (props: TMenuCardProps) => {
	const { className, show, restrictOrder, item, quantity } = props;
	const [cardRef, inView] = useInView({ threshold: 0 });
	const [isFlashing, setFlashing] = useState(false);
	const flashTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

	useEffect(() => {
		const handleHighlight = ((e: CustomEvent<{ id: string }>) => {
			if (e.detail.id === String(item._id)) {
				if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);

				setFlashing(false);
				flashTimeoutRef.current = setTimeout(() => {
					setFlashing(true);
					flashTimeoutRef.current = setTimeout(() => setFlashing(false), 1500);
				}, 10);
			}
		}) as EventListener;

		window.addEventListener("highlight-item", handleHighlight);
		return () => {
			window.removeEventListener("highlight-item", handleHighlight);
			if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
		};
	}, [item._id]);

	const classList = clsx(
		"menuCard ",
		className,
		isFlashing && "flash",
		restrictOrder && "restrictOrder",
		!item.image && "withoutImage",
		window.matchMedia("(hover: hover)").matches && "hoverSupported",
	);

	if (!show) return null;

	return (
		<div id={`menu-item-${item._id}`} className={classList + (!inView ? "blank" : "")} ref={cardRef}>
			{inView && (
				<>
					{item.image && (
						<div className="picture">
							<span style={{ background: `url(${item.image})` }} />
						</div>
					)}
					<div className="options">
						<div className="title">
							<span>{item.name}</span>
						</div>
						{!item.image && <div className="description">{item.description}</div>}
						<div className="footer">
							{!item.image && item.price > 0 && <div className="priceNoImage rupee">{item.price}</div>}
							<QuantityButton
								className="addToCart"
								quantity={quantity}
								filled
								increaseQuantity={() => props.increaseQuantity(item)}
								decreaseQuantity={() => props.decreaseQuantity(item)}
							/>
						</div>
					</div>
					{item.image && item.price > 0 && (
						<div className="price rupee">
							<div className="ribbonTop" />
							<div className="ribbonBottom" />
							<span>{item.price}</span>
						</div>
					)}
				</>
			)}
		</div>
	);
};

export default MenuCard;

type TMenuCardProps = {
	className?: string;
	show?: boolean;
	restrictOrder?: boolean;
	item: TMenuCustom;
	quantity: number;
	increaseQuantity: (item: TMenuCustom) => void;
	decreaseQuantity: (item: TMenuCustom) => void;
};

type TMenuCustom = TMenu & { quantity: number };
