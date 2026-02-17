import {
	formatCost,
	formatDuration,
	formatDurationMs,
	formatTime,
	formatTokens,
} from "../lib/format";
import type { SessionInfo, TimelineEvent } from "../queries/session";

function Badge({
	label,
	color,
}: {
	label: string;
	color: "green" | "red" | "yellow" | "blue" | "gray";
}) {
	const colors = {
		green: "bg-green-900 text-green-300 border-green-700",
		red: "bg-red-900 text-red-300 border-red-700",
		yellow: "bg-yellow-900 text-yellow-300 border-yellow-700",
		blue: "bg-blue-900 text-blue-300 border-blue-700",
		gray: "bg-gray-800 text-gray-300 border-gray-600",
	};
	return (
		<span
			class={`inline-block px-2 py-0.5 text-xs font-medium rounded border ${colors[color]}`}
		>
			{label}
		</span>
	);
}

function EventLabel({
	label,
	color,
}: {
	label: string;
	color: "green" | "red" | "yellow" | "blue";
}) {
	const colors = {
		green: "text-green-400",
		red: "text-red-400",
		yellow: "text-yellow-400",
		blue: "text-blue-400",
	};
	return (
		<span class={`text-xs font-semibold uppercase ${colors[color]}`}>
			{label}
		</span>
	);
}

function tryParseCommand(toolParameters: string | null): string | null {
	if (!toolParameters) return null;
	try {
		const parsed = JSON.parse(toolParameters);
		return typeof parsed.command === "string" ? parsed.command : null;
	} catch {
		return null;
	}
}

function UserPromptCard(
	event: Extract<TimelineEvent, { type: "user_prompt" }>,
) {
	return (
		<div class="bg-gray-900 border border-gray-700 rounded-lg p-4">
			<div class="flex items-center justify-between mb-2">
				<EventLabel label="User Prompt" color="blue" />
				<span class="text-xs text-gray-500">
					{formatTime(event.timestampMs)}
				</span>
			</div>
			<p class="text-sm text-gray-300">{event.promptLength} characters</p>
			{event.prompt && (
				<details class="mt-2">
					<summary class="text-xs text-gray-400 cursor-pointer hover:text-gray-300">
						Show prompt
					</summary>
					<pre class="mt-2 text-xs text-gray-300 bg-gray-800 rounded p-3 overflow-x-auto whitespace-pre-wrap break-words">
						{event.prompt}
					</pre>
				</details>
			)}
		</div>
	);
}

function ApiRequestCard(
	event: Extract<TimelineEvent, { type: "api_request" }>,
) {
	return (
		<div class="bg-gray-900 border border-gray-700 rounded-lg p-4">
			<div class="flex items-center justify-between mb-2">
				<EventLabel label="API Request" color="green" />
				<span class="text-xs text-gray-500">
					{formatTime(event.timestampMs)}
				</span>
			</div>
			<div class="flex flex-wrap gap-3 text-sm">
				<span class="text-gray-300 font-mono text-xs">{event.model}</span>
				<span class="text-gray-300 tabular-nums">
					{formatCost(event.costUsd)}
				</span>
				<span class="text-gray-300 tabular-nums">
					{formatDurationMs(event.durationMs)}
				</span>
			</div>
			<div class="mt-2 flex flex-wrap gap-3 text-xs text-gray-400 tabular-nums">
				<span>In: {formatTokens(event.inputTokens)}</span>
				<span>Out: {formatTokens(event.outputTokens)}</span>
				{event.cacheReadTokens > 0 && (
					<span>Cache read: {formatTokens(event.cacheReadTokens)}</span>
				)}
				{event.cacheCreationTokens > 0 && (
					<span>Cache create: {formatTokens(event.cacheCreationTokens)}</span>
				)}
			</div>
		</div>
	);
}

function ToolResultCard(
	event: Extract<TimelineEvent, { type: "tool_result" }>,
) {
	const command =
		event.toolName === "Bash" ? tryParseCommand(event.toolParameters) : null;

	return (
		<div class="bg-gray-900 border border-gray-700 rounded-lg p-4">
			<div class="flex items-center justify-between mb-2">
				<EventLabel
					label="Tool Result"
					color={event.success ? "green" : "red"}
				/>
				<span class="text-xs text-gray-500">
					{formatTime(event.timestampMs)}
				</span>
			</div>
			<div class="flex items-center gap-3 text-sm">
				<span class="text-gray-300 font-mono text-xs">{event.toolName}</span>
				<Badge
					label={event.success ? "success" : "failed"}
					color={event.success ? "green" : "red"}
				/>
				<span class="text-gray-400 text-xs tabular-nums">
					{formatDurationMs(event.durationMs)}
				</span>
			</div>
			{command && (
				<pre class="mt-2 text-xs text-gray-300 bg-gray-800 rounded p-3 overflow-x-auto whitespace-pre-wrap break-words">
					$ {command}
				</pre>
			)}
			{event.error && (
				<p class="mt-2 text-xs text-red-400 bg-red-900/30 rounded p-2">
					{event.error}
				</p>
			)}
		</div>
	);
}

function ToolDecisionCard(
	event: Extract<TimelineEvent, { type: "tool_decision" }>,
) {
	const isAccept = event.decision === "accept";
	return (
		<div class="bg-gray-900 border border-gray-700 rounded-lg p-4">
			<div class="flex items-center justify-between mb-2">
				<EventLabel label="Tool Decision" color="yellow" />
				<span class="text-xs text-gray-500">
					{formatTime(event.timestampMs)}
				</span>
			</div>
			<div class="flex items-center gap-3 text-sm">
				<span class="text-gray-300 font-mono text-xs">{event.toolName}</span>
				<Badge label={event.decision} color={isAccept ? "green" : "red"} />
				{event.source && (
					<span class="text-gray-400 text-xs">{event.source}</span>
				)}
			</div>
		</div>
	);
}

function ApiErrorCard(event: Extract<TimelineEvent, { type: "api_error" }>) {
	return (
		<div class="bg-gray-900 border border-red-800 rounded-lg p-4">
			<div class="flex items-center justify-between mb-2">
				<EventLabel label="API Error" color="red" />
				<span class="text-xs text-gray-500">
					{formatTime(event.timestampMs)}
				</span>
			</div>
			<div class="flex flex-wrap items-center gap-3 text-sm">
				{event.model && (
					<span class="text-gray-300 font-mono text-xs">{event.model}</span>
				)}
				{event.statusCode && (
					<Badge label={String(event.statusCode)} color="red" />
				)}
				<span class="text-gray-400 text-xs tabular-nums">
					{formatDurationMs(event.durationMs)}
				</span>
				<span class="text-gray-400 text-xs tabular-nums">
					attempt #{event.attempt}
				</span>
			</div>
			<p class="mt-2 text-xs text-red-400 bg-red-900/30 rounded p-2">
				{event.error}
			</p>
		</div>
	);
}

function EventCard({ event }: { event: TimelineEvent }) {
	switch (event.type) {
		case "user_prompt":
			return <UserPromptCard {...event} />;
		case "api_request":
			return <ApiRequestCard {...event} />;
		case "tool_result":
			return <ToolResultCard {...event} />;
		case "tool_decision":
			return <ToolDecisionCard {...event} />;
		case "api_error":
			return <ApiErrorCard {...event} />;
	}
}

export function SessionTimeline({
	session,
	events,
}: {
	session: SessionInfo;
	events: TimelineEvent[];
}) {
	return (
		<section>
			<div class="mb-6">
				<div class="flex items-center gap-3 mb-2">
					<a href="/" class="text-sm text-blue-400 hover:text-blue-300">
						Dashboard
					</a>
					<span class="text-gray-600">/</span>
					<span class="text-sm text-gray-400">Session</span>
				</div>
				<h2 class="text-lg font-semibold mb-1">Session Detail</h2>
				<div class="flex flex-wrap gap-4 text-sm text-gray-400">
					<span class="font-mono text-xs">{session.sessionId}</span>
					{session.repository && <span>{session.repository}</span>}
					<span>
						{formatDuration(session.firstEventAt, session.lastEventAt)}
					</span>
					<span>{formatTime(session.firstEventAt)}</span>
				</div>
			</div>

			{events.length === 0 ? (
				<p class="text-gray-400 text-sm">No events found.</p>
			) : (
				<div class="flex flex-col gap-3">
					<p class="text-sm text-gray-500">{events.length} events</p>
					{events.map((event) => (
						<EventCard
							key={`${event.type}-${event.eventSequence ?? event.timestampMs}`}
							event={event}
						/>
					))}
				</div>
			)}
		</section>
	);
}
