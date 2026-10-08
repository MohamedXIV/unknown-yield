# Phase 18 — Restrained UI motion contract (#237)

Status: implementation candidate; browser acceptance and merge are required before completion.

## Ownership and decision

The simulation and its save format remain authoritative in sim-core. World camera
movement, industrial feedback and all world-object motion stay Phaser-owned.
React owns panels, menus and notices. CSS handles the small UI transitions in
this slice, because all target surfaces mount directly and close immediately:
there is **no exit-layout choreography requiring a React animation library**.
Do not add GSAP or React Spring; `motion/react` is the future default **only**
if a concrete interruptible exit/layout animation requires orchestration beyond
CSS. This prevents needless bundle and interaction complexity now.

## Tokens and performance constraints

| Surface | Property | Duration | Motion |
| --- | --- | --- | --- |
| Desktop hover/focus | background-color, color, border-color | 95ms | ease-out; fine-pointer hover only |
| Grouped upward tool submenu | opacity + transform | 130ms | 7px upward reveal; no layout changes |
| Status notices | opacity + transform | 130ms | 6px downward reveal |
| Inspector / Configuration / terminal / menu panel | opacity + transform | 165ms | 9px horizontal reveal |
| Panel dismissal, key/button commands | no exit delay | 0ms | close, select and build immediately |
| Camera pan/zoom, discoveries | Phaser only | configurable | not driven by CSS or React |

These timings are animation design tokens, **not measured frame-time evidence**.
Avoid geometric width/height/top/right animation, filter/blur interpolation,
large shadows or perpetual effects. Do not add `will-change` permanently.
Only transient opacity and transform reveals are allowed on the chosen surfaces.
Existing shadows and backdrop filters are static.

## Reduced motion, controls and cancellation

`GamePreferences.accessibility.reducedMotion` already stores
`system | on | off` (versioned Game Configuration, #234). The game root
reflects that preference in `data-motion-mode`; CSS handles the effective
motion choice:

- `on`: all chosen reveals/transitions are instant.
- `system`: instant when `prefers-reduced-motion: reduce` is active;
  normal otherwise. OS changes are applied directly by the media query.
- `off`: use gentle standard UI motion, explicitly overriding OS preference.

The setting is persisted independently of expedition saves. No action waits for
an animation to finish. Closing a panel or submenu removes it immediately;
touch, mouse, keyboard and focus behavior remain governed by existing controls.
There are no blocking invisible exit layers or animation completion callbacks.

## Acceptance

Exact-head production-export browser acceptance should verify panel/reveal
computed styles, user On/Off override, OS System reduce, reload persistence,
and immediate close. Confirm unit tests, TypeScript, lint, static export and the
existing gameplay/build regression. This is VM engineering evidence only;
representative physical-device/GPU experience and visual preference remain
deferred to the user's consolidated hands-on review.
