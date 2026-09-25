"use client";

import { parseAsStringLiteral, useQueryState } from "nuqs";
import ResultsPage from "./results-page";

export function UrlResultsPage() {
	const [levels, setLevels] = useQueryState("levels", parseAsStringLiteral(["best", "all"]).withDefault("best"));
	return <ResultsPage levels={levels} onLevelsChange={(next) => void setLevels(next)} />;
}

// Rendered on the server (and before hydration) so crawlers and first paint get
// the full default view instead of an empty shell.
export function DefaultResultsPage() {
	return <ResultsPage levels="best" onLevelsChange={() => {}} />;
}
