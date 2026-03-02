import mongoose, { type HydratedDocument } from "mongoose";
import type { TThemeColor } from "xtreme-ui";

import { Accounts, type TAccount } from "./account";

const accountCache = new Map<string, TAccount | null>();

const ProfileSchema = new mongoose.Schema<TProfile>(
	{
		name: { type: String, trim: true, required: true },
		restaurantID: { type: String, trim: true, lowercase: true, unique: true, required: true, sparse: true, index: { unique: true } },
		description: { type: String, trim: true },
		address: { type: String, trim: true },
		themeColor: {
			h: { type: Number, trim: true, min: 0, max: 360 },
			s: { type: Number, trim: true, min: 0, max: 100 },
			l: { type: Number, trim: true, min: 0, max: 100 },
		},
		gstInclusive: { type: Boolean, default: false },
		categories: [{ type: String, trim: true, lowercase: true, match: /^[^,]*$/ }],
		categorySettings: [
			{
				name: { type: String, trim: true, lowercase: true, match: /^[^,]*$/ },
				color: { type: String, trim: true, default: "#64748b" },
				hidden: { type: Boolean, default: false },
			},
		],
		milkOptions: [
			{
				name: { type: String, trim: true },
				hidden: { type: Boolean, default: false },
			},
		],
		addonOptions: [
			{
				name: { type: String, trim: true },
				hidden: { type: Boolean, default: false },
			},
		],
		avatar: { type: String, trim: true },
		cover: { type: String, trim: true },
		photos: [{ type: String, trim: true }],
	},
	{ timestamps: true },
);

ProfileSchema.pre("save", async function () {
	let account = accountCache.get(this.restaurantID);
	if (!account) {
		account = await Accounts.findOne<TAccount>({ username: this.restaurantID });
		if (account) accountCache.set(this.restaurantID, account);
		else throw new Error(`The associated account with username '${this.restaurantID}'does not exist.`);
	}

	this.categories = Array.from(new Set(this.categories));
	if (!this.categorySettings?.length) this.categorySettings = this.categories.map((name) => ({ name, color: "#64748b", hidden: false }));
});
ProfileSchema.post("save", async function () {
	await Accounts.updateOne({ username: this.restaurantID }, { $set: { profile: this._id } });
});

export const Profiles = mongoose.models?.profiles ?? mongoose.model<TProfile>("profiles", ProfileSchema);
export type TProfile = HydratedDocument<{
	name: string;
	restaurantID: string;
	description: string;
	address: string;
	avatar: string;
	cover: string;
	photos: Array<string>;
	themeColor: TThemeColor;
	gstInclusive: boolean;
	categories: Array<string>;
	categorySettings?: Array<{ name: string; color: string; hidden: boolean }>;
	milkOptions?: Array<{ name: string; hidden: boolean }>;
	addonOptions?: Array<{ name: string; hidden: boolean }>;
}>;
