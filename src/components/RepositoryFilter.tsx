const UNCATEGORIZED_PARAM = "__uncategorized__";

export function RepositoryFilter({
	repositories,
	currentRepo,
	hasUncategorized,
}: {
	repositories: string[];
	currentRepo: string | null | undefined;
	hasUncategorized: boolean;
}) {
	// リポジトリリストが空かつ未分類もなければ非表示
	if (repositories.length === 0 && !hasUncategorized) return null;

	const isAll = currentRepo === undefined;

	return (
		<section class="mb-6">
			<h2 class="text-lg font-semibold mb-3">Repository</h2>
			<nav class="flex flex-wrap gap-2" aria-label="Repository filter">
				<a
					href="/"
					aria-current={isAll ? "page" : undefined}
					class={`px-3 py-1 rounded-full text-sm transition-colors ${
						isAll
							? "bg-blue-900 text-blue-300"
							: "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-300"
					}`}
				>
					All
				</a>
				{repositories.map((repo) => (
					<a
						key={repo}
						href={`/?repo=${encodeURIComponent(repo)}`}
						aria-current={currentRepo === repo ? "page" : undefined}
						class={`px-3 py-1 rounded-full text-sm transition-colors ${
							currentRepo === repo
								? "bg-blue-900 text-blue-300"
								: "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-300"
						}`}
					>
						{repo}
					</a>
				))}
				{hasUncategorized && (
					<a
						href={`/?repo=${UNCATEGORIZED_PARAM}`}
						aria-current={currentRepo === null ? "page" : undefined}
						class={`px-3 py-1 rounded-full text-sm transition-colors ${
							currentRepo === null
								? "bg-blue-900 text-blue-300"
								: "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-300"
						}`}
					>
						未分類
					</a>
				)}
			</nav>
		</section>
	);
}
