import { Suspense } from "react";
import ResultsPage from "./results-page";

// nuqs reads search params on the client, so the static shell needs a Suspense boundary.
export default function Page() {
	return (
		<Suspense fallback={<div className="min-h-screen bg-background" />}>
			<ResultsPage />
		</Suspense>
	);
}
