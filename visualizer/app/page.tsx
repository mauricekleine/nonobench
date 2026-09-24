import { connection } from "next/server";
import { Suspense } from "react";
import ResultsPage from "./results-page";

export default async function Page() {
	await connection();
	return (
		<Suspense fallback={<div className="min-h-screen bg-background" />}>
			<ResultsPage />
		</Suspense>
	);
}
