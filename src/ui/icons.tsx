import type { ReactNode } from 'react';

// Einheitliches flaches Icon-Set (Stroke-basiert, 24er-Grid, erbt currentColor).
// Größe via `size`-Prop; Farbe folgt der Textfarbe des Buttons.
interface IconProps {
  size?: number;
}

function Svg({ size = 16, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      style={{ display: 'block', flexShrink: 0 }}
    >
      {children}
    </svg>
  );
}

export const IconLogo = (p: IconProps) => (
  <Svg {...p}>
    <path d="M2 3h20" />
    <path d="M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3" />
    <path d="m7 21 5-5 5 5" />
  </Svg>
);

export const IconHeading = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 4v16" />
    <path d="M18 4v16" />
    <path d="M6 12h12" />
  </Svg>
);

export const IconText = (p: IconProps) => (
  <Svg {...p}>
    <polyline points="4 7 4 4 20 4 20 7" />
    <line x1="9" y1="20" x2="15" y2="20" />
    <line x1="12" y1="4" x2="12" y2="20" />
  </Svg>
);

export const IconSquare = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
  </Svg>
);

export const IconCircle = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
  </Svg>
);

export const IconLine = (p: IconProps) => (
  <Svg {...p}>
    <line x1="5" y1="19" x2="19" y2="5" />
  </Svg>
);

export const IconTable = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <line x1="3" y1="9" x2="21" y2="9" />
    <line x1="3" y1="15" x2="21" y2="15" />
    <line x1="9" y1="3" x2="9" y2="21" />
    <line x1="15" y1="3" x2="15" y2="21" />
  </Svg>
);

export const IconImage = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <path d="m21 15-4.5-4.5L5 21" />
  </Svg>
);

export const IconUndo = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 7v6h6" />
    <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
  </Svg>
);

export const IconRedo = (p: IconProps) => (
  <Svg {...p}>
    <path d="M21 7v6h-6" />
    <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13" />
  </Svg>
);

export const IconPlus = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </Svg>
);

export const IconCopy = (p: IconProps) => (
  <Svg {...p}>
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </Svg>
);

export const IconTrash = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 6h18" />
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <path d="m19 6-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6" />
  </Svg>
);

export const IconPlay = (p: IconProps) => (
  <Svg {...p}>
    <polygon points="6 4 20 12 6 20 6 4" fill="currentColor" stroke="none" />
  </Svg>
);

export const IconAlignLeft = (p: IconProps) => (
  <Svg {...p}>
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="15" y2="12" />
    <line x1="3" y1="18" x2="18" y2="18" />
  </Svg>
);

export const IconAlignCenter = (p: IconProps) => (
  <Svg {...p}>
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="6" y1="12" x2="18" y2="12" />
    <line x1="4" y1="18" x2="20" y2="18" />
  </Svg>
);

export const IconAlignRight = (p: IconProps) => (
  <Svg {...p}>
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="9" y1="12" x2="21" y2="12" />
    <line x1="6" y1="18" x2="21" y2="18" />
  </Svg>
);

export const IconBringForward = (p: IconProps) => (
  <Svg {...p}>
    <rect x="8" y="3" width="13" height="13" rx="2" />
    <path d="M5 11v8a2 2 0 0 0 2 2h8" />
  </Svg>
);

export const IconMagnet = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 3v8a7 7 0 0 0 14 0V3" />
    <path d="M9 3v8a3 3 0 0 0 6 0V3" />
    <path d="M5 7h4" />
    <path d="M15 7h4" />
  </Svg>
);

export const IconPanelRight = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <line x1="15" y1="3" x2="15" y2="21" />
  </Svg>
);

export const IconSendBackward = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="8" width="13" height="13" rx="2" />
    <path d="M19 13V5a2 2 0 0 0-2-2H9" />
  </Svg>
);
