import type { Child } from "hono/jsx";

export function Layout({ children }: { children: Child }) {
	return (
		<html lang="ja">
			<head>
				<meta charset="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<title>CC Dashboard</title>
				<script src="https://cdn.tailwindcss.com" />
			</head>
			<body class="bg-gray-50 text-gray-900 min-h-screen">
				<header class="bg-white border-b border-gray-200 px-6 py-4">
					<h1 class="text-xl font-bold">CC Dashboard</h1>
					<p class="text-sm text-gray-500">Claude Code OpenTelemetry Viewer</p>
				</header>
				<main class="max-w-7xl mx-auto px-4 py-6 flex flex-col gap-8">
					{children}
				</main>
			</body>
		</html>
	);
}
