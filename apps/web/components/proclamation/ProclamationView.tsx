"use client";
import { useEffect, useRef } from "react";
import type { Proclamation, ProclamationText } from "../../game/proclamations";
import PosterArt from "./PosterArt";

export type ProclamationItem = { id: string; label: string };

type Props = {
  proclamation: Proclamation;
  text: ProclamationText;
  /** Labels for the tools or items this announcement grants. */
  items: ProclamationItem[];
  /** How many more announcements wait behind this one. */
  waiting: number;
  /** Optional raster poster that replaces the drawn scene. */
  image?: string;
  /** Shown above the headline, for example the issuing office. */
  issuer: string;
  acknowledgeLabel: string;
  waitingLabel: string;
  onAcknowledge: () => void;
};

/**
 * A major proclamation: a poster card over a dimmed site. It is a dialog, takes
 * focus, and closes on Enter, Space or Escape. The simulation keeps running.
 */
export function ProclamationModal(props: Props) {
  const { proclamation: p, text, items } = props;
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    button.current?.focus();
  }, [p.id]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" || event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        event.stopPropagation();
        props.onAcknowledge();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [props.onAcknowledge]);
  return (
    <div className="proclamation-scrim" data-proclamation-kind={p.kind}>
      <section
        className="proclamation-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="proclamation-title"
        aria-describedby="proclamation-body"
      >
        <header className="proclamation-head">
          <span>{props.issuer}</span>
          <b>{text.kicker}</b>
        </header>
        <div className="proclamation-art">
          {props.image ? <img src={props.image} alt="" /> : <PosterArt scene={p.illustration} />}
        </div>
        <h2 id="proclamation-title">{text.title}</h2>
        <p id="proclamation-body">{text.body}</p>
        {items.length > 0 && (
          <ul className="proclamation-items">
            {items.map((item) => (
              <li key={item.id}>{item.label}</li>
            ))}
          </ul>
        )}
        <footer className="proclamation-foot">
          <em>{text.slogan}</em>
          <button ref={button} type="button" onClick={props.onAcknowledge}>
            {props.acknowledgeLabel}
          </button>
        </footer>
        {props.waiting > 0 && <small className="proclamation-waiting">{props.waitingLabel}</small>}
      </section>
    </div>
  );
}

/** A minor proclamation: a poster-styled strip that never blocks play. */
export function ProclamationBanner(props: Omit<Props, "image" | "items" | "waiting" | "waitingLabel">) {
  const { proclamation: p, text } = props;
  return (
    <div className="proclamation-banner" role="status" data-proclamation-kind={p.kind}>
      <div className="proclamation-banner-art" aria-hidden="true">
        <PosterArt scene={p.illustration} />
      </div>
      <div>
        <small>{props.issuer} · {text.kicker}</small>
        <strong>{text.title}</strong>
        {text.body && <span>{text.body}</span>}
      </div>
      <button type="button" aria-label={props.acknowledgeLabel} onClick={props.onAcknowledge}>
        ×
      </button>
    </div>
  );
}
