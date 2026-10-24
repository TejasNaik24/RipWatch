import type { ReactNode, SVGProps } from "react";

// One stroke icon set for the whole app: 24px grid, 1.75 stroke, round joins.
type IconProps = Omit<SVGProps<SVGSVGElement>, "children"> & { size?: number; title?: string };

function Icon({ size = 20, title, children, ...rest }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      {...rest}
    >
      {title && <title>{title}</title>}
      {children}
    </svg>
  );
}

export const IconCamera = (p: IconProps) => (
  <Icon {...p}>
    <rect x="2.5" y="6" width="13" height="12" rx="2" />
    <path d="m15.5 10.2 5-2.9a.6.6 0 0 1 .9.5v8.4a.6.6 0 0 1-.9.5l-5-2.9" />
  </Icon>
);

export const IconCameraOff = (p: IconProps) => (
  <Icon {...p}>
    <path d="M9 6h4.5a2 2 0 0 1 2 2v4.2" />
    <path d="m15.5 10.2 5-2.9a.6.6 0 0 1 .9.5v8.4a.6.6 0 0 1-.6.6" />
    <path d="M15.5 17.4V16a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2V8a2 2 0 0 1 1.6-2" />
    <path d="m3 3 18 18" />
  </Icon>
);

export const IconAlert = (p: IconProps) => (
  <Icon {...p}>
    <path d="M10.3 4 2.6 17.4A2 2 0 0 0 4.3 20.4h15.4a2 2 0 0 0 1.7-3L13.7 4a2 2 0 0 0-3.4 0z" />
    <path d="M12 9.5v4" />
    <path d="M12 17h.01" />
  </Icon>
);

export const IconClear = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="m8.6 12.2 2.3 2.3 4.5-4.7" />
  </Icon>
);

export const IconCheck = (p: IconProps) => (
  <Icon {...p}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Icon>
);

export const IconPlay = (p: IconProps) => (
  <Icon {...p}>
    <path d="M7.5 5.2v13.6a.8.8 0 0 0 1.2.7l10.6-6.8a.8.8 0 0 0 0-1.4L8.7 4.5a.8.8 0 0 0-1.2.7z" />
  </Icon>
);

export const IconPause = (p: IconProps) => (
  <Icon {...p}>
    <rect x="6.5" y="5" width="3.5" height="14" rx="1" />
    <rect x="14" y="5" width="3.5" height="14" rx="1" />
  </Icon>
);

export const IconRestart = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 12a8 8 0 1 0 2.4-5.7L4 8.6" />
    <path d="M4 4v4.6h4.6" />
  </Icon>
);

export const IconInfo = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 11v5" />
    <path d="M12 8h.01" />
  </Icon>
);

export const IconWaves = (p: IconProps) => (
  <Icon {...p}>
    <path d="M2.5 9.5c1.6 0 2.4-1.5 4-1.5s2.4 1.5 4 1.5 2.4-1.5 4-1.5 2.4 1.5 4 1.5 1.9-.8 3-1.3" />
    <path d="M2.5 15c1.6 0 2.4-1.5 4-1.5s2.4 1.5 4 1.5 2.4-1.5 4-1.5 2.4 1.5 4 1.5 1.9-.8 3-1.3" />
  </Icon>
);

export const IconFrames = (p: IconProps) => (
  <Icon {...p}>
    <rect x="2.5" y="6" width="5.5" height="12" rx="1.2" />
    <rect x="9.25" y="6" width="5.5" height="12" rx="1.2" />
    <rect x="16" y="6" width="5.5" height="12" rx="1.2" />
  </Icon>
);

// Viewfinder corners around a segmented region: "the model outlines what it finds".
export const IconModel = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 8V5.5A2.5 2.5 0 0 1 5.5 3H8" />
    <path d="M16 3h2.5A2.5 2.5 0 0 1 21 5.5V8" />
    <path d="M21 16v2.5a2.5 2.5 0 0 1-2.5 2.5H16" />
    <path d="M8 21H5.5A2.5 2.5 0 0 1 3 18.5V16" />
    <path d="m8.5 10 4-2.5 3.5 2.5-.5 4.5-4 2-3.5-2.5z" />
  </Icon>
);

// A jittery signal (faint) and the steady line drawn through it.
export const IconSmoothing = (p: IconProps) => (
  <Icon {...p}>
    <path d="m2.5 14 2.4-7 2.4 10 2.4-12 2.4 11 2.4-8 2.4 7 2.4-5 2.4 3" strokeOpacity={0.4} />
    <path d="M2.5 12c3-2.5 6 1.5 9.5 0s6.5-1.5 9.5-.5" strokeWidth={2} />
  </Icon>
);

export const IconBell = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 16.5V11a6 6 0 1 1 12 0v5.5l1.5 2h-15z" />
    <path d="M10 21a2 2 0 0 0 4 0" />
  </Icon>
);
