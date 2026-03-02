import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Avatar, Button, Spinner } from "xtreme-ui";

import { useAdmin } from "#components/context/useContext";
import { splitStringByFirstWord } from "#utils/helper/common";

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

	useEffect(() => {
		if (profile?.name) setRestaurantName(splitStringByFirstWord(profile?.name) ?? []);
		setCompanyName(profile?.name ?? "");
		setCompanyImage(profile?.avatar ?? "");
	}, [profile?.avatar, profile?.name]);

	const onSaveCompany = async () => {
		setSavingCompany(true);
		const req = await fetch("/api/admin/profile", {
			method: "POST",
			body: JSON.stringify({ name: companyName, avatar: companyImage }),
		});
		const res = await req.json();
		if (res?.status === 200) {
			toast.success(res?.message);
			await profileMutate();
		} else toast.error(res?.message);
		setSavingCompany(false);
	};

	if (session.status === "loading" || !profile) return <Spinner fullpage label="Loading Account..." />;

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
