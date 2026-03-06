import { signOut, useSession } from "next-auth/react";
import { type SyntheticEvent, type UIEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActionCard, Button, Icon, Spinner } from "xtreme-ui";

import SearchButton from "#components/base/SearchButton";
import SideSheet from "#components/base/SideSheet";
import { useOrder, useRestaurant } from "#components/context/useContext";
import Modal from "#components/layout/Modal";
import type { TMenu, TModifierLevel, TTemperatureOption } from "#utils/database/models/menu";
import { useQueryParams } from "#utils/hooks/useQueryParams";

import CartPage from "./CartPage";
import MenuCard from "./MenuCard";
import UserLogin from "./UserLogin";
import "./orderPage.scss";

const OrderPage = () => {
	const session = useSession();
	const { loading, loginOpen, setLoginOpen } = useOrder();
	const { restaurant } = useRestaurant();

	const menus = restaurant?.menus as Array<TMenuCustom>;
	const params = useQueryParams();
	const table = params.get("table") ?? "1";
	const searchParam = params.get("search")?.trim() ?? "";
	const categoryParam = params.get("category")?.trim();
	const category = useMemo(() => (categoryParam ? categoryParam.split(",") : []), [categoryParam]);

	const order = useRef<HTMLDivElement>(null);
	const categories = useRef<HTMLDivElement>(null);
	const [sideSheetOpen, setSideSheetOpen] = useState(false);
	const [topHeading, setTopHeading] = useState(["Menu", "Category"]);
	const [orderHeading, setOrderHeading] = useState(["Explore", "Menu"]);
	const [sideSheetHeading, setSideSheetHeading] = useState(["Your", "Order"]);

	const [searchActive, setSearchActive] = useState(false);
	const [searchValue, setSearchValue] = useState("");
	const [floatHeader, setFloatHeader] = useState(false);
	const [leftCategoryScroll, setLeftCategoryScroll] = useState(false);
	const [rightCategoryScroll, setRightCategoryScroll] = useState(true);
	const [customizationOpen, setCustomizationOpen] = useState(false);
	const [customizationItem, setCustomizationItem] = useState<TMenuCustom>();
	const [customizationDraft, setCustomizationDraft] = useState<TCustomizationDraft>({ flavors: [] });
	const [queuedProduct, setQueuedProduct] = useState<TMenuCustom>();

	const [filteredProducts, setFilteredProducts] = useState<Array<TMenuCustom>>(menus);
	const [selectedProducts, setSelectedProducts] = useState<Array<TMenuCustom>>([]);
	const [hasImageItems, setHasImageItems] = useState(false);
	const [hasNonImageItems, setHasNonImageItems] = useState(false);

	const showOrderButton = restaurant?.tables?.some(({ username }) => username === table);
	const eligibleToOrder = session.data?.role === "customer" && showOrderButton;

	const onMenuScroll = (event: UIEvent<HTMLDivElement>) => {
		const scrollTop = (event.target as HTMLDivElement).scrollTop;
		if (scrollTop > 30) {
			setFloatHeader(true);
			setTopHeading(["Menu", "Category"]);
			if (order?.current && scrollTop >= order?.current?.offsetTop - 15) setTopHeading(orderHeading);
			return;
		}
		return setFloatHeader(false);
	};
	const onCategoryScroll = (event: SyntheticEvent) => {
		const target = event.target as HTMLElement;

		if (target.scrollLeft > 50) setLeftCategoryScroll(true);
		else setLeftCategoryScroll(false);

		if (Math.round(target.scrollWidth - target.scrollLeft) - 50 > target.clientWidth) setRightCategoryScroll(true);
		else setRightCategoryScroll(false);
	};
	const categoryScrollLeft = () => {
		if (categories.current) categories.current.scrollLeft -= 400;
	};
	const categoryScrollRight = () => {
		if (categories.current) categories.current.scrollLeft += 400;
	};
	const onCategoryClick = (categoryName: string) => {
		let newCategory = [];
		if (category.includes(categoryName)) newCategory = category.filter((item) => item !== categoryName);
		else newCategory = [...category, categoryName];

		params.set({ category: newCategory.join(",") });
	};
	const onLoginClick = () => {
		setLoginOpen(true);
	};
	const addItemToSelection = useCallback(
		(product: TMenuCustom, selectedCustomization?: TCustomizationDraft) => {
			const flavorKey = selectedCustomization?.flavors?.map((f) => `${f.name}:${f.level}`).join("|") ?? "";
			const cartKey = `${product._id.toString()}-${selectedCustomization?.sweetness ?? ""}-${selectedCustomization?.ice ?? ""}-${selectedCustomization?.temperature ?? ""}-${selectedCustomization?.milk ?? ""}-${flavorKey}`;
			const selection = [...selectedProducts];
			if (selectedProducts.some((item) => item.cartKey === cartKey)) {
				selection.forEach((item) => {
					if (item.cartKey === cartKey) item.quantity++;
				});
			} else {
				selection.push({ ...product, quantity: 1, selectedCustomization, cartKey } as unknown as TMenuCustom);
			}
			setSelectedProducts(selection);
		},
		[selectedProducts],
	);
	const openProductCustomization = useCallback(
		(product: TMenuCustom) => {
			if (!product.customization?.enabled) return addItemToSelection(product);

			const hiddenAddons = new Set((restaurant?.profile?.addonOptions ?? []).filter((option) => option.hidden).map((option) => option.name));
			const availableDefaultFlavors = (product.customization?.defaultFlavors ?? []).filter((flavor) => !hiddenAddons.has(flavor.name));

			setCustomizationItem(product);
			setCustomizationDraft({
				sweetness: product.customization?.sweetness?.enabled ? product.customization.sweetness.defaultLevel : undefined,
				ice: product.customization?.ice?.enabled ? product.customization.ice.defaultLevel : undefined,
				temperature: product.customization?.temperature?.enabled ? product.customization.temperature.defaultValue : undefined,
				milk: product.customization?.defaultMilk,
				flavors: availableDefaultFlavors,
			});
			setCustomizationOpen(true);
		},
		[addItemToSelection, restaurant?.profile?.addonOptions],
	);
	const increaseProductQuantity = (product: TMenuCustom) => {
		if (!showOrderButton) return;
		if (session.data?.role !== "customer") {
			setQueuedProduct(product);
			setLoginOpen(true);
			return;
		}

		openProductCustomization(product);
	};
	const decreaseProductQuantity = (product: TMenuCustom) => {
		let selection = [...selectedProducts];
		const targetCartKey = product.cartKey ?? selection.find((item) => item._id === product._id)?.cartKey;
		if (!targetCartKey) return;
		selection.forEach((item) => {
			if (targetCartKey === item.cartKey) {
				item.quantity--;
				if (item.quantity === 0) {
					const filter = selection.filter((tempItem) => tempItem.cartKey !== targetCartKey);
					selection = [...filter];
				}
			}
		});
		setSelectedProducts(selection);
	};

	useEffect(() => {
		if (!params.get("table")) params.set({ table: "1" });
	}, [params]);

	useEffect(() => {
		const search = searchParam.toLowerCase();

		setFilteredProducts(
			menus?.filter?.(
				({ name, description, category: cat }) =>
					(search ? name?.toLowerCase().includes(search) || description?.toLowerCase().includes(search) || cat?.toLowerCase().includes(search) : true) &&
					(category.length ? category.includes(cat) : true),
			),
		);
	}, [category, menus, searchParam]);

	useEffect(() => {
		params.set({
			category: category
				.filter((e) =>
					restaurant?.profile.categorySettings
						?.filter((c) => !c.hidden)
						.map((c) => c.name)
						.includes(e),
				)
				.join(","),
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [category, restaurant, params.set]);
	useEffect(() => {
		params.set({ search: searchValue });
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [searchValue, params.set]);

	useEffect(() => {
		setHasImageItems(filteredProducts?.some((product) => !!product.image) ?? false);
		setHasNonImageItems(filteredProducts?.some((product) => !product.image) ?? false);
	}, [filteredProducts]);

	useEffect(() => {
		if (session.data?.role === "customer") setOrderHeading(["Choose", "Order"]);
		else setOrderHeading(["Explore", "Menu"]);
	}, [session]);

	useEffect(() => {
		if (session.data?.role !== "customer" || !queuedProduct) return;
		openProductCustomization(queuedProduct);
		setQueuedProduct(undefined);
		setLoginOpen(false);
	}, [openProductCustomization, queuedProduct, session.data?.role, setLoginOpen]);

	useEffect(() => {
		if (session.status === "authenticated" && session.data?.restaurant?.username !== restaurant?.username) signOut();
	}, [restaurant?.username, session.data?.restaurant?.username, session.status]);

	const levelOptions: TModifierLevel[] = ["none", "lite", "reg", "extra"];
	const levelLabel: Record<TModifierLevel, string> = { none: "None", lite: "Lite", reg: "Reg", extra: "Extra" };
	const temperatureOptions: TTemperatureOption[] = ["hot", "cold"];
	const onCustomizationConfirm = () => {
		if (!customizationItem) return;
		const hiddenAddons = new Set((restaurant?.profile?.addonOptions ?? []).filter((option) => option.hidden).map((option) => option.name));
		const finalDraft = {
			...customizationDraft,
			flavors: (customizationDraft.flavors ?? []).filter((flavor) => !hiddenAddons.has(flavor.name)),
		};
		addItemToSelection(customizationItem, finalDraft);
		setCustomizationOpen(false);
		setCustomizationItem(undefined);
	};

	return (
		<div className="orderPage">
			<div className="mainContainer" onScroll={onMenuScroll}>
				<div className={`mainHeader ${searchActive ? "searchActive" : ""} ${floatHeader ? "floatHeader" : ""}`}>
					<h1>
						{topHeading[0]} <span>{topHeading[1]}</span>
					</h1>
					<div className="options">
						<SearchButton setSearchActive={setSearchActive} placeholder="Search menu" value={searchValue} setValue={setSearchValue} />
						{!showOrderButton && <Button className="loginButton" label="Scan" onClick={onLoginClick} />}
						{eligibleToOrder && (
							<Button
								icon="e43b"
								iconType="solid"
								label={`${selectedProducts?.length > 0 ? selectedProducts?.length : ""}`}
								onClick={() => setSideSheetOpen(true)}
							/>
						)}
						{session.data?.role === "admin" && (
							<Button className="dashboardButton" label="Dashboard" icon="e09f" iconType="solid" onClick={() => params.router.push("/dashboard")} />
						)}
						{session.data?.role === "kitchen" && (
							<Button className="kitchenButton" label="Kitchen" icon="e09f" iconType="solid" onClick={() => params.router.push("/kitchen")} />
						)}
					</div>
				</div>
				{restaurant && (
					<div className="category">
						<div className="itemCategories" ref={categories} onScroll={onCategoryScroll}>
							{restaurant?.profile?.categorySettings
								?.filter((c) => !c.hidden)
								.map((setting, i) => (
									<ActionCard
										key={i}
										className={`menuCategory ${category.includes(setting.name) ? "active" : ""}`}
										onClick={() => onCategoryClick(setting.name)}>
										<span className="title">{setting.name}</span>
									</ActionCard>
								))}
							<div className="space" />
							<div className={`scrollLeft ${leftCategoryScroll ? "show" : ""}`} onClick={categoryScrollLeft}>
								<Icon code="f053" type="solid" />
							</div>
							<div className={`scrollRight ${rightCategoryScroll ? "show" : ""}`} onClick={categoryScrollRight}>
								<Icon code="f054" type="solid" />
							</div>
						</div>
					</div>
				)}
				{!restaurant ? (
					<Spinner label="Loading Menu..." fullpage />
				) : (
					<div className="order" ref={order}>
						<div className="header">
							<h1>
								{orderHeading[0]} <span>{orderHeading[1]}</span>
							</h1>
						</div>
						{hasImageItems && (
							<div className={`itemContainer ${!showOrderButton ? "restrictOrder " : ""}`}>
								<div>
									{filteredProducts?.map(
										(item, key) =>
											!item.hidden && (
												<MenuCard
													key={key}
													item={item}
													restrictOrder={!showOrderButton}
													increaseQuantity={increaseProductQuantity}
													decreaseQuantity={decreaseProductQuantity}
													show={!!item.image}
													quantity={
														(selectedProducts.some((obj) => obj._id === item._id) &&
															selectedProducts?.find((obj) => obj._id === item._id)?.quantity) ||
														0
													}
												/>
											),
									)}
								</div>
							</div>
						)}
						{hasImageItems && hasNonImageItems && <hr />}
						{hasNonImageItems && (
							<div className={`itemContainer withoutImage ${!showOrderButton ? "restrictOrder " : ""}`}>
								<div>
									{filteredProducts?.map((item, key) => (
										<MenuCard
											key={key}
											item={item}
											restrictOrder={!showOrderButton}
											increaseQuantity={increaseProductQuantity}
											decreaseQuantity={decreaseProductQuantity}
											show={!!item.image}
											quantity={
												(selectedProducts.some((obj) => obj._id === item._id) &&
													selectedProducts?.find((obj) => obj._id === item._id)?.quantity) ||
												0
											}
										/>
									))}
								</div>
							</div>
						)}
					</div>
				)}
			</div>
			<SideSheet title={sideSheetHeading} open={sideSheetOpen} setOpen={setSideSheetOpen}>
				{loading ? (
					<Spinner label="Loading Order..." fullpage />
				) : (
					<CartPage
						selectedProducts={selectedProducts}
						increaseProductQuantity={increaseProductQuantity}
						decreaseProductQuantity={decreaseProductQuantity}
						resetSelectedProducts={() => setSelectedProducts([])}
						setSideSheetHeading={setSideSheetHeading}
					/>
				)}
			</SideSheet>
			<Modal open={loginOpen} setOpen={setLoginOpen}>
				<UserLogin setOpen={setLoginOpen} open={loginOpen} />
			</Modal>
			<Modal open={customizationOpen} setOpen={setCustomizationOpen}>
				<div className="customizationModal">
					<h3>{customizationItem?.name} Customizations</h3>
					<div className="customizationGrid">
						{customizationItem?.customization?.sweetness?.enabled && (
							<div className="customizationField">
								<span className="label">Sweetness</span>
								<div className="choiceGroup">
									{levelOptions.map((level) => (
										<button
											key={level}
											type="button"
											className={customizationDraft.sweetness === level || (!customizationDraft.sweetness && level === "reg") ? "active" : ""}
											onClick={() => setCustomizationDraft((v) => ({ ...v, sweetness: level }))}>
											{levelLabel[level]}
										</button>
									))}
								</div>
							</div>
						)}
						{customizationItem?.customization?.ice?.enabled && (
							<div className="customizationField">
								<span className="label">Ice</span>
								<div className="choiceGroup">
									{levelOptions.map((level) => (
										<button
											key={level}
											type="button"
											className={customizationDraft.ice === level || (!customizationDraft.ice && level === "reg") ? "active" : ""}
											onClick={() => setCustomizationDraft((v) => ({ ...v, ice: level }))}>
											{levelLabel[level]}
										</button>
									))}
								</div>
							</div>
						)}
						{customizationItem?.customization?.temperature?.enabled && (
							<div className="customizationField">
								<span className="label">Hot / Cold</span>
								<div className="choiceGroup">
									{temperatureOptions.map((temperature) => (
										<button
											key={temperature}
											type="button"
											className={
												customizationDraft.temperature === temperature || (!customizationDraft.temperature && temperature === "cold")
													? "active"
													: ""
											}
											onClick={() => setCustomizationDraft((v) => ({ ...v, temperature }))}>
											{temperature === "hot" ? "Hot" : "Cold"}
										</button>
									))}
								</div>
							</div>
						)}
						{(customizationItem?.customization?.milkOptions?.length ?? 0) > 0 && (
							<div className="customizationField">
								<span className="label">Milk</span>
								<div className="choiceGroup">
									{customizationItem?.customization?.milkOptions?.map((milk, i) => {
										const isOutOfStock = restaurant?.profile?.milkOptions?.some((option) => option.name === milk && option.hidden);
										return (
											<button
												key={milk}
												type="button"
												disabled={isOutOfStock}
												className={`${customizationDraft.milk === milk || (!customizationDraft.milk && i === 0) ? "active" : ""} ${isOutOfStock ? "danger" : ""}`.trim()}
												onClick={() => setCustomizationDraft((v) => ({ ...v, milk }))}>
												{milk}
												{isOutOfStock ? " (out of stock)" : ""}
											</button>
										);
									})}
								</div>
							</div>
						)}
						{(customizationItem?.customization?.flavorOptions?.length ?? 0) > 0 && (
							<div className="flavorRows">
								{customizationItem?.customization?.flavorOptions?.map((flavor) => {
									const isOutOfStock = restaurant?.profile?.addonOptions?.some((option) => option.name === flavor && option.hidden);
									const current = isOutOfStock ? undefined : customizationDraft.flavors?.find((f) => f.name === flavor);
									return (
										<div className="flavorRow" key={flavor}>
											<span className={isOutOfStock ? "danger" : ""}>
												{flavor}
												{isOutOfStock ? " (out of stock)" : ""}
											</span>
											<div className="choiceGroup">
												{levelOptions.map((level) => (
													<button
														key={level}
														type="button"
														className={current?.level === level || (!current?.level && level === "none") ? "active" : ""}
														disabled={isOutOfStock}
														onClick={() => {
															setCustomizationDraft((v) => {
																const flavors = [...(v.flavors ?? [])].filter((f) => f.name !== flavor);
																if (level !== "none") flavors.push({ name: flavor, level });
																return { ...v, flavors };
															});
														}}>
														{levelLabel[level]}
													</button>
												))}
											</div>
										</div>
									);
								})}
							</div>
						)}
					</div>
					<div className="customizationAction">
						<Button label="Add item" onClick={onCustomizationConfirm} />
					</div>
				</div>
			</Modal>
		</div>
	);
};

export default OrderPage;

type TCustomizationDraft = {
	sweetness?: TModifierLevel;
	ice?: TModifierLevel;
	temperature?: TTemperatureOption;
	milk?: string;
	flavors?: Array<{ name: string; level: TModifierLevel }>;
};

type TMenuCustom = TMenu & {
	quantity: number;
	cartKey?: string;
	selectedCustomization?: TCustomizationDraft;
};
