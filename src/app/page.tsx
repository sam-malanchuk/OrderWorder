import { DashboardProvider } from "#components/context";
import JsonLd from "#components/seo/JsonLd";
import { getDefaultRestaurantID } from "#utils/database/helper/getDefaultRestaurantID";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "#utils/seo/constants";
import { buildMetadata } from "#utils/seo/metadata";
import PageContainer from "./_homepage/PageContainer";

export const metadata = buildMetadata({
	title: "Contactless Restaurant Ordering & AI-Powered Dining",
	description: SITE_DESCRIPTION,
	path: "/",
});

export default async function Homepage() {
	const defaultRestaurantID = await getDefaultRestaurantID();
	return (
		<DashboardProvider>
			<JsonLd
				data={{
					"@context": "https://schema.org",
					"@type": "WebApplication",
					name: SITE_NAME,
					url: SITE_URL,
					description: SITE_DESCRIPTION,
					applicationCategory: "BusinessApplication",
					operatingSystem: "Web",
					offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
					publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
				}}
			/>
			<PageContainer defaultRestaurantID={defaultRestaurantID} />
		</DashboardProvider>
	);
}
