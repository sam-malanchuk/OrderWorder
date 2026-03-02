import type { ReactNode } from "react";
import { themeController } from "xtreme-ui";

import { getThemeColor } from "#utils/database/helper/getThemeColor";

export default async function OrderReadyLayout({ children, params }: { children?: ReactNode; params: Promise<{ restaurant: string }> }) {
	const themeColor = await getThemeColor((await params).restaurant, "ready");
	return (
		<>
			<script dangerouslySetInnerHTML={{ __html: themeController({ color: themeColor }) }} suppressHydrationWarning />
			{children}
		</>
	);
}
