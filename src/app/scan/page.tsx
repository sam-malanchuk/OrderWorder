import { themeController } from "xtreme-ui";
import { DEFAULT_THEME_COLOR } from "#utils/constants/common";
import ScannerClient from "./ScannerClient";

export default async function ScanPage() {
	const color = DEFAULT_THEME_COLOR;

	return (
		<>
			<script dangerouslySetInnerHTML={{ __html: themeController({ color }) }} suppressHydrationWarning />
			<ScannerClient />
		</>
	);
}
