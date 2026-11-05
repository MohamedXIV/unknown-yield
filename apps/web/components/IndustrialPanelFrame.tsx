import type { ReactNode } from "react";

/**
 * One physical construction for the game's real UI.
 *
 * The interactive content is mounted inside four distinct physical layers:
 * formed steel -> brass inset -> paper/instrument surface -> live React content.
 * The supplied standalone HTML is a visual *reference*, not a source of fake
 * expedition state. None of the frame elements issues game commands.
 */
export type IndustrialPanelKind =
  | "inspect"
  | "terminal"
  | "notebook"
  | "menu"
  | "configuration"
  | "expedition";

type Props = {
  as?: "aside" | "section";
  kind: IndustrialPanelKind;
  className?: string;
  ariaLabel?: string;
  dataPanelKind?: string;
  title?: string;
  subtitle?: string;
  header?: ReactNode;
  onClose?: () => void;
  bodyClassName?: string;
  children: ReactNode;
};

export default function IndustrialPanelFrame({
  as = "section",
  kind,
  className = "",
  ariaLabel,
  dataPanelKind,
  title,
  subtitle,
  header,
  onClose,
  bodyClassName = "",
  children,
}: Props) {
  const paper = kind === "terminal" || kind === "notebook";
  const chrome = (
    <>
      <div className="uy-clipboard-clamp" aria-hidden="true">
        <span className="uy-pin" />
        <span className="uy-clip-aperture" />
        <span className="uy-pin" />
      </div>
      <div className="uy-outer-shell">
        <div className="uy-panel-bolts" aria-hidden="true">
          <span className="uy-bolt uy-bolt-tl" />
          <span className="uy-bolt uy-bolt-tr" />
          <span className="uy-bolt uy-bolt-ml" />
          <span className="uy-bolt uy-bolt-mr" />
          <span className="uy-bolt uy-bolt-bl" />
          <span className="uy-bolt uy-bolt-br" />
        </div>
        {/* Legacy test hook is intentionally mounted but hidden. The actual
            visible hardware is the four-layer frame and steel clip above. */}
        <span className="context-retainer" aria-hidden="true" />
        <div className="uy-inset-rim context-board-bed">
          <div className="uy-inset-rim-inner">
            {header ?? (
              <header className="context-header">
                <span>{title}</span>
                {subtitle && (
                  <span className="context-header-stamp" aria-hidden="true">{subtitle}</span>
                )}
                {onClose && (
                  <button
                    type="button"
                    className="uy-close-btn"
                    aria-label="Close panel"
                    onClick={onClose}
                  >
                    ×
                  </button>
                )}
              </header>
            )}
            <div className={
              "uy-contained-surface " +
              (paper ? "uy-surface-paper" : "uy-surface-instrument") +
              (bodyClassName ? " " + bodyClassName : "")
            }>
              <div className={
                "uy-layer-4-content " +
                (paper ? "uy-paper-inner-frame" : "uy-instrument-frame")
              }>
                {children}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
  const classes = "uy-panel-wrapper uy-panel--" + kind + " " + className;
  return as === "aside" ? (
    <aside className={classes} aria-label={ariaLabel} data-panel-kind={dataPanelKind}>{chrome}</aside>
  ) : (
    <section className={classes} aria-label={ariaLabel}>{chrome}</section>
  );
}
