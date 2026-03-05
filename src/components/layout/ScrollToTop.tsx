"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

const PRESERVE_SCROLL_PATHNAMES = new Set<string>([]);

export default function ScrollToTop() {
	const pathname = usePathname();
	const previousPathname = useRef<string | null>(null);

	useEffect(() => {
		if (!pathname) return;

		if (previousPathname.current === null) {
			previousPathname.current = pathname;
			return;
		}

		if (previousPathname.current !== pathname && !PRESERVE_SCROLL_PATHNAMES.has(pathname)) {
			window.scrollTo({ top: 0, left: 0, behavior: "auto" });
		}

		previousPathname.current = pathname;
	}, [pathname]);

	return null;
}
