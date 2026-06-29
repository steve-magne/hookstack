"use client";

import { ArrowUpRight, Check, Plus, X, Zap } from "lucide-react";
import { AnimatePresence, m, type PanInfo } from "motion/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { track } from "@/lib/analytics";
import { useT } from "@/lib/locale-context";
import { spring } from "@/lib/motion";
import { useSelection } from "@/store/selection";
import type { Hook } from "@/types/hook";
import { CategoryBadge, HookTypeBadge } from "./Badge";
import { Button } from "./Button";
import { CopySwap } from "./CopySwap";

function useIsMobile() {
	const [isMobile, setIsMobile] = useState(false);
	useEffect(() => {
		const mq = window.matchMedia("(max-width: 639px)");
		const update = () => setIsMobile(mq.matches);
		update();
		mq.addEventListener("change", update);
		return () => mq.removeEventListener("change", update);
	}, []);
	return isMobile;
}

export function HookModal({
	hook,
	onClose,
}: {
	hook: Hook;
	onClose: () => void;
}) {
	const T = useT();
	const selected = useSelection((s) => s.selected.includes(hook.slug));
	const toggle = useSelection((s) => s.toggle);
	const [copied, setCopied] = useState(false);
	const isMobile = useIsMobile();

	const settingsFragment = JSON.stringify(hook.implementation.config, null, 2);

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		document.addEventListener("keydown", onKey);
		document.body.style.overflow = "hidden";
		return () => {
			document.removeEventListener("keydown", onKey);
			document.body.style.overflow = "";
		};
	}, [onClose]);

	const copyFragment = async () => {
		track("copy_settings_fragment", {
			hook_slug: hook.slug,
			hook_name: hook.name,
			source: "modal",
		});
		try {
			await navigator.clipboard.writeText(settingsFragment);
		} catch {
			/* presse-papiers indisponible */
		}
		setCopied(true);
		setTimeout(() => setCopied(false), 1500);
	};

	const sheet = isMobile
		? { initial: { y: "100%" }, animate: { y: 0 }, exit: { y: "100%" } }
		: {
				initial: { opacity: 0, y: 16, scale: 0.98 },
				animate: { opacity: 1, y: 0, scale: 1 },
				exit: { opacity: 0, y: 16, scale: 0.98 },
			};

	const handleDragEnd = (_e: unknown, info: PanInfo) => {
		if (info.offset.y > 120 || info.velocity.y > 600) onClose();
	};

	return (
		<m.div
			data-component="HookModal-overlay"
			onClick={onClose}
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
			transition={{ duration: 0.2 }}
			className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
		>
			{/* HookModal-dialog */}
			<m.div
				data-component="HookModal-dialog"
				role="dialog"
				aria-modal="true"
				aria-label={hook.name}
				onClick={(e) => e.stopPropagation()}
				initial={sheet.initial}
				animate={sheet.animate}
				exit={sheet.exit}
				transition={spring.smooth}
				drag={isMobile ? "y" : false}
				dragConstraints={{ top: 0, bottom: 0 }}
				dragElastic={{ top: 0, bottom: 0.5 }}
				onDragEnd={handleDragEnd}
				className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl shadow-black/60 sm:rounded-2xl"
			>
				{/* HookModal-drag-handle — mobile only */}
				<div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-zinc-600 sm:hidden" />

				{/* HookModal-close */}
				<button
					type="button"
					data-component="HookModal-close"
					onClick={onClose}
					aria-label={T.close}
					className="absolute right-4 top-4 z-10 flex size-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-[var(--color-surface-2)] hover:text-white"
				>
					<X className="size-4" />
				</button>

				{/* HookModal-body */}
				<div data-component="HookModal-body" className="overflow-y-auto p-6">
					{/* HookModal-badges */}
					<div className="mb-4 flex flex-wrap items-center gap-2 pr-8">
						<CategoryBadge category={hook.category} />
						<HookTypeBadge type={hook.hook_type} trigger={hook.trigger} />
					</div>

					<h2 className="mb-2 text-2xl font-bold text-white">{hook.name}</h2>
					{/* HookModal-benefit */}
					{hook.benefit && (
						<div
							data-component="HookModal-benefit"
							className="mb-3 flex items-start gap-2.5 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5"
						>
							<span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-lg bg-white/10 text-zinc-200 ring-1 ring-inset ring-white/15">
								<Zap className="size-3.5" fill="currentColor" strokeWidth={0} />
							</span>
							<p className="text-[15px] font-semibold leading-snug text-white">
								{hook.benefit}
							</p>
						</div>
					)}
					<p className="mb-5 text-zinc-300">{hook.description}</p>

					{/* HookModal-actions */}
					<div className="mb-6 flex flex-wrap items-center gap-3">
						<m.button
							whileTap={{ scale: 0.96 }}
							onClick={() => toggle(hook.slug)}
							className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
								selected
									? "bg-white/10 text-white ring-1 ring-inset ring-white/25"
									: "bg-white text-zinc-900 hover:bg-zinc-100"
							}`}
						>
							<span
								className="relative inline-flex"
								style={{ width: "1em", height: "1em" }}
							>
								<AnimatePresence mode="wait" initial={false}>
									<m.span
										key={selected ? "check" : "plus"}
										initial={{ opacity: 0, scale: 0.5, rotate: -90 }}
										animate={{ opacity: 1, scale: 1, rotate: 0 }}
										exit={{ opacity: 0, scale: 0.5, rotate: 90 }}
										transition={spring.snappy}
										className="absolute inset-0 inline-flex items-center justify-center"
									>
										{selected ? (
											<Check className="size-4" />
										) : (
											<Plus className="size-4" />
										)}
									</m.span>
								</AnimatePresence>
							</span>
							{selected ? T.addedToSelection : T.addToMyConfig}
						</m.button>
						<Link
							href={`/hook/${hook.slug}`}
							onClick={() =>
								track("view_full_page", {
									hook_slug: hook.slug,
									hook_name: hook.name,
								})
							}
							className="flex items-center gap-1.5 text-sm text-zinc-400 transition-colors hover:text-white"
						>
							{T.viewFullPage}
							<ArrowUpRight className="size-3.5" />
						</Link>
					</div>

					{/* HookModal-details-grid */}
					<div
						data-component="HookModal-details-grid"
						className="grid gap-6 sm:grid-cols-2"
					>
						{/* HookModal-use-cases */}
						<div data-component="HookModal-use-cases">
							<h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-400">
								{T.useCases}
							</h3>
							<ul className="space-y-1.5 text-sm text-zinc-300">
								{hook.use_cases.map((u) => (
									<li key={u} className="flex items-start gap-2">
										<span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-white/60" />
										{u}
									</li>
								))}
							</ul>
						</div>
						<div>
							<h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-400">
								{T.tags}
							</h3>
							<div className="flex flex-wrap gap-1.5">
								{hook.tags.map((t) => (
									<span key={t} className="text-xs text-zinc-400">
										#{t}
									</span>
								))}
							</div>
						</div>
					</div>

					{/* HookModal-settings-fragment */}
					<div data-component="HookModal-settings-fragment" className="mt-6">
						<div className="mb-2 flex items-center justify-between">
							<h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
								{T.settingsFragment}
							</h3>
							<Button variant="surface" size="sm" onClick={copyFragment}>
								<CopySwap copied={copied} />
								{copied ? T.copied : T.copy}
							</Button>
						</div>
						<pre className="max-h-72 overflow-auto rounded-xl border border-[var(--color-border)] bg-[#0d0d14] p-4 text-xs text-zinc-200">
							<code>{settingsFragment}</code>
						</pre>
					</div>

					{/* HookModal-code-snippet */}
					{hook.implementation.code_snippet && (
						<div data-component="HookModal-code-snippet" className="mt-6">
							<h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-400">
								Script · {hook.implementation.script_path}
							</h3>
							<pre className="max-h-72 overflow-auto rounded-xl border border-[var(--color-border)] bg-[#0d0d14] p-4 text-xs text-zinc-200">
								<code>{hook.implementation.code_snippet}</code>
							</pre>
						</div>
					)}
				</div>
			</m.div>
		</m.div>
	);
}
