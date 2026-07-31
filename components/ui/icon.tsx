import type { ReactNode, SVGProps } from "react";

export type IconName =
  | "activity"
  | "analytics"
  | "arrow-right"
  | "automation"
  | "check"
  | "customers"
  | "dashboard"
  | "email"
  | "inbox"
  | "knowledge"
  | "menu"
  | "settings"
  | "sparkles"
  | "team"
  | "warning"
  | "workflow"
  | "x";

const iconPaths: Record<IconName, ReactNode> = {
  activity: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h3l2.25-6 4.5 12 2.25-6h4.5" />
  ),
  analytics: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5v-6m5 6v-11m5 11v-8m5 8V4.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 19.5h18" />
    </>
  ),
  "arrow-right": (
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5 15.75 12l-7.5 7.5" />
  ),
  automation: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3.75v3m0 10.5v3m8.25-8.25h-3M6.75 12h-3" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m17.834 6.166-2.121 2.121M8.287 15.713l-2.121 2.121m11.668 0-2.121-2.121M8.287 8.287 6.166 6.166" />
      <circle cx="12" cy="12" r="3.25" />
    </>
  ),
  check: <path strokeLinecap="round" strokeLinejoin="round" d="m5 12.5 4.25 4.25L19 7" />,
  customers: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6.75a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 21a7.5 7.5 0 0 1 15 0" />
    </>
  ),
  dashboard: (
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
    </>
  ),
  email: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m4 7 8 6 8-6" />
    </>
  ),
  inbox: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 5.25h15l1.5 9.5v3.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3.5l1.5-9.5Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.25 14.75h5l1.5 2.25h4.5l1.5-2.25h5" />
    </>
  ),
  knowledge: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4.75A2.75 2.75 0 0 1 6.75 2H12v18.75H6.75A2.75 2.75 0 0 0 4 23.5V4.75Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 4.75A2.75 2.75 0 0 0 17.25 2H12v18.75h5.25A2.75 2.75 0 0 1 20 23.5V4.75Z" />
    </>
  ),
  menu: <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />,
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.82 2.82-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21h-4v-.1A1.7 1.7 0 0 0 8.5 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.82-2.82.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3v-4h.1A1.7 1.7 0 0 0 4.6 8.5a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.82-2.82.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3h4v.1A1.7 1.7 0 0 0 15.5 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.82 2.82-.06.06A1.7 1.7 0 0 0 19.4 9c.18.35.39.68.6 1 .26.31.64.5 1.05.5H21v4h-.1A1.7 1.7 0 0 0 19.4 15Z" />
    </>
  ),
  sparkles: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="m12 3 1.1 3.4a5.5 5.5 0 0 0 3.5 3.5L20 11l-3.4 1.1a5.5 5.5 0 0 0-3.5 3.5L12 19l-1.1-3.4a5.5 5.5 0 0 0-3.5-3.5L4 11l3.4-1.1a5.5 5.5 0 0 0 3.5-3.5L12 3Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m19 3 .45 1.35A2 2 0 0 0 20.65 5.55L22 6l-1.35.45a2 2 0 0 0-1.2 1.2L19 9l-.45-1.35a2 2 0 0 0-1.2-1.2L16 6l1.35-.45a2 2 0 0 0 1.2-1.2L19 3Z" />
    </>
  ),
  team: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.5 10.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM2.75 21a6.75 6.75 0 0 1 13.5 0" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 4.5a3 3 0 0 1 0 5.75M17 14.5A5.75 5.75 0 0 1 21.25 20" />
    </>
  ),
  warning: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.4 4.2 2.9 17.1A2 2 0 0 0 4.65 20h14.7a2 2 0 0 0 1.75-2.9L13.6 4.2a1.85 1.85 0 0 0-3.2 0Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 3h.01" />
    </>
  ),
  workflow: (
    <>
      <rect x="3" y="3" width="6" height="6" rx="1.5" />
      <rect x="15" y="15" width="6" height="6" rx="1.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 6h4a3 3 0 0 1 3 3v6M15 18h-4a3 3 0 0 1-3-3V9" />
    </>
  ),
  x: <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6 6 18" />,
};

export function Icon({
  name,
  className = "h-5 w-5",
  ...props
}: SVGProps<SVGSVGElement> & { name: IconName }) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
      className={className}
      {...props}
    >
      {iconPaths[name]}
    </svg>
  );
}
