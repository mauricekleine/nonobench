import { Suspense } from "react";
import { DefaultResultsPage, UrlResultsPage } from "./results-page-url";

// nuqs reads search params on the client, so the URL-bound page sits in a
// Suspense boundary whose fallback is the fully rendered default view.
export default function Page() {
	return (
		<Suspense fallback={<DefaultResultsPage />}>
			<UrlResultsPage />
		</Suspense>
	);
}
