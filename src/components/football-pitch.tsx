import { cn } from '@/lib/utils';

export default function FootballPitch({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 105 68"
      preserveAspectRatio="xMidYMid meet"
      className={cn("bg-green-600/20 dark:bg-green-800/20 rounded-lg", className)}
      {...props}
    >
      <g stroke="hsl(var(--foreground))" strokeOpacity="0.3" strokeWidth="0.5" fill="none">
        {/* Outer lines */}
        <rect x="0" y="0" width="105" height="68" />
        {/* Center line */}
        <line x1="52.5" y1="0" x2="52.5" y2="68" />
        {/* Center circle */}
        <circle cx="52.5" cy="34" r="9.15" />
        <circle cx="52.5" cy="34" r="0.5" fill="hsl(var(--foreground))" stroke="none"/>
        {/* Left penalty area */}
        <rect x="0" y="13.84" width="16.5" height="40.32" />
        <circle cx="11" cy="34" r="0.5" fill="hsl(var(--foreground))" stroke="none"/>
        <path d="M 16.5,24.84 A 9.15,9.15 0 0,1 16.5,43.16" />
        {/* Right penalty area */}
        <rect x="88.5" y="13.84" width="16.5" height="40.32" />
        <circle cx="94" cy="34" r="0.5" fill="hsl(var(--foreground))" stroke="none"/>
        <path d="M 88.5,24.84 A 9.15,9.15 0 0,0 88.5,43.16" />
        {/* Left goal area */}
        <rect x="0" y="24.84" width="5.5" height="18.32" />
        {/* Right goal area */}
        <rect x="99.5" y="24.84" width="5.5" height="18.32" />
        {/* Corner arcs */}
        <path d="M 0,1 A 1,1 0 0,1 1,0" />
        <path d="M 0,67 A 1,1 0 0,0 1,68" />
        <path d="M 104,0 A 1,1 0 0,1 105,1" />
        <path d="M 104,68 A 1,1 0 0,0 105,67" />
      </g>
    </svg>
  );
}
