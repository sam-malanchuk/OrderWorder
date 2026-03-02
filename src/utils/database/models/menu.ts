import mongoose, { type HydratedDocument } from "mongoose";

import { Accounts, type TAccount } from "./account";

const accountCache = new Map<string, TAccount | null>();

const FoodType = ["spicy", "extra-spicy", "sweet"] as const;
const Veg = ["veg", "non-veg", "contains-egg"] as const;
const ModifierLevel = ["none", "lite", "reg", "extra"] as const;
const TemperatureOption = ["hot", "cold"] as const;

const MenuSchema = new mongoose.Schema<TMenu>(
	{
		name: { type: String, trim: true, unique: true, required: true, sparse: true, index: { unique: true } },
		restaurantID: { type: String, trim: true, lowercase: true, required: true },
		description: { type: String, trim: true },
		category: { type: String, trim: true, lowercase: true },
		price: { type: Number, trim: true, required: true },
		taxPercent: { type: Number, trim: true, required: true },
		foodType: { type: String, trim: true, lowercase: true, enum: FoodType },
		veg: { type: String, trim: true, lowercase: true, required: true, enum: Veg },
		image: { type: String, trim: true },
		hidden: { type: Boolean, default: true },
		customization: {
			enabled: { type: Boolean, default: false },
			sweetness: {
				enabled: { type: Boolean, default: false },
				defaultLevel: { type: String, trim: true, lowercase: true, enum: ModifierLevel, default: "reg" },
			},
			ice: {
				enabled: { type: Boolean, default: false },
				defaultLevel: { type: String, trim: true, lowercase: true, enum: ModifierLevel, default: "reg" },
			},
			temperature: {
				enabled: { type: Boolean, default: false },
				defaultValue: { type: String, trim: true, lowercase: true, enum: TemperatureOption, default: "cold" },
			},
			milkOptions: [{ type: String, trim: true }],
			defaultMilk: { type: String, trim: true },
			flavorOptions: [{ type: String, trim: true }],
			defaultFlavors: [
				{
					name: { type: String, trim: true },
					level: { type: String, trim: true, lowercase: true, enum: ModifierLevel, default: "reg" },
				},
			],
		},
	},
	{ timestamps: true },
);

MenuSchema.pre("save", async function () {
	let account = accountCache.get(this.restaurantID);
	if (!account) {
		account = await Accounts.findOne<TAccount>({ username: this.restaurantID }).populate("profile");
		if (account) accountCache.set(this.restaurantID, account);
		else throw new Error(`The associated account with username '${this.restaurantID}'does not exist.`);
	}
	if (!account?.profile?.categories?.includes(this.category)) throw new Error("The menu item category does not exist.");
});
MenuSchema.post("save", async function () {
	await Accounts.updateOne({ username: this.restaurantID }, { $addToSet: { menus: this._id } });
});

export const Menus = mongoose.models?.menus ?? mongoose.model<TMenu>("menus", MenuSchema);
export type TMenu = HydratedDocument<{
	name: string;
	restaurantID: string;
	description: string;
	category: string;
	price: number;
	taxPercent: number;
	foodType: TFoodType;
	veg: TVeg;
	image: string;
	hidden: boolean;
	customization?: {
		enabled?: boolean;
		sweetness?: { enabled?: boolean; defaultLevel?: TModifierLevel };
		ice?: { enabled?: boolean; defaultLevel?: TModifierLevel };
		temperature?: { enabled?: boolean; defaultValue?: TTemperatureOption };
		milkOptions?: string[];
		defaultMilk?: string;
		flavorOptions?: string[];
		defaultFlavors?: Array<{ name: string; level: TModifierLevel }>;
	};
}>;

export type TFoodType = (typeof FoodType)[number];
export type TVeg = (typeof Veg)[number];
export type TModifierLevel = (typeof ModifierLevel)[number];
export type TTemperatureOption = (typeof TemperatureOption)[number];
