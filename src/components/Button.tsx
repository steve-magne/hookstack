import type { ButtonHTMLAttributes } from "react";

type Variant = "ghost" | "surface";
type Size = "sm" | "md" | "lg";

const base =
	"inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors";

const variants: Record<Variant, string> = {
	ghost:
		"border border-white/30 text-white hover:border-white/60 hover:bg-white/5 active:bg-white/10",
	surface:
		"border border-zinc-600 bg-[var(--color-surface-2)] text-zinc-200 hover:border-zinc-500 hover:bg-[var(--color-surface-2)]/80",
};

const sizes: Record<Size, string> = {
	sm: "px-2.5 py-1   text-xs",
	md: "px-3.5 py-2   text-xs",
	lg: "px-4   py-2.5 text-sm",
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: Variant;
	size?: Size;
}

export function Button({
	variant = "ghost",
	size = "lg",
	className = "",
	...props
}: Props) {
	return (
		<button
			className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
			{...props}
		/>
	);
}
