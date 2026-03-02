import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Avatar, Button, Spinner } from "xtreme-ui";

import { useAdmin } from "#components/context/useContext";
import { splitStringByFirstWord } from "#utils/helper/common";
import { SITE_URL } from "#utils/seo/constants";

import PasswordSettings from "./PasswordSettings";
import ThemeSettings from "./ThemeSettings";
import "./settingsAccount.scss";

const SettingsAccount = () => {
	const router = useRouter();
	const { profile, profileMutate } = useAdmin();
	const session = useSession();
	const [restaurantName, setRestaurantName] = useState<string[]>([]);
	const [companyName, setCompanyName] = useState("");
	const [companyImage, setCompanyImage] = useState("");
	const [savingCompany, setSavingCompany] = useState(false);
	const [orderUrlSlug, setOrderUrlSlug] = useState("");
	const [printUrl, setPrintUrl] = useState("");

	useEffect(() => {
		if (profile?.name) setRestaurantName(splitStringByFirstWord(profile?.name) ?? []);
		setCompanyName(profile?.name ?? "");
		setCompanyImage(profile?.avatar ?? "");
		setOrderUrlSlug(profile?.orderUrlSlug ?? profile?.restaurantID ?? "");
		setPrintUrl(profile?.printUrl ?? "");
	}, [profile?.avatar, profile?.name, profile?.orderUrlSlug, profile?.restaurantID, profile?.printUrl]);

	const onSaveCompany = async () => {
		setSavingCompany(true);
		const req = await fetch("/api/admin/profile", {
			method: "POST",
			body: JSON.stringify({ name: companyName, avatar: companyImage, orderUrlSlug, printUrl }),
		});
		const res = await req.json();
		if (res?.status === 200) {
			toast.success(res?.message);
			await profileMutate();
		} else toast.error(res?.message);
		setSavingCompany(false);
	};

	if (session.status === "loading" || !profile) return <Spinner fullpage label="Loading Account..." />;

	const onOrderUrlChange = (value: string) => {
		setOrderUrlSlug(value.toLowerCase().replace(/[^a-z0-9]/g, ""));
	};

	const orderUrlPreview = `${SITE_URL}/${orderUrlSlug || profile?.restaurantID || ""}`;

	return (
		<div className="settingsAccount">
			<div className="profileSettingsCard">
				{profile?.avatar && <Avatar className="avatar" src={profile?.avatar} />}
				<div className="restaurantDetails">
					<h1 className="name">
						{restaurantName[0]} <span>{restaurantName[1]}</span>
					</h1>
					<h6 className="address">{profile?.address}</h6>
				</div>
				<Button className="logout" icon="f011" onClick={() => router.push("/logout")} />
			</div>
			<div className="companySettingsCard">
				<h2>Company details</h2>
				<label>
					<span>Company Name</span>
					<input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Company name" />
				</label>
				<label>
					<span>Company Image URL</span>
					<input value={companyImage} onChange={(e) => setCompanyImage(e.target.value)} placeholder="https://example.com/image.jpg" />
				</label>
				<label>
					<span>Order URL</span>
					<input value={orderUrlSlug} onChange={(e) => onOrderUrlChange(e.target.value)} placeholder="myrestaurant" />
					<small>Only letters and numbers, no spaces or special characters.</small>
					<small className="preview">Preview: {orderUrlPreview}</small>
				</label>

				<label>
					<span>Print URL</span>
					<input value={printUrl} onChange={(e) => setPrintUrl(e.target.value)} placeholder="http://localhost:1777/print" />
					<small>Used by kitchen on Complete to print one label per item.</small>
				</label>
				<div className="actions">
					<Button label="Save Company" icon="f0c7" iconType="solid" loading={savingCompany} onClick={onSaveCompany} />
				</div>
			</div>
			<PasswordSettings />
			<ThemeSettings />
		</div>
	);
};

export default SettingsAccount;
