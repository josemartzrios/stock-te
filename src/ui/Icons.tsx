import type { ReactNode, SVGProps } from 'react';

// Set de iconos de linea, 24x24, heredan color y tamano del contexto.
// Sustituyen a los emojis de la v1: se ven consistentes en iOS y Android,
// respetan el color del tema y no cambian de estilo entre versiones del SO.

type Props = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 22, children, ...rest }: Props & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const IconCasa = (p: Props) => (
  <Svg {...p}>
    <path d="M3.5 10.5 12 3.5l8.5 7" />
    <path d="M5.5 9.5V20h13V9.5" />
    <path d="M9.75 20v-5.5h4.5V20" />
  </Svg>
);

export const IconHistorial = (p: Props) => (
  <Svg {...p}>
    <path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1" />
    <path d="M3.5 4.5V9H8" />
    <path d="M12 7.5V12l3 1.8" />
  </Svg>
);

export const IconAjustes = (p: Props) => (
  <Svg {...p}>
    <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
    <circle cx="15" cy="7" r="2.2" />
    <circle cx="9" cy="17" r="2.2" />
  </Svg>
);

export const IconBotella = (p: Props) => (
  <Svg {...p}>
    <path d="M10 2.5h4" />
    <path d="M10.6 2.5v3c0 .7-.25 1.35-.7 1.85L8.6 8.9A3.6 3.6 0 0 0 7.7 11.3V19a2.5 2.5 0 0 0 2.5 2.5h3.6a2.5 2.5 0 0 0 2.5-2.5v-7.7c0-.9-.32-1.75-.9-2.4l-1.3-1.55a2.8 2.8 0 0 1-.7-1.85v-3" />
    <path d="M7.7 13.2h8.6" />
  </Svg>
);

export const IconCarrito = (p: Props) => (
  <Svg {...p}>
    <path d="M2.75 3.5h2.1l2.1 10.4h9.9" />
    <path d="M6.4 6.6h14.05l-1.5 6.2" />
    <circle cx="9" cy="19" r="1.5" />
    <circle cx="17" cy="19" r="1.5" />
  </Svg>
);

export const IconConteo = (p: Props) => (
  <Svg {...p}>
    <path d="M9 4.5H7.5a2 2 0 0 0-2 2V19a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V6.5a2 2 0 0 0-2-2H15" />
    <rect x="9" y="2.75" width="6" height="3.5" rx="1.2" />
    <path d="M9 12.5l2 2 4-4" />
    <path d="M9 17.5h6" />
  </Svg>
);

export const IconAlerta = (p: Props) => (
  <Svg {...p}>
    <path d="M10.6 3.9 2.9 17.2A1.6 1.6 0 0 0 4.3 19.6h15.4a1.6 1.6 0 0 0 1.4-2.4L13.4 3.9a1.6 1.6 0 0 0-2.8 0Z" />
    <path d="M12 9v4" />
    <path d="M12 16.3h.01" />
  </Svg>
);

export const IconCheck = (p: Props) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8.2 12.4l2.6 2.6 5-5.4" />
  </Svg>
);

export const IconAtras = (p: Props) => (
  <Svg {...p}>
    <path d="M14.5 5.5 8 12l6.5 6.5" />
  </Svg>
);

export const IconChevron = (p: Props) => (
  <Svg {...p}>
    <path d="M9.5 5.5 16 12l-6.5 6.5" />
  </Svg>
);

export const IconMas = (p: Props) => (
  <Svg {...p} strokeWidth={2.4}>
    <path d="M12 5.5v13M5.5 12h13" />
  </Svg>
);

export const IconMenos = (p: Props) => (
  <Svg {...p} strokeWidth={2.4}>
    <path d="M5.5 12h13" />
  </Svg>
);

export const IconExportar = (p: Props) => (
  <Svg {...p}>
    <path d="M12 3.5v11" />
    <path d="M8 7.5 12 3.5l4 4" />
    <path d="M4.5 14.5V18a2.5 2.5 0 0 0 2.5 2.5h10a2.5 2.5 0 0 0 2.5-2.5v-3.5" />
  </Svg>
);

export const IconImportar = (p: Props) => (
  <Svg {...p}>
    <path d="M12 14.5v-11" />
    <path d="M8 10.5 12 14.5l4-4" />
    <path d="M4.5 14.5V18a2.5 2.5 0 0 0 2.5 2.5h10a2.5 2.5 0 0 0 2.5-2.5v-3.5" />
  </Svg>
);

export const IconEtiqueta = (p: Props) => (
  <Svg {...p}>
    <path d="M3.5 12.6V5.6a2 2 0 0 1 2-2h7c.53 0 1.04.21 1.41.59l6 6a2 2 0 0 1 0 2.83l-7 7a2 2 0 0 1-2.83 0l-6-6a2 2 0 0 1-.58-1.42Z" />
    <path d="M8 8h.01" />
  </Svg>
);

export const IconCaja = (p: Props) => (
  <Svg {...p}>
    <path d="M20.5 8.2v7.6a2 2 0 0 1-1.05 1.76l-6.5 3.5a2 2 0 0 1-1.9 0l-6.5-3.5A2 2 0 0 1 3.5 15.8V8.2a2 2 0 0 1 1.05-1.76l6.5-3.5a2 2 0 0 1 1.9 0l6.5 3.5A2 2 0 0 1 20.5 8.2Z" />
    <path d="M3.8 7.2 12 11.6l8.2-4.4" />
    <path d="M12 11.6V21" />
  </Svg>
);

export const IconRayo = (p: Props) => (
  <Svg {...p}>
    <path d="M13.2 2.5 4.8 13.2h6L10 21.5l8.5-10.7h-6l.7-8.3Z" />
  </Svg>
);

export const IconHielo = (p: Props) => (
  <Svg {...p}>
    <path d="M12 2.5v19M3.8 7.25l16.4 9.5M3.8 16.75l16.4-9.5" />
    <path d="m9.5 4 2.5 2 2.5-2M9.5 20l2.5-2 2.5 2" />
    <path d="m4.6 10.4 3-.9-.6-3.1M19.4 13.6l-3 .9.6 3.1M7 17.6l.6-3.1-3-.9M17 6.4l-.6 3.1 3 .9" />
  </Svg>
);
