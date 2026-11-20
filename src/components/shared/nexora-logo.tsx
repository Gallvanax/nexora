import { cn } from "@/lib/utils";

export function NexoraLogo({
  className,
  showText = true,
  size = "md",
}: {
  className?: string;
  showText?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const iconSize = size === "sm" ? 26 : size === "lg" ? 36 : 32;
  const textSize = size === "sm" ? "text-base" : size === "lg" ? "text-xl" : "text-lg";

  return (
    <span className={cn("inline-flex items-center gap-2.5 select-none", className)}>
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        <defs>
          <linearGradient
            id="nexora-grad"
            x1="0"
            y1="0"
            x2="36"
            y2="36"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#7C3AED" />
            <stop offset="55%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#22D3EE" />
          </linearGradient>
        </defs>
        <rect x="2" y="2" width="32" height="32" rx="10" fill="url(#nexora-grad)" />
        <path
          d="M11 24.5V11.5L18.5 21.5L25 11.5V24.5"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="25" cy="11.5" r="2" fill="#22D3EE" />
      </svg>
      {showText ? (
        <span className={cn("font-bold tracking-tight text-foreground", textSize)}>
          NEX<span className="text-[#22D3EE]">ORA</span>
        </span>
      ) : null}
    </span>
  );
}
