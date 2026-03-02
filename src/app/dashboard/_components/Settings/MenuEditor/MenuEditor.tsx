import { type UIEvent, useEffect, useMemo, useRef, useState } from "react";

import { toast } from "react-toastify";
import { Button, Icon, Spinner } from "xtreme-ui";

import { useAdmin } from "#components/context/useContext";
import Modal from "#components/layout/Modal";
import type { TMenu } from "#utils/database/models/menu";

import MenuEditorItem from "./MenuEditorItem";
import "./menuEditor.scss";

type TOption = { name: string; hidden: boolean };
type TCategorySetting = { name: string; color: string; hidden: boolean };
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
		milkOptions: string[];
		defaultMilk: string;
		flavorOptions: string[];
		defaultFlavors: Array<{ name: string; level: "none" | "lite" | "reg" | "extra" }>;
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
		milkOptions: [],
		defaultMilk: "",
		flavorOptions: [],
		defaultFlavors: [],
	},
};

const MenuEditor = () => {
	const { profile, menus, profileLoading, profileMutate } = useAdmin();
	const [formOpen, setFormOpen] = useState(false);
	const [optionsOpen, setOptionsOpen] = useState(false);
	const [formSaving, setFormSaving] = useState(false);
	const [formDeleting, setFormDeleting] = useState(false);
	const [settingsSaving, setSettingsSaving] = useState(false);
	const [form, setForm] = useState<TMenuForm>(defaultForm);
	const [hideSettingsLoading, setHideSettingsLoading] = useState<string[]>([]);
	const [category, setCategory] = useState(0);
	const [settingsSaving, setSettingsSaving] = useState(false);

	const [categorySettings, setCategorySettings] = useState<TCategorySetting[]>([]);
	const [milkOptions, setMilkOptions] = useState<TOption[]>([]);
	const [addonOptions, setAddonOptions] = useState<TOption[]>([]);

	const categories = useRef<HTMLDivElement>(null);
	const [leftCategoryScroll, setLeftCategoryScroll] = useState(false);
	const [rightCategoryScroll, setRightCategoryScroll] = useState(true);

	const vegOptions = ["veg", "non-veg", "contains-egg"] as const;
	const levelOptions = ["none", "lite", "reg", "extra"] as const;
	const levelLabel = { none: "None", lite: "Lite", reg: "Reg", extra: "Extra" } as const;
	const foodTypeOptions = ["", "spicy", "extra-spicy", "sweet"] as const;

	useEffect(() => {
		setCategorySettings(
			profile?.categorySettings?.length ? profile.categorySettings : (profile?.categories ?? []).map((name) => ({ name, color: "#64748b", hidden: false })),
		);
		setMilkOptions(profile?.milkOptions ?? []);
		setAddonOptions(profile?.addonOptions ?? []);
	}, [profile]);

	const activeCategories = useMemo(() => categorySettings.filter((c) => !c.hidden), [categorySettings]);

	useEffect(() => {
		if (!form.customization.enabled || form.customization.milkOptions.length === 0) {
			if (form.customization.defaultMilk) {
				setForm((v) => ({ ...v, customization: { ...v.customization, defaultMilk: "" } }));
			}
			return;
		}
		if (!form.customization.milkOptions.includes(form.customization.defaultMilk)) {
			setForm((v) => ({ ...v, customization: { ...v.customization, defaultMilk: v.customization.milkOptions[0] ?? "" } }));
		}
	}, [form.customization.defaultMilk, form.customization.enabled, form.customization.milkOptions]);

	const onCategoryScroll = (event: UIEvent<HTMLDivElement>) => {
		const target = event.target as HTMLDivElement;
		setLeftCategoryScroll(target.scrollLeft > 50);
		setRightCategoryScroll(Math.round(target.scrollWidth - target.scrollLeft) - 50 > target.clientWidth);
	};

	const onHide = async (itemId: string, hidden: boolean) => {
		setHideSettingsLoading((v) => [...v, itemId]);
		const req = await fetch("/api/admin/menu/hidden", { method: "POST", body: JSON.stringify({ itemId, hidden }) });
		const res = await req.json();
		if (res?.status !== 200) toast.error(res?.message);
		await profileMutate();
		setHideSettingsLoading((v) => v.filter((item) => item !== itemId));
	};

	const openCreateForm = () => {
		setForm({ ...defaultForm, category: activeCategories?.[0]?.name ?? "" });
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
				sweetness: { enabled: !!item.customization?.sweetness?.enabled, defaultLevel: item.customization?.sweetness?.defaultLevel ?? "reg" },
				ice: { enabled: !!item.customization?.ice?.enabled, defaultLevel: item.customization?.ice?.defaultLevel ?? "reg" },
				milkOptions: item.customization?.milkOptions ?? [],
				defaultMilk: item.customization?.defaultMilk ?? "",
				flavorOptions: item.customization?.flavorOptions ?? [],
				defaultFlavors: item.customization?.defaultFlavors ?? [],
			},
		});
		setFormOpen(true);
	};

	const onSaveItem = async () => {
		setFormSaving(true);
		const req = await fetch("/api/admin/menu", { method: "POST", body: JSON.stringify({ ...form, price: Number(form.price), taxPercent: Number(form.taxPercent) }) });
		const res = await req.json();
		if (res?.status === 200) {
			toast.success(res?.message);
			setFormOpen(false);
			await profileMutate();
		} else toast.error(res?.message);
		setFormSaving(false);
	};

	const onDeleteItem = async () => {
		if (!form.itemId) return;
		setFormDeleting(true);
		const req = await fetch("/api/admin/menu", { method: "DELETE", body: JSON.stringify({ itemId: form.itemId }) });
		const res = await req.json();
		if (res?.status === 200) {
			toast.success(res?.message);
			setFormOpen(false);
			await profileMutate();
		} else toast.error(res?.message);
		setFormDeleting(false);
	};

	const onSaveOptions = async () => {
		setSettingsSaving(true);
		const req = await fetch("/api/admin/menu/options", { method: "POST", body: JSON.stringify({ categorySettings, milkOptions, addonOptions }) });
		const res = await req.json();
		if (res?.status === 200) {
			toast.success(res?.message);
			setOptionsOpen(false);
			await profileMutate();
		} else toast.error(res?.message);
		setSettingsSaving(false);
	};

	if (profileLoading) return <Spinner fullpage label="Loading Menu..." />;

	return (
		<>
			<div className="menuEditor">
				<div className="menuCategoryEditor">
					<div className="menuCategoryHeader">
						<h1 className="menuCategoryHeading">Menu Categories</h1>
						<Button size="mini" label="Edit Option Lists" icon="f304" iconType="solid" onClick={() => setOptionsOpen(true)} />
					</div>
					<div className="menuCategoryContainer" ref={categories} onScroll={onCategoryScroll}>
						{categorySettings.map((item, i) => (
							<div key={i} className={`menuCategory ${category === i ? "active" : ""}`} onClick={() => setCategory(i)}>
								<span className="title">{item.name}</span>
							</div>
						))}
					</div>
					<div
						className={`scrollLeft ${leftCategoryScroll ? "show" : ""}`}
						onClick={() => {
							if (categories.current) categories.current.scrollLeft -= 400;
						}}>
						<Icon code="f053" type="solid" />
					</div>
					<div
						className={`scrollRight ${rightCategoryScroll ? "show" : ""}`}
						onClick={() => {
							if (categories.current) categories.current.scrollLeft += 400;
						}}>
						<Icon code="f054" type="solid" />
					</div>
				</div>

				<div className="menuItemEditor">
					<div className="menuItemHeader">
						<h1 className="menuItemHeading">Menu Items</h1>
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

				<div className="menuItemEditor">
					<div className="menuItemHeader">
						<h1 className="menuItemHeading">Option Lists</h1>
					</div>
					<div className="menuItemContainer" style={{ padding: "1rem", display: "grid", gap: "1rem" }}>
						<div>
							<h4>Categories</h4>
							{categorySettings.map((option, i) => (
								<div key={i} style={{ display: "flex", gap: ".5rem", marginBottom: ".5rem" }}>
									<input
										value={option.name}
										onChange={(e) => setCategorySettings((v) => v.map((x, idx) => (idx === i ? { ...x, name: e.target.value.toLowerCase() } : x)))}
									/>
									<input
										type="color"
										value={option.color}
										onChange={(e) => setCategorySettings((v) => v.map((x, idx) => (idx === i ? { ...x, color: e.target.value } : x)))}
									/>
									<Button
										size="mini"
										iconType="solid"
										icon={option.hidden ? "f070" : "f06e"}
										onClick={() => setCategorySettings((v) => v.map((x, idx) => (idx === i ? { ...x, hidden: !x.hidden } : x)))}
									/>
									<Button
										size="mini"
										iconType="solid"
										icon="f2ed"
										type="secondaryDanger"
										onClick={() => setCategorySettings((v) => v.filter((_, idx) => idx !== i))}
									/>
								</div>
							))}
							<Button size="mini" label="Add category" onClick={() => setCategorySettings((v) => [...v, { name: "", color: "#64748b", hidden: false }])} />
						</div>
						<div>
							<h4>Milk Options</h4>
							{milkOptions.map((option, i) => (
								<div key={i} style={{ display: "flex", gap: ".5rem", marginBottom: ".5rem" }}>
									<input
										value={option.name}
										onChange={(e) => setMilkOptions((v) => v.map((x, idx) => (idx === i ? { ...x, name: e.target.value } : x)))}
									/>
									<Button
										size="mini"
										iconType="solid"
										icon={option.hidden ? "f070" : "f06e"}
										onClick={() => setMilkOptions((v) => v.map((x, idx) => (idx === i ? { ...x, hidden: !x.hidden } : x)))}
									/>
									<Button
										size="mini"
										iconType="solid"
										icon="f2ed"
										type="secondaryDanger"
										onClick={() => setMilkOptions((v) => v.filter((_, idx) => idx !== i))}
									/>
								</div>
							))}
							<Button size="mini" label="Add milk option" onClick={() => setMilkOptions((v) => [...v, { name: "", hidden: false }])} />
						</div>
						<div>
							<h4>Add-ons</h4>
							{addonOptions.map((option, i) => (
								<div key={i} style={{ display: "flex", gap: ".5rem", marginBottom: ".5rem" }}>
									<input
										value={option.name}
										onChange={(e) => setAddonOptions((v) => v.map((x, idx) => (idx === i ? { ...x, name: e.target.value } : x)))}
									/>
									<Button
										size="mini"
										iconType="solid"
										icon={option.hidden ? "f070" : "f06e"}
										onClick={() => setAddonOptions((v) => v.map((x, idx) => (idx === i ? { ...x, hidden: !x.hidden } : x)))}
									/>
									<Button
										size="mini"
										iconType="solid"
										icon="f2ed"
										type="secondaryDanger"
										onClick={() => setAddonOptions((v) => v.filter((_, idx) => idx !== i))}
									/>
								</div>
							))}
							<Button size="mini" label="Add add-on" onClick={() => setAddonOptions((v) => [...v, { name: "", hidden: false }])} />
						</div>
						<Button label="Save Lists" loading={settingsSaving} onClick={onSaveOptions} />
					</div>
				</div>
				<Button className={`menuEditorAdd ${formOpen ? "active" : ""}`} onClick={openCreateForm} icon="2b" iconType="solid" />
			</div>

			<Modal open={optionsOpen} setOpen={setOptionsOpen}>
				<div className="menuForm">
					<h2>Edit Option Lists</h2>
					<div className="grid">
						<div>
							<p>Menu Categories</p>
							{categorySettings.map((option, i) => (
								<div key={i} className="optionRow">
									<input
										value={option.name}
										onChange={(e) => setCategorySettings((v) => v.map((x, idx) => (idx === i ? { ...x, name: e.target.value.toLowerCase() } : x)))}
									/>
									<input
										type="color"
										value={option.color}
										onChange={(e) => setCategorySettings((v) => v.map((x, idx) => (idx === i ? { ...x, color: e.target.value } : x)))}
									/>
									<Button
										size="mini"
										iconType="solid"
										icon={option.hidden ? "f070" : "f06e"}
										onClick={() => setCategorySettings((v) => v.map((x, idx) => (idx === i ? { ...x, hidden: !x.hidden } : x)))}
									/>
									<Button
										size="mini"
										iconType="solid"
										icon="f2ed"
										type="secondaryDanger"
										onClick={() => setCategorySettings((v) => v.filter((_, idx) => idx !== i))}
									/>
								</div>
							))}
							<Button size="mini" label="Add category" onClick={() => setCategorySettings((v) => [...v, { name: "", color: "#64748b", hidden: false }])} />
						</div>
						<div>
							<p>Milk Options</p>
							{milkOptions.map((option, i) => (
								<div key={i} className="optionRow">
									<input
										value={option.name}
										onChange={(e) => setMilkOptions((v) => v.map((x, idx) => (idx === i ? { ...x, name: e.target.value } : x)))}
									/>
									<Button
										size="mini"
										iconType="solid"
										icon={option.hidden ? "f070" : "f06e"}
										onClick={() => setMilkOptions((v) => v.map((x, idx) => (idx === i ? { ...x, hidden: !x.hidden } : x)))}
									/>
									<Button
										size="mini"
										iconType="solid"
										icon="f2ed"
										type="secondaryDanger"
										onClick={() => setMilkOptions((v) => v.filter((_, idx) => idx !== i))}
									/>
								</div>
							))}
							<Button size="mini" label="Add milk option" onClick={() => setMilkOptions((v) => [...v, { name: "", hidden: false }])} />
						</div>
						<div>
							<p>Add-on Options</p>
							{addonOptions.map((option, i) => (
								<div key={i} className="optionRow">
									<input
										value={option.name}
										onChange={(e) => setAddonOptions((v) => v.map((x, idx) => (idx === i ? { ...x, name: e.target.value } : x)))}
									/>
									<Button
										size="mini"
										iconType="solid"
										icon={option.hidden ? "f070" : "f06e"}
										onClick={() => setAddonOptions((v) => v.map((x, idx) => (idx === i ? { ...x, hidden: !x.hidden } : x)))}
									/>
									<Button
										size="mini"
										iconType="solid"
										icon="f2ed"
										type="secondaryDanger"
										onClick={() => setAddonOptions((v) => v.filter((_, idx) => idx !== i))}
									/>
								</div>
							))}
							<Button size="mini" label="Add add-on" onClick={() => setAddonOptions((v) => [...v, { name: "", hidden: false }])} />
						</div>
					</div>
					<div className="actions">
						<Button label="Save Lists" loading={settingsSaving} onClick={onSaveOptions} />
					</div>
				</div>
			</Modal>

			<Modal open={formOpen} setOpen={setFormOpen}>
				<div className="menuForm">
					<h2>{form.itemId ? "Edit Menu Item" : "Create Menu Item"}</h2>
					<div className="grid labeled">
						<label>
							<span>Item Name</span>
							<input value={form.name} onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))} />
						</label>
						<label>
							<span>Description (optional)</span>
							<input value={form.description} onChange={(e) => setForm((v) => ({ ...v, description: e.target.value }))} />
						</label>
						<label>
							<span>Category</span>
							<select value={form.category} onChange={(e) => setForm((v) => ({ ...v, category: e.target.value }))}>
								{activeCategories.map((cat) => (
									<option key={cat.name} value={cat.name}>
										{cat.name}
									</option>
								))}
							</select>
						</label>
						<label>
							<span>Image URL</span>
							<input value={form.image} onChange={(e) => setForm((v) => ({ ...v, image: e.target.value }))} />
						</label>
						<label>
							<span>Price</span>
							<input value={form.price} onChange={(e) => setForm((v) => ({ ...v, price: e.target.value }))} />
						</label>
						<label>
							<span>Tax %</span>
							<input value={form.taxPercent} onChange={(e) => setForm((v) => ({ ...v, taxPercent: e.target.value }))} />
						</label>
						<label>
							<span>Veg Type</span>
							<select value={form.veg} onChange={(e) => setForm((v) => ({ ...v, veg: e.target.value as TMenuForm["veg"] }))}>
								{vegOptions.map((veg) => (
									<option key={veg} value={veg}>
										{veg}
									</option>
								))}
							</select>
						</label>
						<label>
							<span>Food Tag</span>
							<select value={form.foodType} onChange={(e) => setForm((v) => ({ ...v, foodType: e.target.value as TMenuForm["foodType"] }))}>
								{foodTypeOptions.map((type) => (
									<option key={type || "none"} value={type}>
										{type || "none"}
									</option>
								))}
							</select>
						</label>
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
							<div className="choiceGroup">
								{levelOptions.map((level) => (
									<button
										key={level}
										type="button"
										className={form.customization.sweetness.defaultLevel === level ? "active" : ""}
										onClick={() =>
											setForm((v) => ({
												...v,
												customization: { ...v.customization, sweetness: { ...v.customization.sweetness, defaultLevel: level } },
											}))
										}>
										{levelLabel[level]}
									</button>
								))}
							</div>
							<label className="check">
								<input
									type="checkbox"
									checked={form.customization.ice.enabled}
									onChange={(e) =>
										setForm((v) => ({ ...v, customization: { ...v.customization, ice: { ...v.customization.ice, enabled: e.target.checked } } }))
									}
								/>{" "}
								Ice
							</label>
							<div className="choiceGroup">
								{levelOptions.map((level) => (
									<button
										key={level}
										type="button"
										className={form.customization.ice.defaultLevel === level ? "active" : ""}
										onClick={() =>
											setForm((v) => ({ ...v, customization: { ...v.customization, ice: { ...v.customization.ice, defaultLevel: level } } }))
										}>
										{levelLabel[level]}
									</button>
								))}
							</div>
							<div>
								<p>Milk options</p>
								{milkOptions
									.filter((o) => !o.hidden)
									.map((option) => (
										<label key={option.name}>
											<input
												type="checkbox"
												checked={form.customization.milkOptions.includes(option.name)}
												onChange={() =>
													setForm((v) => ({
														...v,
														customization: {
															...v.customization,
															milkOptions: v.customization.milkOptions.includes(option.name)
																? v.customization.milkOptions.filter((x) => x !== option.name)
																: [...v.customization.milkOptions, option.name],
														},
													}))
												}
											/>{" "}
											{option.name}
										</label>
									))}
							</div>
							{form.customization.milkOptions.length > 0 && (
								<label>
									<span>Default milk</span>
									<select
										value={form.customization.defaultMilk}
										onChange={(e) => setForm((v) => ({ ...v, customization: { ...v.customization, defaultMilk: e.target.value } }))}>
										{form.customization.milkOptions.map((milk) => (
											<option key={milk} value={milk}>
												{milk}
											</option>
										))}
									</select>
								</label>
							)}
							<div>
								<p>Add-ons</p>
								{addonOptions
									.filter((o) => !o.hidden)
									.map((option) => (
										<label key={option.name}>
											<input
												type="checkbox"
												checked={form.customization.flavorOptions.includes(option.name)}
												onChange={() =>
													setForm((v) => ({
														...v,
														customization: {
															...v.customization,
															flavorOptions: v.customization.flavorOptions.includes(option.name)
																? v.customization.flavorOptions.filter((x) => x !== option.name)
																: [...v.customization.flavorOptions, option.name],
														},
													}))
												}
											/>{" "}
											{option.name}
										</label>
									))}
							</div>
							<div>
								{form.customization.flavorOptions.map((flavor) => (
									<div key={flavor}>
										<span>{flavor}</span>
										<div className="choiceGroup">
											{levelOptions.map((level) => (
												<button
													key={level}
													type="button"
													className={form.customization.defaultFlavors.find((f) => f.name === flavor)?.level === level ? "active" : ""}
													onClick={() =>
														setForm((v) => ({
															...v,
															customization: {
																...v.customization,
																defaultFlavors: [
																	...v.customization.defaultFlavors.filter((f) => f.name !== flavor),
																	...(level === "none" ? [] : [{ name: flavor, level }]),
																],
															},
														}))
													}>
													{levelLabel[level]}
												</button>
											))}
										</div>
									</div>
								))}
							</div>
						</div>
					)}
					<div className="actions">
						{form.itemId && <Button label="Delete Item" type="secondaryDanger" loading={formDeleting} onClick={onDeleteItem} />}
						<Button label="Save" loading={formSaving} onClick={onSaveItem} />
					</div>
				</div>
			</Modal>
		</>
	);
};

export default MenuEditor;
