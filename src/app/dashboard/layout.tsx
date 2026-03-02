/* eslint-disable react/no-danger */
import type { ReactNode } from "react";

import { themeController } from "xtreme-ui";

import { getThemeColor } from "#utils/database/helper/getThemeColor";

export const metadata = {
	title: "Admin",
};
export default async function RootLayout({ children }: IRootProps) {
	const themeColor = await getThemeColor(undefined, "admin");
	return (
		<>
			<head>
				<script dangerouslySetInnerHTML={{ __html: themeController({ color: themeColor }) }} suppressHydrationWarning />
			</head>
			<body suppressHydrationWarning>{children}</body>
		</>
	);
}

interface IRootProps {
	children?: ReactNode;
}
