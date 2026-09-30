import { ClientOnly, createFileRoute } from "@tanstack/react-router";

import { DefaultResultsPage, UrlResultsPage } from "../results-page-url";

// The page is prerendered with the default view. The URL-bound view takes
// over in the browser, where the filters in the query string are known.
export const Route = createFileRoute("/")({
	component: () => (
		<ClientOnly fallback={<DefaultResultsPage />}>
			<UrlResultsPage />
		</ClientOnly>
	),
});
