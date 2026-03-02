import { useEffect, useMemo, useState } from "react";

import { toast } from "react-toastify";
import { Button } from "xtreme-ui";

import { useAdmin } from "#components/context/useContext";
import type { TProfile } from "#utils/database/models/profile";

import "./themeSettings.scss";

type TThemeTarget = "admin" | "frontend" | "ready";
type TThemeForm = { h: number; s: number; l: number };

const toThemeForm = (color?: TProfile["themeColor"]): TThemeForm => ({
	h: Number(color?.h ?? 26),
	s: Number(color?.s ?? 90),
	l: Number(color?.l ?? 55),
});

const ThemeSettings = () => {
	const { profile, profileMutate } = useAdmin();
	const [loading, setLoading] = useState(false);
	const [target, setTarget] = useState<TThemeTarget>("admin");
	const [adminTheme, setAdminTheme] = useState<TThemeForm>(toThemeForm());
	const [frontendTheme, setFrontendTheme] = useState<TThemeForm>(toThemeForm());
	const [readyTheme, setReadyTheme] = useState<TThemeForm>(toThemeForm());

	useEffect(() => {
		setAdminTheme(toThemeForm(profile?.themeAdmin ?? profile?.themeColor));
		setFrontendTheme(toThemeForm(profile?.themeFrontend ?? profile?.themeColor));
		setReadyTheme(toThemeForm(profile?.themeReady ?? profile?.themeColor));
	}, [profile?.themeAdmin, profile?.themeFrontend, profile?.themeReady, profile?.themeColor]);

	const activeTheme = useMemo(() => {
		if (target === "frontend") return frontendTheme;
		if (target === "ready") return readyTheme;
		return adminTheme;
	}, [target, adminTheme, frontendTheme, readyTheme]);

	const setActiveTheme = (next: TThemeForm) => {
		if (target === "frontend") return setFrontendTheme(next);
		if (target === "ready") return setReadyTheme(next);
		return setAdminTheme(next);
	};

	const onSave = async () => {
		setLoading(true);
		const req = await fetch("/api/admin/theme", {
			method: "POST",
			body: JSON.stringify({ target, themeColor: activeTheme }),
		});
		const res = await req.json();
		if (res?.status !== 200) toast.error(res?.message);
		else toast.success(res?.message);
		await profileMutate();
		setLoading(false);
	};

	return (
		<div className="themeSettings">
			<div className="colorHeader">
				<h1 className="heading">
					Theme <span>Settings</span>
				</h1>
			</div>
			<div className="themeTargetActions">
				<Button type={target === "admin" ? "primary" : "secondary"} size="mini" label="Admin" onClick={() => setTarget("admin")} />
				<Button type={target === "frontend" ? "primary" : "secondary"} size="mini" label="Frontend" onClick={() => setTarget("frontend")} />
				<Button type={target === "ready" ? "primary" : "secondary"} size="mini" label="Order Ready" onClick={() => setTarget("ready")} />
			</div>
			<div className="hslEditor">
				<label>
					<span>Hue</span>
					<input type="number" min={0} max={360} value={activeTheme.h} onChange={(e) => setActiveTheme({ ...activeTheme, h: Number(e.target.value) })} />
				</label>
				<label>
					<span>Saturation</span>
					<input type="number" min={0} max={100} value={activeTheme.s} onChange={(e) => setActiveTheme({ ...activeTheme, s: Number(e.target.value) })} />
				</label>
				<label>
					<span>Lightness</span>
					<input type="number" min={0} max={100} value={activeTheme.l} onChange={(e) => setActiveTheme({ ...activeTheme, l: Number(e.target.value) })} />
				</label>
				<div className="preview" style={{ background: `hsl(${activeTheme.h} ${activeTheme.s}% ${activeTheme.l}%)` }} />
			</div>
			<div className="themeActions">
				<Button icon="f00c" iconType="solid" label={`Save ${target} theme`} loading={loading} onClick={onSave} />
			</div>
		</div>
	);
};

export default ThemeSettings;
