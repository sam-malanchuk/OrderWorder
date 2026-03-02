import { type UIEvent, useRef, useState } from "react";

import { toast } from "react-toastify";
import { Button, Icon, Spinner } from "xtreme-ui";

import { useAdmin } from "#components/context/useContext";
import Modal from "#components/layout/Modal";
import type { TMenu } from "#utils/database/models/menu";

import MenuEditorItem from "./MenuEditorItem";
import "./menuEditor.scss";

type TMenuForm = {
	itemId?: string;
	name: string;
	description: string;
	category: string;
	price: string;
	taxPercent: string;
	veg: "veg" | "non-veg" | "contains-egg";
	foodType: "" | "spicy" | "extra-spicy" | "sweet";
	image: string;
	hidden: boolean;
	customization: {
		enabled: boolean;
		sweetness: { enabled: boolean; defaultLevel: "none" | "lite" | "reg" | "extra" };
		ice: { enabled: boolean; defaultLevel: "none" | "lite" | "reg" | "extra" };
		milkOptions: string;
		defaultMilk: string;
		flavorOptions: string;
		defaultFlavors: string;
	};
};

const defaultForm: TMenuForm = {
	name: "",
	description: "",
	category: "",
	price: "",
	taxPercent: "5",
	veg: "veg",
	foodType: "",
	image: "",
	hidden: false,
	customization: {
		enabled: false,
		sweetness: { enabled: false, defaultLevel: "reg" },
		ice: { enabled: false, defaultLevel: "reg" },
		milkOptions: "2% milk, almond milk, whole milk, skim milk",
		defaultMilk: "2% milk",
		flavorOptions: "caramel",
		defaultFlavors: "caramel:reg",
	},
};

const MenuEditor = () => {
	const { profile, menus, profileLoading, profileMutate } = useAdmin();
	const [formOpen, setFormOpen] = useState(false);
	const [formSaving, setFormSaving] = useState(false);
	const [form, setForm] = useState<TMenuForm>(defaultForm);
	const [hideSettingsLoading, setHideSettingsLoading] = useState<string[]>([]);
	const [category, setCategory] = useState(0);

	const categories = useRef<HTMLDivElement>(null);

	const [leftCategoryScroll, setLeftCategoryScroll] = useState(false);
	const [rightCategoryScroll, setRightCategoryScroll] = useState(true);

	const vegOptions = ["veg", "non-veg", "contains-egg"] as const;
	const levelOptions = ["none", "lite", "reg", "extra"] as const;
	const foodTypeOptions = ["", "spicy", "extra-spicy", "sweet"] as const;

	const onCategoryScroll = (event: UIEvent<HTMLDivElement>) => {
		const target = event.target as HTMLDivElement;
		if (target.scrollLeft > 50) setLeftCategoryScroll(true);
		else setLeftCategoryScroll(false);

		if (Math.round(target.scrollWidth - target.scrollLeft) - 50 > target.clientWidth) setRightCategoryScroll(true);
		else setRightCategoryScroll(false);
	};
	const categoryScrollLeft = () => {
		if (categories?.current) categories.current.scrollLeft -= 400;
	};
	const categoryScrollRight = () => {
		if (categories?.current) categories.current.scrollLeft += 400;
	};
	const onHide = async (itemId: string, hidden: boolean) => {
		setHideSettingsLoading((v) => [...v, itemId]);
		const req = await fetch("/api/admin/menu/hidden", {
			method: "POST",
			body: JSON.stringify({ itemId, hidden }),
		});
		const res = await req.json();

		if (res?.status !== 200) toast.error(res?.message);

		await profileMutate();
		setHideSettingsLoading((v) => v.filter((item) => item !== itemId));
	};

	const openCreateForm = () => {
		setForm({ ...defaultForm, category: profile?.categories?.[0] ?? "" });
		setFormOpen(true);
	};

	const openEditForm = (item: TMenu) => {
		setForm({
			itemId: item._id.toString(),
			name: item.name,
			description: item.description,
			category: item.category,
			price: String(item.price),
			taxPercent: String(item.taxPercent),
			veg: item.veg,
			foodType: item.foodType ?? "",
			image: item.image ?? "",
			hidden: !!item.hidden,
			customization: {
				enabled: !!item.customization?.enabled,
				sweetness: {
					enabled: !!item.customization?.sweetness?.enabled,
					defaultLevel: item.customization?.sweetness?.defaultLevel ?? "reg",
				},
				ice: {
					enabled: !!item.customization?.ice?.enabled,
					defaultLevel: item.customization?.ice?.defaultLevel ?? "reg",
				},
				milkOptions: item.customization?.milkOptions?.join(", ") ?? "",
				defaultMilk: item.customization?.defaultMilk ?? "",
				flavorOptions: item.customization?.flavorOptions?.join(", ") ?? "",
				defaultFlavors: item.customization?.defaultFlavors?.map((flavor) => `${flavor.name}:${flavor.level}`).join(", ") ?? "",
			},
		});
		setFormOpen(true);
	};

	const onSaveItem = async () => {
		const defaultFlavors = form.customization.defaultFlavors
			.split(",")
			.map((flavor) => flavor.trim())
			.filter(Boolean)
			.map((flavor) => {
				const [name, level = "reg"] = flavor.split(":").map((v) => v.trim());
				return { name, level: levelOptions.includes(level as (typeof levelOptions)[number]) ? level : "reg" };
			});
		setFormSaving(true);
		const req = await fetch("/api/admin/menu", {
			method: "POST",
			body: JSON.stringify({
				itemId: form.itemId,
				name: form.name,
				description: form.description,
				category: form.category,
				price: Number(form.price),
				taxPercent: Number(form.taxPercent),
				veg: form.veg,
				foodType: form.foodType,
				image: form.image,
				hidden: form.hidden,
				customization: {
					enabled: form.customization.enabled,
					sweetness: form.customization.sweetness,
					ice: form.customization.ice,
					milkOptions: form.customization.milkOptions
						.split(",")
						.map((v) => v.trim())
						.filter(Boolean),
					defaultMilk: form.customization.defaultMilk.trim(),
					flavorOptions: form.customization.flavorOptions
						.split(",")
						.map((v) => v.trim())
						.filter(Boolean),
					defaultFlavors,
				},
			}),
		});
		const res = await req.json();

		if (res?.status === 200) {
			toast.success(res?.message);
			setFormOpen(false);
			await profileMutate();
		} else toast.error(res?.message);
		setFormSaving(false);
	};

	if (profileLoading) return <Spinner fullpage label="Loading Menu..." />;

	return (
		<>
			<div className="menuEditor">
				<div className="menuCategoryEditor">
					<div className="menuCategoryHeader">
						<h1 className="menuCategoryHeading">Menu Categories</h1>
						<div className="menuCategoryOptions" />
					</div>
					<div className="menuCategoryContainer" ref={categories} onScroll={onCategoryScroll}>
						{profile?.categories?.map((item, i) => (
							<div key={i} className={`menuCategory ${category === i ? "active" : ""}`} onClick={() => setCategory(i)}>
								<span className="title">{item}</span>
							</div>
						))}
						<div className="space" />
					</div>
					<div className={`scrollLeft ${leftCategoryScroll ? "show" : ""}`} onClick={categoryScrollLeft}>
						<Icon code="f053" type="solid" />
					</div>
					<div className={`scrollRight ${rightCategoryScroll ? "show" : ""}`} onClick={categoryScrollRight}>
						<Icon code="f054" type="solid" />
					</div>
				</div>
				<div className="menuItemEditor">
					<div className="menuItemHeader">
						<h1 className="menuItemHeading">Menu Items</h1>
						<div className="menuItemOptions" />
					</div>
					<div className="menuItemContainer">
						{menus.map((item, id) => (
							<MenuEditorItem
								key={id}
								item={item}
								onEdit={openEditForm}
								onHide={onHide}
								hideSettingsLoading={hideSettingsLoading.includes(item._id.toString())}
							/>
						))}
					</div>
				</div>
				<Button className={`menuEditorAdd ${formOpen ? "active" : ""}`} onClick={openCreateForm} icon="2b" iconType="solid" />
			</div>

			<Modal open={formOpen} setOpen={setFormOpen}>
				<div className="menuForm">
					<h2>{form.itemId ? "Edit Menu Item" : "Create Menu Item"}</h2>
					<div className="grid">
						<input placeholder="Name" value={form.name} onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))} />
						<input placeholder="Description" value={form.description} onChange={(e) => setForm((v) => ({ ...v, description: e.target.value }))} />
						<select value={form.category} onChange={(e) => setForm((v) => ({ ...v, category: e.target.value }))}>
							{profile?.categories?.map((cat) => (
								<option key={cat} value={cat}>
									{cat}
								</option>
							))}
						</select>
						<input placeholder="Image URL" value={form.image} onChange={(e) => setForm((v) => ({ ...v, image: e.target.value }))} />
						<input placeholder="Price" value={form.price} onChange={(e) => setForm((v) => ({ ...v, price: e.target.value }))} />
						<input placeholder="Tax %" value={form.taxPercent} onChange={(e) => setForm((v) => ({ ...v, taxPercent: e.target.value }))} />
						<select value={form.veg} onChange={(e) => setForm((v) => ({ ...v, veg: e.target.value as TMenuForm["veg"] }))}>
							{vegOptions.map((veg) => (
								<option key={veg} value={veg}>
									{veg}
								</option>
							))}
						</select>
						<select value={form.foodType} onChange={(e) => setForm((v) => ({ ...v, foodType: e.target.value as TMenuForm["foodType"] }))}>
							{foodTypeOptions.map((type) => (
								<option key={type || "none"} value={type}>
									{type || "no food type"}
								</option>
							))}
						</select>
					</div>
					<div className="toggleLine">
						<label>
							<input
								type="checkbox"
								checked={form.customization.enabled}
								onChange={(e) => setForm((v) => ({ ...v, customization: { ...v.customization, enabled: e.target.checked } }))}
							/>{" "}
							Enable customizations
						</label>
					</div>
					{form.customization.enabled && (
						<div className="grid">
							<label className="check">
								{" "}
								<input
									type="checkbox"
									checked={form.customization.sweetness.enabled}
									onChange={(e) =>
										setForm((v) => ({
											...v,
											customization: { ...v.customization, sweetness: { ...v.customization.sweetness, enabled: e.target.checked } },
										}))
									}
								/>{" "}
								Sweetness
							</label>
							<select
								value={form.customization.sweetness.defaultLevel}
								onChange={(e) =>
									setForm((v) => ({
										...v,
										customization: {
											...v.customization,
											sweetness: {
												...v.customization.sweetness,
												defaultLevel: e.target.value as TMenuForm["customization"]["sweetness"]["defaultLevel"],
											},
										},
									}))
								}>
								{levelOptions.map((level) => (
									<option key={level} value={level}>
										{level}
									</option>
								))}
							</select>
							<label className="check">
								{" "}
								<input
									type="checkbox"
									checked={form.customization.ice.enabled}
									onChange={(e) =>
										setForm((v) => ({ ...v, customization: { ...v.customization, ice: { ...v.customization.ice, enabled: e.target.checked } } }))
									}
								/>{" "}
								Ice
							</label>
							<select
								value={form.customization.ice.defaultLevel}
								onChange={(e) =>
									setForm((v) => ({
										...v,
										customization: {
											...v.customization,
											ice: { ...v.customization.ice, defaultLevel: e.target.value as TMenuForm["customization"]["ice"]["defaultLevel"] },
										},
									}))
								}>
								{levelOptions.map((level) => (
									<option key={level} value={level}>
										{level}
									</option>
								))}
							</select>
							<input
								placeholder="Milk options (comma-separated)"
								value={form.customization.milkOptions}
								onChange={(e) => setForm((v) => ({ ...v, customization: { ...v.customization, milkOptions: e.target.value } }))}
							/>
							<input
								placeholder="Default milk"
								value={form.customization.defaultMilk}
								onChange={(e) => setForm((v) => ({ ...v, customization: { ...v.customization, defaultMilk: e.target.value } }))}
							/>
							<input
								placeholder="Flavors (comma-separated)"
								value={form.customization.flavorOptions}
								onChange={(e) => setForm((v) => ({ ...v, customization: { ...v.customization, flavorOptions: e.target.value } }))}
							/>
							<input
								placeholder="Default flavors e.g. caramel:reg,vanilla:lite"
								value={form.customization.defaultFlavors}
								onChange={(e) => setForm((v) => ({ ...v, customization: { ...v.customization, defaultFlavors: e.target.value } }))}
							/>
						</div>
					)}
					<div className="actions">
						<Button label="Save" loading={formSaving} onClick={onSaveItem} />
					</div>
				</div>
			</Modal>
		</>
	);
};

export default MenuEditor;
