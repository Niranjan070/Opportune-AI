// Prompt Bond from 000h by Cojeev — MIT licence — see it live at https://cojeev.com/ — the full library: https://cojeev.com/ui/
"use client";

import * as React from "react";
import { useThree } from "@react-three/fiber";
import { ShaderGradient, ShaderGradientCanvas } from "@shadergradient/react";
import { type ClassValue, clsx } from "clsx";
import { animate, type AnimationPlaybackControls, type AnimationSequence, cancelFrame, frame } from "motion";
import { motion } from "motion/react";
import { twMerge } from "tailwind-merge";
import "three";

// ---- registry/cojeev/lib/utils.ts (inlined) ----
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ---- scripts/export-21st-sources/prompt-bond/controls.tsx (inlined) ----
/* Small local versions of the 000h controls the story uses: the same classes, slots and states, without the library's
 * press, morph and theme-reveal machinery. */

function subscribePreferences(listener: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", listener);
  document.addEventListener("visibilitychange", listener);
  return () => {
    media.removeEventListener("change", listener);
    document.removeEventListener("visibilitychange", listener);
  };
}
const readPreferences = () => document.visibilityState === "visible" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
/** The stillness boundary every moving part shares: motion is `enabled` in a visible tab without reduced motion, and `inView`
 * once a tenth of the element is on screen. */
function useMotionVisibility(ref: React.RefObject<Element | null>, mountedElement?: Element | null) {
  const enabled = React.useSyncExternalStore(subscribePreferences, readPreferences, () => false);
  const [inView, setInView] = React.useState(false);
  React.useEffect(() => {
    const element = mountedElement ?? ref.current;
    if (!element) { setInView(false); return; }
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.1 });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, mountedElement]);
  return { enabled, inView };
}
const BUTTON = "v-btn [display:inline-flex] items-center justify-center gap-[var(--s-2)] rounded-[var(--r-pill)] font-[number:var(--fw-control)] whitespace-nowrap motion-safe:active:[transform:translateY(1px)] -ghost bg-transparent text-[color:var(--v-text)] hover:bg-[var(--v-beige)] py-0";
const SIZE = {
  default: "h-[var(--ctl-md)] px-[var(--s-5)] text-[length:var(--fs-control)]",
  sm: "-sm h-[var(--ctl-sm)] px-[var(--s-4)] text-[length:var(--fs-small)]",
};
type ButtonProps = React.ComponentProps<"button"> & { size?: keyof typeof SIZE };
/** The 000h ghost pill button. A disabled click is swallowed; `data-state` reads disabled or rest unless the caller sets it. */
function Button({ size = "default", className, disabled, type = "button", onClick, ...props }: ButtonProps) {
  return (
    <button
      data-slot="button"
      data-part="root"
      data-state={disabled ? "disabled" : "rest"}
      type={type}
      disabled={disabled}
      aria-disabled={disabled || undefined}
      onClick={event => { if (disabled) { event.preventDefault(); return; } onClick?.(event); }}
      className={cn(BUTTON, SIZE[size], "leading-none", className)}
      {...props}
    />
  );
}
/** The bare text field inside the prompt pill. */
function InputControl({ className, ...props }: React.ComponentProps<"input">) {
  return <input data-slot="input-control" data-part="input" className={cn("min-w-0 flex-1 h-full [border:0] bg-transparent [outline:0] [padding:1px_2px] placeholder:text-[color:var(--v-text-2)]", className)} {...props} />;
}
/** Your own message: the pink chat bubble. */
function BubbleMe({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="bubble-content" data-part="content" className={cn("v-bubble [display:inline-block] [max-width:min(80%,52ch)] [padding:var(--s-3)_var(--s-4)_var(--s-3)] [font-size:var(--fs-control)] [line-height:1.4] [overflow-wrap:anywhere] [position:relative] -me [background:var(--v-pink)] [border-radius:var(--r-card)_var(--r-card)_var(--r-xs)_var(--r-card)] [color:var(--v-on-accent)]", className)} {...props} />;
}
type ThemeMode = "light" | "dark";
/** Switches the page: data-mode on <html>, with the browser's plain cross-fade where it has one and motion is allowed. */
function applyTheme(mode: ThemeMode, quiet = false) {
  const root = document.documentElement;
  if (root.dataset.mode === mode) return;
  const set = () => { root.dataset.mode = mode; };
  const still = quiet || document.hidden || matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (still || typeof document.startViewTransition !== "function") set();
  else document.startViewTransition(set);
}
const SUN = "M12 5C15.866 5 19 8.134 19 12C19 15.866 15.866 19 12 19C8.134 19 5 15.866 5 12C5 8.134 8.134 5 12 5Z";
const MOON = "M18.9 15.2C17.2 19.3 12.9 21.2 8.8 19.4C4.7 17.6 2.7 13 4.4 8.8C5.4 6.2 7.7 4.3 10.4 3.8C8.1 10.4 12.3 16.8 18.9 15.2Z";
const SPRING = { type: "spring", stiffness: 360, damping: 32, mass: 0.85 } as const;
/** The sun/moon theme pill: the rays draw away and the sun's disc turns into the moon. A label on desktop, a 44px icon on a phone. */
function ThemeToggle({ mode, onModeChange, responsive = false }: { mode: ThemeMode; onModeChange: (mode: ThemeMode) => void; responsive?: boolean }) {
  const quiet = !React.useSyncExternalStore(subscribePreferences, readPreferences, () => false);
  const dark = mode === "dark";
  const transition = quiet ? { duration: 0 } : SPRING;
  return (
    <Button size="sm" data-label="visible" data-responsive={responsive} role="switch" aria-checked={dark} aria-label="Dark appearance" title={`Switch to ${dark ? "light" : "dark"} theme`} className="v-theme-toggle" onClick={() => onModeChange(dark ? "light" : "dark")} data-slot="theme-toggle">
      <svg data-slot="theme-toggle-icon" viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true" focusable="false">
        <motion.g initial={false} animate={{ rotate: dark ? 45 : 0 }} transition={transition} style={{ transformOrigin: "12px 12px" }}>
          {Array.from({ length: 8 }, (_, i) => (
            <motion.path key={i} d="M12 1.5V3" transform={`rotate(${i * 45} 12 12)`} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" initial={false} animate={{ pathLength: dark ? 0 : 1, opacity: dark ? 0 : 1 }} transition={{ duration: quiet ? 0 : 0.2, delay: quiet ? 0 : i * 0.015 }} />
          ))}
        </motion.g>
        <motion.path initial={false} d={dark ? MOON : SUN} animate={{ d: dark ? MOON : SUN, rotate: dark ? -12 : 0 }} transition={transition} fill="currentColor" style={{ transformOrigin: "12px 12px" }} />
      </svg>
      <span className="v-theme-toggle__label">{dark ? "Dark" : "Light"}</span>
    </Button>
  );
}

// ---- scripts/export-21st-sources/prompt-bond/icons.tsx (inlined) ----
/* The twelve glyphs the story uses, each part drawn in its own group so it can move on its own.
 * Geometry from lucide-react 0.577.0, the same paths the 000h icon set ships. */

type IconPart = string | [tag: "rect" | "circle", attrs: Record<string, string>];
const geometry: Record<string, IconPart[]> = {
  brain: ["M12 18V5", "M15 13a4.17 4.17 0 0 1-3-4 4.17 4.17 0 0 1-3 4", "M17.598 6.5A3 3 0 1 0 12 5a3 3 0 1 0-5.598 1.5", "M17.997 5.125a4 4 0 0 1 2.526 5.77", "M18 18a4 4 0 0 0 2-7.464", "M19.967 17.483A4 4 0 1 1 12 18a4 4 0 1 1-7.967-.517", "M6 18a4 4 0 0 1-2-7.464", "M6.003 5.125a4 4 0 0 0-2.526 5.77"],
  bot: ["M12 8V4H8", ["rect", {width: "16", height: "12", x: "4", y: "8", rx: "2"}], "M2 14h2", "M20 14h2", "M15 13v2", "M9 13v2"],
  file: ["M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z", "M14 3v5h5"],
  "file-text": ["M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z", "M14 2v5a1 1 0 0 0 1 1h5", "M10 9H8", "M16 13H8", "M16 17H8"],
  sparkles: ["M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z", "M20 2v4", "M22 4h-4", ["circle", {cx: "4", cy: "20", r: "2"}]],
  users: ["M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", "M16 3.128a4 4 0 0 1 0 7.744", "M22 21v-2a4 4 0 0 0-3-3.87", ["circle", {cx: "9", cy: "7", r: "4"}]],
  bookmark: ["M17 3a2 2 0 0 1 2 2v15a1 1 0 0 1-1.496.868l-4.512-2.578a2 2 0 0 0-1.984 0l-4.512 2.578A1 1 0 0 1 5 20V5a2 2 0 0 1 2-2z"],
  zap: ["M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"],
  check: ["M20 6 9 17l-5-5"],
  play: ["M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z"],
  pause: [["rect", {x: "14", y: "3", width: "5", height: "18", rx: "1"}], ["rect", {x: "5", y: "3", width: "5", height: "18", rx: "1"}]],
  "arrow-right": ["M5 12h14", "m12 5 7 7-7 7"],
};
type PartMotion = { parts: "glyph" | number[]; move?: [number, number]; scale?: [number, number]; pivot?: [number, number]; trace?: boolean; delay?: number };
const recipes: Record<string, PartMotion[]> = {
  "file-text": [{ parts: [2], trace: true }, { parts: [3], trace: true, delay: 0.1 }, { parts: [4], trace: true, delay: 0.2 }],
  sparkles: [{ parts: [1, 2], scale: [0.2, 0.2], pivot: [20, 4] }, { parts: [3], scale: [0.18, 0.18], pivot: [4, 20], delay: 0.18 }],
  users: [{ parts: [1, 2], move: [1, 0] }],
  bookmark: [{ parts: "glyph", move: [0, 1.5] }],
  zap: [{ parts: [0], trace: true }],
  check: [{ parts: [0], trace: true }],
  play: [{ parts: "glyph", move: [1.4, 0], scale: [-0.07, -0.07] }],
  pause: [{ parts: [0], move: [-1.2, 0] }, { parts: [1], move: [1.2, 0] }],
  "arrow-right": [{ parts: "glyph", move: [2.5, 0] }],
};
type Frame = Record<string, { transform?: string; draw?: number }>;
function recipeFrame(motions: PartMotion[], p: number): Frame {
  const frame: Frame = {};
  for (const motion of motions) {
    const delay = motion.delay ?? 0;
    const t = Math.max(0, Math.min(1, (p - delay) / (1 - delay)));
    const pulse = Math.sin(Math.PI * t);
    const [cx, cy] = motion.pivot ?? [12, 12];
    const transform: string[] = [];
    if (motion.move) transform.push(`translate(${motion.move[0] * pulse} ${motion.move[1] * pulse})`);
    if (motion.scale) transform.push(`translate(${cx} ${cy}) scale(${Math.max(0.08, 1 + motion.scale[0] * pulse)} ${Math.max(0.08, 1 + motion.scale[1] * pulse)}) translate(${-cx} ${-cy})`);
    for (const part of motion.parts === "glyph" ? ["glyph"] : motion.parts) {
      frame[part] = { ...(transform.length ? { transform: transform.join(" ") } : {}), ...(motion.trace ? { draw: Math.min(1, t * 1.8) } : {}) };
    }
  }
  return frame;
}
function createPainter(svg: SVGSVGElement, frames: (p: number) => Frame) {
  const groups = new Map(Array.from(svg.querySelectorAll<SVGGElement>("[data-icon-part]")).map(g => [g.dataset.iconPart!, g]));
  const written = new Map<Element, Map<string, string | null>>();
  const lengths = new Map<SVGGeometryElement, number>();
  const set = (node: Element, name: string, value: string) => {
    let saved = written.get(node);
    if (!saved) written.set(node, (saved = new Map()));
    if (!saved.has(name)) saved.set(name, node.getAttribute(name));
    node.setAttribute(name, value);
  };
  return {
    paint(p: number) {
      for (const [part, f] of Object.entries(frames(p))) {
        const group = groups.get(part);
        if (!group) continue;
        if (f.transform) set(group, "transform", f.transform);
        if (f.draw !== undefined) for (const shape of group.querySelectorAll<SVGGeometryElement>("path,rect,circle")) {
          const length = lengths.get(shape) ?? shape.getTotalLength();
          lengths.set(shape, length);
          set(shape, "stroke-dasharray", `${length} ${length}`);
          set(shape, "stroke-dashoffset", String(length * (1 - f.draw)));
        }
      }
    },
    restore() {
      for (const [node, saved] of written) for (const [name, before] of saved) {
        if (before === null) node.removeAttribute(name);
        else node.setAttribute(name, before);
      }
      written.clear();
    },
  };
}
type IconProps = React.ComponentProps<"svg"> & { name: string; size?: "default" | "sm" };
function Icon({ name, size = "default", className, ...props }: IconProps) {
  return (
    <svg data-slot="icon" data-icon-name={name} data-icon-treatment="outline" viewBox="0 0 24 24" aria-hidden="true" className={cn("v-icon [width:var(--icon-md)] [height:var(--icon-md)] [stroke:currentColor] [stroke-width:var(--icon-stroke)] [stroke-linecap:round] [stroke-linejoin:round] [fill:none] [flex:none]", size !== "default" && `-${size}`, className)} {...props}>
      <g data-icon-ink="">
        <g data-icon-part="glyph">
          {(geometry[name] ?? []).map((part, i) => (
            <g key={i} data-icon-part={i}>
              {typeof part === "string" ? <path d={part} /> : React.createElement(part[0], part[1])}
            </g>
          ))}
        </g>
      </g>
    </svg>
  );
}
const BUTTON_LIKE = "button,a[href],[role=button],[role=switch],label";
const BLOCKED = ':disabled,[disabled],[aria-disabled="true"]';
function AnimatedIcon({ name, preset = "auto", active, size = "default", className }: { name: string; preset?: "auto" | "draw"; active?: boolean; size?: "default" | "sm"; className?: string }) {
  const host = React.useRef<HTMLSpanElement>(null);
  const { enabled, inView } = useMotionVisibility(host);
  const [hovered, setHovered] = React.useState(false);
  const [focused, setFocused] = React.useState(false);
  const [allowed, setAllowed] = React.useState(false);
  const [replay, setReplay] = React.useState(0);
  const [replaying, setReplaying] = React.useState(false);
  React.useEffect(() => {
    if (!replaying) return;
    const timer = setTimeout(() => setReplaying(false), 550);
    return () => clearTimeout(timer);
  }, [replay, replaying]);
  React.useEffect(() => {
    const node = host.current?.closest<HTMLElement>(BUTTON_LIKE) ?? host.current;
    if (!node) return;
    const eligible = () => !node.closest("[inert],[hidden]") && !node.matches(BLOCKED);
    const sync = () => {
      const ok = eligible();
      setAllowed(ok);
      if (!ok) { setHovered(false); setFocused(false); setReplaying(false); }
    };
    sync();
    const enter = (e: PointerEvent) => { if (e.pointerType !== "touch") setHovered(eligible()); };
    const leave = () => setHovered(false);
    const focus = () => setFocused(eligible());
    const blur = (e: FocusEvent) => { if (!node.contains(e.relatedTarget as Node | null)) setFocused(false); };
    const press = (e: Event) => {
      if (e instanceof KeyboardEvent && (e.repeat || (e.key !== "Enter" && e.key !== " "))) return;
      if (e instanceof PointerEvent && e.button !== 0) return;
      if (eligible()) { setReplay(v => v + 1); setReplaying(true); }
    };
    node.addEventListener("pointerenter", enter);
    node.addEventListener("pointerleave", leave);
    node.addEventListener("focusin", focus);
    node.addEventListener("focusout", blur);
    node.addEventListener("pointerdown", press);
    node.addEventListener("keydown", press);
    const attributes = new MutationObserver(sync);
    for (let el: Element | null = node; el; el = el.parentElement) attributes.observe(el, { attributes: true, attributeFilter: ["disabled", "aria-disabled", "inert", "hidden"] });
    return () => {
      node.removeEventListener("pointerenter", enter);
      node.removeEventListener("pointerleave", leave);
      node.removeEventListener("focusin", focus);
      node.removeEventListener("focusout", blur);
      node.removeEventListener("pointerdown", press);
      node.removeEventListener("keydown", press);
      attributes.disconnect();
    };
  }, []);
  const running = allowed && enabled && inView && (active ?? (hovered || focused || replaying));
  const intent = preset === "auto" ? "semantic" : preset;
  React.useEffect(() => {
    const svg = host.current?.querySelector<SVGSVGElement>("[data-slot=icon]");
    const recipe = recipes[name];
    if (!running || !svg || (intent === "semantic" && !recipe)) return;
    const frames = (p: number): Frame => (intent === "draw" ? { glyph: { draw: p } } : recipeFrame(recipe, p));
    const painter = createPainter(svg, frames);
    painter.paint(0);
    const controls = animate(0, 1, { duration: 0.55, ease: [0.22, 0.72, 0.22, 1], onUpdate: painter.paint, onComplete: painter.restore });
    return () => { controls.stop(); painter.restore(); };
  }, [intent, running, name, active, replay]);
  return (
    <span ref={host} data-slot="animated-icon" data-preset={intent} data-animated={running || undefined} className="v-animated-icon">
      <span><Icon name={name} size={size} className={className} /></span>
    </span>
  );
}

// ---- scripts/export-21st-sources/prompt-bond/text.tsx (inlined) ----
function TextReveal({ text, as: Tag = "span", stagger = 35, duration = 480, className, ...props }: Omit<React.HTMLAttributes<HTMLElement>, "children"> & { text: string; as?: "span" | "p"; stagger?: number; duration?: number }) {
  const host = React.useRef<HTMLElement>(null);
  const [mounted, setMounted] = React.useState<HTMLElement | null>(null);
  const setHost = React.useCallback((el: HTMLElement | null) => { host.current = el; setMounted(el); }, []);
  const { enabled, inView } = useMotionVisibility(host, mounted);
  const played = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!inView || !host.current || played.current === text) return;
    played.current = text;
    if (!enabled) return;
    const words = Array.from(host.current.querySelectorAll<HTMLElement>("[data-reveal-unit]"));
    if (!words.length) return;
    const step = Math.min(stagger / 1000, 0.6 / Math.max(1, words.length - 1));
    const controls = animate(words, { "--reveal-opacity": [0, 1], "--reveal-y": ["0.28em", "0em"], "--reveal-blur": ["5px", "0px"] } as any, { duration: duration / 1000, delay: i => i * step, ease: [0.2, 0.65, 0.25, 1] });
    return () => {
      controls.stop();
      const live = words.filter(word => word.isConnected);
      if (live.length) animate(live, { "--reveal-opacity": 1, "--reveal-y": "0em", "--reveal-blur": "0px" } as any, { duration: 0 });
    };
  }, [text, enabled, inView, duration, stagger]);
  return (
    <Tag {...props} ref={setHost} data-slot="text-reveal" data-reveal-variant="soften" data-reveal-split="word" data-motion-quiet={!enabled || !inView} className={cn("v-text-reveal", className)}>
      <span className="v-text-reveal__accessible">{text}</span>
      <span aria-hidden="true" data-reveal-visual="">
        {text.split(/(\s+)/).map((word, i) => !word || /^\s+$/.test(word) ? word : <span key={i} data-reveal-word="" data-reveal-unit="">{word}</span>)}
      </span>
    </Tag>
  );
}
const bounded = (value: number, min: number, max: number, fallback: number) => Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;
const graphemes = (text: string) => Array.from(new (Intl as any).Segmenter(undefined, { granularity: "grapheme" }).segment(text), (s: any) => s.segment);
function proximityWeight(distance: number, radius: number, from: number, to: number) {
  const p = 1 - bounded(distance / bounded(radius, 1, 1000, 120), 0, 1, 1);
  return from + (to - from) * p * p * (3 - 2 * p);
}
function VariableProximity({ text, paused = false, radius = 150, fromWeight = 350, toWeight = 800, className }: { text: string; paused?: boolean; radius?: number; fromWeight?: number; toWeight?: number; className?: string }) {
  const host = React.useRef<HTMLDivElement>(null);
  const { enabled, inView } = useMotionVisibility(host);
  const running = enabled && inView && !paused;
  const frameId = React.useRef(0), point = React.useRef<{ x: number; y: number } | null>(null);
  const from = bounded(fromWeight, 200, 800, 350), to = bounded(toWeight, 200, 800, 800);
  const paint = React.useCallback(() => {
    host.current?.querySelectorAll<HTMLElement>("[data-proximity-letter]").forEach(letter => {
      const r = letter.getBoundingClientRect();
      const distance = point.current && running ? Math.hypot(point.current.x - r.x - r.width / 2, point.current.y - r.y - r.height / 2) : Infinity;
      letter.style.fontVariationSettings = `"wght" ${proximityWeight(distance, radius, from, to)}, "wdth" 100`;
    });
  }, [running, radius, from, to]);
  React.useEffect(() => { paint(); return () => cancelAnimationFrame(frameId.current); }, [paint, text]);
  return (
    <div ref={host} data-slot="variable-proximity" data-variant="weight" data-size="default" data-running={running} className={cn("v-variable-proximity", className)}
      onPointerMove={e => { if (e.pointerType === "touch" || !running) return; point.current = { x: e.clientX, y: e.clientY }; cancelAnimationFrame(frameId.current); frameId.current = requestAnimationFrame(paint); }}
      onPointerLeave={() => { point.current = null; paint(); }}>
      <span className="v-variable-proximity__accessible">{text}</span>
      <span aria-hidden="true" className="v-variable-proximity__line">
        {text.split(/(\s+)/).map((word, i) => /^\s+$/.test(word) ? word : (
          <span className="v-variable-proximity__word" key={i}>
            {graphemes(word).map((char: string, j: number) => <span key={j} data-proximity-letter="" style={{ fontVariationSettings: `"wght" ${from}, "wdth" 100` }}>{char}</span>)}
          </span>
        ))}
      </span>
    </div>
  );
}

// ---- scripts/export-21st-sources/prompt-bond/shader-background-scene.tsx (inlined) ----
const shared={control:"props", cAzimuthAngle:180, envPreset:"city", grain:"on", lightType:"3d", reflection:0.1, positionY:0,positionZ:0, range:"disabled",rangeStart:0,rangeEnd:40,shader:"defaults",wireframe:false,toggleAxis:false} as const;
const sourcePresets={
 dark:{...shared,brightness:1,cDistance:2.8,cPolarAngle:80,cameraZoom:9.1,color1:"#606080",color2:"#8d7dca",color3:"#212121",positionX:0,rotationX:50,rotationY:0,rotationZ:-60,type:"waterPlane",uAmplitude:0,uDensity:1.5,uFrequency:0,uSpeed:0.3,uStrength:1.5,uTime:8},
 light:{...shared,brightness:1.2,cDistance:2.9,cPolarAngle:120,cameraZoom:1,color1:"#ebedff",color2:"#f3f2f8",color3:"#dbf8ff",grain:"off",positionX:0,positionY:1.8,rotationX:0,rotationY:0,rotationZ:-90,type:"waterPlane",uAmplitude:0,uDensity:1,uFrequency:5.5,uSpeed:0.3,uStrength:3,uTime:0.2,zoomOut:true},
} as const;
const sceneOverrides={light:{zoomOut:false,positionY:0,cDistance:1.5,enableTransition:false,uSpeed:0.1,uStrength:1.2},dark:{color1:"#4a4364",color2:"#8E80BC",color3:"#2b2836",cDistance:2.4,grain:"off",brightness:0.9,uSpeed:0.1,uStrength:1.1}} as const;
function FramePolicy({moving,mode}:{moving:boolean;mode:string}){
 const setFrameloop=useThree(s=>s.setFrameloop),invalidate=useThree(s=>s.invalidate);
 React.useEffect(()=>{setFrameloop(moving?"always":"demand");invalidate();},[moving,mode,setFrameloop,invalidate]);
 return null;
}
function ShaderScene({mode,moving,envBasePath,original=false}:{mode:"light"|"dark";moving:boolean;envBasePath?:string;original?:boolean}){
 return <ShaderGradientCanvas style={{position:"absolute",inset:0}} pixelDensity={1} fov={45} pointerEvents="none" powerPreference="low-power" lazyLoad={false} envBasePath={envBasePath}>
  <ShaderGradient {...sourcePresets[mode]} {...(original?{}:sceneOverrides[mode])} animate="on" />
  <FramePolicy moving={moving} mode={mode}/>
 </ShaderGradientCanvas>;
}

// ---- scripts/export-21st-sources/prompt-bond/membrane-field.ts (inlined) ----
type MembraneCell = {
  x: number; y: number; hw: number; hh: number; r: number; tone: number; rot?: number; w?: number;
};
type MembraneStrand = {
  ax: number; ay: number; bx: number; by: number; r: number; tone: number; taper?: number; w?: number;
};
type MembraneScene = {
  cells: readonly MembraneCell[];
  strands: readonly MembraneStrand[];
  blend?: number; wobble?: number; contour?: number; time?: number;
};
type MembranePalette = {
  tones: readonly [string, string, string, string];
  deep: readonly [string, string, string, string];
  paper: string; ink?: string; dim?: number; glow?: number;
};
type MembraneStatus = "webgl" | "fallback";
const MEMBRANE_LIMITS = { cells: 18, strands: 8 } as const;
const vertexSource = `
attribute vec2 aPosition;
void main() { gl_Position = vec4(aPosition, 0.0, 1.0); }
`;
const fragmentSource = `
precision highp float;
uniform vec2 uSize;
uniform float uDpr;
uniform float uTime;
uniform int uCellCount;
uniform vec4 uCellA[${MEMBRANE_LIMITS.cells}];
uniform vec4 uCellB[${MEMBRANE_LIMITS.cells}];
uniform int uStrandCount;
uniform vec4 uStrandA[${MEMBRANE_LIMITS.strands}];
uniform vec4 uStrandB[${MEMBRANE_LIMITS.strands}];
uniform vec3 uTone[4];
uniform vec3 uDeep[4];
uniform vec3 uPaper; uniform vec3 uInk; uniform float uDim; uniform float uGlow;
uniform float uBlend;
uniform float uWobble;
uniform float uContour;

vec3 toneAt(int t) { if (t <= 0) return uTone[0]; if (t == 1) return uTone[1]; if (t == 2) return uTone[2]; return uTone[3]; }
vec3 deepAt(int t) { if (t <= 0) return uDeep[0]; if (t == 1) return uDeep[1]; if (t == 2) return uDeep[2]; return uDeep[3]; }
vec3 toneMix(float t) { t = clamp(t, 0.0, 3.0); int a = int(floor(t)); return mix(toneAt(a), toneAt(a + 1), fract(t)); }
vec3 deepMix(float t) { t = clamp(t, 0.0, 3.0); int a = int(floor(t)); return mix(deepAt(a), deepAt(a + 1), fract(t)); }

float sdCell(vec2 p, vec4 a, vec4 b) {
  vec2 q = p - a.xy;
  float c = cos(b.w), s = sin(b.w);
  q = vec2(c * q.x + s * q.y, -s * q.x + c * q.y);
  float r = min(b.x, min(a.z, a.w));
  vec2 e = max(a.zw - vec2(r), 0.0);
  vec2 d = abs(q) - e;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - r;
}
float sdStrand(vec2 p, vec4 a, vec4 b) {
  vec2 pa = p - a.xy, ba = a.zw - a.xy;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-4), 0.0, 1.0);
  return length(pa - ba * h) - b.x * (1.0 - b.w * h);
}
float smin(float a, float b, float k) {
  float h = max(k - abs(a - b), 0.0) / k;
  return min(a, b) - h * h * k * 0.25;
}

void main() {
  vec2 p = vec2(gl_FragCoord.x, uSize.y * uDpr - gl_FragCoord.y) / uDpr;
  float k = max(uBlend, 1.0);
  float d = 1e5, wsum = 0.0;
  vec3 tone = vec3(0.0), deep = vec3(0.0);
  for (int i = 0; i < ${MEMBRANE_LIMITS.cells}; i++) {
    if (i >= uCellCount) break;
    vec4 a = uCellA[i], b = uCellB[i];
    if (a.z <= 0.05 || a.w <= 0.05) continue;
    float di = sdCell(p, a, b);
    d = smin(d, di, k);
    float w = exp(-clamp(di, -80.0, 200.0) / (k * 1.5)) * b.z;
    tone += w * toneMix(b.y); deep += w * deepMix(b.y); wsum += w;
  }
  for (int i = 0; i < ${MEMBRANE_LIMITS.strands}; i++) {
    if (i >= uStrandCount) break;
    vec4 a = uStrandA[i], b = uStrandB[i];
    if (b.x <= 0.05) continue;
    float di = sdStrand(p, a, b);
    d = smin(d, di, k);
    float w = exp(-clamp(di, -80.0, 200.0) / (k * 1.5)) * b.z;
    tone += w * toneMix(b.y); deep += w * deepMix(b.y); wsum += w;
  }
  tone /= max(wsum, 1e-5); deep /= max(wsum, 1e-5);
  d += (sin(p.x * 0.021 + uTime * 0.9) * sin(p.y * 0.027 - uTime * 0.7) * 0.6 + sin((p.x - p.y) * 0.017 + uTime * 1.3) * 0.4) * uWobble;
  float cover = 1.0 - smoothstep(-0.9, 0.9, d);
  float halo = exp(-max(d, 0.0) / 34.0) * (1.0 - cover) * uGlow;
  if (cover <= 0.003 && halo <= 0.004) discard;
  float depth = clamp(-d / 56.0, 0.0, 1.0);
  vec3 body = mix(mix(tone, uPaper, 0.12), deep, depth * 0.26);
  float rim = 1.0 - smoothstep(0.0, 1.9, abs(d + 1.1));
  body = mix(body, deep, rim * 0.6);
  float ring = abs(fract(-d / 14.0) - 0.5);
  float lines = (1.0 - smoothstep(0.06, 0.16, ring)) * smoothstep(0.0, -7.0, d) * exp(d / 90.0) * uContour;
  body = mix(body, deep, lines * 0.34);
  body = mix(body, uInk, uDim);
  vec3 light = mix(tone, vec3(1.0), 0.25);
  gl_FragColor = vec4(body * cover + light * halo, cover + halo);
}
`;
type Rgb = [number, number, number];
type Program = {
  gl: WebGLRenderingContext; program: WebGLProgram; buffer: WebGLBuffer;
  shaders: WebGLShader[]; locations: Record<string, WebGLUniformLocation | null>;
};
type MembraneRenderer = {
  readonly status: MembraneStatus;
  resize(width: number, height: number, dpr: number): void;
  setPalette(palette: MembranePalette): void;
  draw(scene: MembraneScene): void;
  dispose(): void;
};
const uniformNames = ["uSize", "uDpr", "uTime", "uCellCount", "uCellA", "uCellB", "uStrandCount", "uStrandA", "uStrandB", "uTone", "uDeep", "uPaper", "uInk", "uDim", "uGlow", "uBlend", "uWobble", "uContour"];
function colorParser() {
  const probe = typeof document === "undefined" ? null : document.createElement("canvas");
  if (probe) { probe.width = probe.height = 1; }
  const context = probe?.getContext("2d", { willReadFrequently: true }) ?? null;
  return (value: string, fallback: Rgb): Rgb => {
    if (!context) return fallback;
    context.clearRect(0, 0, 1, 1);
    context.fillStyle = "#000";
    context.fillStyle = value;
    context.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data;
    return a === 0 ? fallback : [r / 255, g / 255, b / 255];
  };
}
const defaultPalette: MembranePalette = {
  tones: ["#F5B8DB", "#9AAB63", "#B6CAEB", "#F5D867"],
  deep: ["#E09CC1", "#808F53", "#8BA2C8", "#E8C84D"],
  paper: "#FBF4E6",
};
function createMembraneRenderer(canvas: HTMLCanvasElement): MembraneRenderer {
  const parse = colorParser();
  let width = 1, height = 1, dpr = 1;
  let tones: Rgb[] = [], deep: Rgb[] = [], paper: Rgb = [1, 1, 1], ink: Rgb = [.1, .09, .13], dim = 0, glow = 0;
  let cssTones: string[] = [], cssDeep: string[] = [];
  const cellA = new Float32Array(MEMBRANE_LIMITS.cells * 4), cellB = new Float32Array(MEMBRANE_LIMITS.cells * 4);
  const strandA = new Float32Array(MEMBRANE_LIMITS.strands * 4), strandB = new Float32Array(MEMBRANE_LIMITS.strands * 4);
  const toneFlat = new Float32Array(12), deepFlat = new Float32Array(12);
  let program: Program | null = null;
  let fallback: CanvasRenderingContext2D | null = null;
  let disposed = false;

  function applyPalette(palette: MembranePalette) {
    tones = palette.tones.map((c, i) => parse(c, parse(defaultPalette.tones[i], [1, 1, 1])));
    deep = palette.deep.map((c, i) => parse(c, parse(defaultPalette.deep[i], [.5, .5, .5])));
    paper = parse(palette.paper, parse(defaultPalette.paper, [1, 1, 1]));
    ink = parse(palette.ink ?? "#1a1620", [.1, .09, .13]);
    dim = Math.min(1, Math.max(0, palette.dim ?? 0)); glow = Math.min(1, Math.max(0, palette.glow ?? 0));
    cssTones = [...palette.tones]; cssDeep = [...palette.deep];
    for (let i = 0; i < 4; i++) { toneFlat.set(tones[i], i * 3); deepFlat.set(deep[i], i * 3); }
  }
  applyPalette(defaultPalette);

  function compile(gl: WebGLRenderingContext, type: number, source: string, shaders: WebGLShader[]) {
    const shader = gl.createShader(type);
    if (!shader) throw new Error("Shader allocation failed");
    shaders.push(shader);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? "Shader compilation failed");
    return shader;
  }

  function setupWebGL(): Program | null {
    let gl: WebGLRenderingContext | null = null;
    try {
      gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: "low-power" }) as WebGLRenderingContext | null;
    } catch { gl = null; }
    if (!gl) return null;
    const shaders: WebGLShader[] = [];
    try {
      const glProgram = gl.createProgram();
      if (!glProgram) throw new Error("Program allocation failed");
      gl.attachShader(glProgram, compile(gl, gl.VERTEX_SHADER, vertexSource, shaders));
      gl.attachShader(glProgram, compile(gl, gl.FRAGMENT_SHADER, fragmentSource, shaders));
      gl.linkProgram(glProgram);
      if (!gl.getProgramParameter(glProgram, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(glProgram) ?? "Program link failed");
      const buffer = gl.createBuffer();
      if (!buffer) throw new Error("Buffer allocation failed");
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      gl.useProgram(glProgram);
      const position = gl.getAttribLocation(glProgram, "aPosition");
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      const locations: Record<string, WebGLUniformLocation | null> = {};
      for (const name of uniformNames) locations[name] = gl.getUniformLocation(glProgram, name);
      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.BLEND);
      gl.clearColor(0, 0, 0, 0);
      return { gl, program: glProgram, buffer, shaders, locations };
    } catch (error) {
      console.warn("Membrane field: WebGL unavailable, painting a flat fallback.", error);
      for (const shader of shaders) gl.deleteShader(shader);
      return null;
    }
  }

  program = setupWebGL();
  if (!program) fallback = canvas.getContext("2d");

  function drawFallback(scene: MembraneScene) {
    const ctx = fallback;
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.lineCap = "round";
    for (const strand of scene.strands) {
      if (strand.r <= 0.05) continue;
      ctx.strokeStyle = cssTones[Math.round(Math.min(3, Math.max(0, strand.tone)))];
      ctx.lineWidth = strand.r * 2 * (1 - (strand.taper ?? 0) * .5);
      ctx.beginPath(); ctx.moveTo(strand.ax, strand.ay); ctx.lineTo(strand.bx, strand.by); ctx.stroke();
    }
    for (const cell of scene.cells) {
      if (cell.hw <= 0.05 || cell.hh <= 0.05) continue;
      const tone = Math.round(Math.min(3, Math.max(0, cell.tone)));
      ctx.save();
      ctx.translate(cell.x, cell.y); ctx.rotate(cell.rot ?? 0);
      ctx.fillStyle = cssTones[tone]; ctx.strokeStyle = cssDeep[tone]; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(-cell.hw, -cell.hh, cell.hw * 2, cell.hh * 2, Math.min(cell.r, cell.hw, cell.hh));
      ctx.fill(); ctx.stroke();
      ctx.restore();
    }
  }

  function drawWebGL(scene: MembraneScene) {
    const { gl, locations } = program!;
    if (gl.isContextLost()) return;
    const cells = scene.cells.slice(0, MEMBRANE_LIMITS.cells), strands = scene.strands.slice(0, MEMBRANE_LIMITS.strands);
    cellA.fill(0); cellB.fill(0); strandA.fill(0); strandB.fill(0);
    cells.forEach((c, i) => { cellA.set([c.x, c.y, c.hw, c.hh], i * 4); cellB.set([c.r, c.tone, c.w ?? 1, c.rot ?? 0], i * 4); });
    strands.forEach((s, i) => { strandA.set([s.ax, s.ay, s.bx, s.by], i * 4); strandB.set([s.r, s.tone, s.w ?? 1, s.taper ?? 0], i * 4); });
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(locations.uSize, width, height);
    gl.uniform1f(locations.uDpr, dpr);
    gl.uniform1f(locations.uTime, scene.time ?? 0);
    gl.uniform1i(locations.uCellCount, cells.length);
    gl.uniform4fv(locations.uCellA, cellA);
    gl.uniform4fv(locations.uCellB, cellB);
    gl.uniform1i(locations.uStrandCount, strands.length);
    gl.uniform4fv(locations.uStrandA, strandA);
    gl.uniform4fv(locations.uStrandB, strandB);
    gl.uniform3fv(locations.uTone, toneFlat);
    gl.uniform3fv(locations.uDeep, deepFlat);
    gl.uniform3f(locations.uInk, ink[0], ink[1], ink[2]);
    gl.uniform1f(locations.uDim, dim);
    gl.uniform1f(locations.uGlow, glow);
    gl.uniform3f(locations.uPaper, paper[0], paper[1], paper[2]);
    gl.uniform1f(locations.uBlend, scene.blend ?? 26);
    gl.uniform1f(locations.uWobble, scene.wobble ?? 0);
    gl.uniform1f(locations.uContour, scene.contour ?? 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  return {
    get status() { return program ? "webgl" : "fallback"; },
    resize(nextWidth, nextHeight, nextDpr) {
      width = Math.max(1, nextWidth); height = Math.max(1, nextHeight);
      const ratio = Math.min(Math.max(nextDpr, 1), 2, Math.sqrt(1_400_000 / (width * height)));
      dpr = Math.max(0.5, ratio);
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
    },
    setPalette(palette) { applyPalette(palette); },
    draw(scene) {
      if (disposed) return;
      if (program) drawWebGL(scene); else drawFallback(scene);
    },
    dispose() {
      disposed = true;
      if (program) {
        const { gl, buffer, program: glProgram, shaders } = program;
        if (!gl.isContextLost()) { gl.deleteBuffer(buffer); gl.deleteProgram(glProgram); for (const shader of shaders) gl.deleteShader(shader); }
        program = null;
      }
      fallback = null;
    },
  };
}

// ---- scripts/export-21st-sources/prompt-bond/membrane.tsx (inlined) ----
type MembraneHandle = {
  draw(scene: MembraneScene): void;
  size(): { width: number; height: number };
  status(): MembraneStatus;
};
type MembraneProps = Omit<React.ComponentProps<"div">, "children" | "ref"> & {
  ref?: React.Ref<MembraneHandle>;
  onMeasure?: (size: { width: number; height: number }) => void;
};
function readPalette(element: HTMLElement): MembranePalette {
  const style = getComputedStyle(element);
  const read = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
  return {
    tones: [read("--v-pink", "#F5B8DB"), read("--v-olive", "#9AAB63"), read("--v-blue", "#B6CAEB"), read("--v-yellow", "#F5D867")],
    deep: [read("--v-pink-deep", "#E09CC1"), read("--v-olive-deep", "#808F53"), read("--v-blue-deep", "#8BA2C8"), read("--v-yellow-deep", "#E8C84D")],
    paper: read("--v-paper", read("--v-canvas", "#FBF4E6")),
    ink: read("--membrane-ink", "#1a1620"), dim: Number(read("--membrane-dim", "0")) || 0, glow: Number(read("--membrane-glow", "0")) || 0,
  };
}
function Membrane({ ref, onMeasure, className, style, ...props }: MembraneProps) {
  const host = React.useRef<HTMLDivElement>(null), canvas = React.useRef<HTMLCanvasElement>(null);
  const renderer = React.useRef<MembraneRenderer | null>(null);
  const lastScene = React.useRef<MembraneScene | null>(null);
  const size = React.useRef({ width: 1, height: 1 });
  const measure = React.useRef(onMeasure);
  React.useLayoutEffect(() => { measure.current = onMeasure; }, [onMeasure]);

  React.useImperativeHandle(ref, () => ({
    draw(scene) { lastScene.current = scene; renderer.current?.draw(scene); },
    size: () => ({ ...size.current }),
    status: () => renderer.current?.status ?? "fallback",
  }), []);

  React.useEffect(() => {
    const element = host.current, surface = canvas.current;
    if (!element || !surface) return;
    let current = createMembraneRenderer(surface);
    let measured: {width:number;height:number;dpr:number}|null = null;
    renderer.current = current;
    const repaint = () => { if (lastScene.current) current.draw(lastScene.current); };
    const resize = () => {
      const width = Math.max(1, element.clientWidth), height = Math.max(1, element.clientHeight);
      const dpr = window.devicePixelRatio || 1;
      if(measured?.width===width&&measured.height===height&&measured.dpr===dpr)return;
      measured={width,height,dpr};
      size.current = { width, height };
      current.resize(width, height, dpr);
      element.dataset.renderer = current.status;
      measure.current?.({ width, height });
      repaint();
    };
    const recolor = () => { current.setPalette(readPalette(element)); repaint(); };
    current.setPalette(readPalette(element));
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    const fontsChanged = () => { measured = null; resize(); };
    document.fonts.addEventListener("loadingdone", fontsChanged);
    const theme = new MutationObserver(recolor);
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ["data-mode", "data-skin", "class"] });
    window.addEventListener("v-theme", recolor);
    window.addEventListener("v-palette", recolor);
    const lost = (event: Event) => { event.preventDefault(); element.dataset.renderer = "lost"; };
    const restored = () => {
      current.dispose();
      current = createMembraneRenderer(surface);
      measured = null;
      renderer.current = current;
      current.setPalette(readPalette(element));
      resize();
    };
    surface.addEventListener("webglcontextlost", lost);
    surface.addEventListener("webglcontextrestored", restored);
    resize();
    return () => {
      observer.disconnect(); theme.disconnect();
      document.fonts.removeEventListener("loadingdone", fontsChanged);
      window.removeEventListener("v-theme", recolor); window.removeEventListener("v-palette", recolor);
      surface.removeEventListener("webglcontextlost", lost); surface.removeEventListener("webglcontextrestored", restored);
      current.dispose(); renderer.current = null;
    };
  }, []);

  return <div {...props} ref={host} data-slot="membrane" aria-hidden="true" className={cn("v-membrane", className)} style={{ position: "relative", pointerEvents: "none", ...style }}>
    <canvas ref={canvas} data-slot="membrane-canvas" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }} />
  </div>;
}

// ---- scripts/export-21st-sources/prompt-bond/prompt-bond.tsx ----
export const beats = [
 {cue:'A small thought. A little curiosity.',label:'Ready'},
 {cue:'Bonded. Your prompt lives inside now.',label:'Bond'},
 {cue:'Sent. The whole conversation is alive.',label:'Launch'},
 {cue:'The right memories find their way back.',label:'Recall'},
 {cue:'Your way of working, woven in.',label:'Prepare'},
 {cue:'The task reaches your teammates and agents.',label:'Reach'},
 {cue:'A response forms. A second look checks it.',label:'Check'},
 {cue:'The useful part stays with you.',label:'Keep'},
 {cue:'A familiar rhythm. A future automation?',label:'Notice'},
 {cue:'One prompt ends. The next starts wiser.',label:'Again'},
] as const;
const LAST=beats.length-1;
const IDLE_MS=9000;
type Kind='memory'|'file'|'skill'|'teammate'|'subagent'|'report';
type Thing={kind:Kind;title:string;sub:string;icon?:string;initials?:string};
const mem=(title:string,sub:string):Thing=>({kind:'memory',title,sub,icon:'brain'});
const mate=(title:string,initials:string,sub:string):Thing=>({kind:'teammate',title,sub,initials});
const bot=(title:string,sub:string):Thing=>({kind:'subagent',title,sub,icon:'bot'});
const rep=(title:string,sub:string):Thing=>({kind:'report',title,sub,icon:'file-text'});
const file=(title:string,sub:string):Thing=>({kind:'file',title,sub,icon:'file'});
const skill=(title:string,sub:string):Thing=>({kind:'skill',title,sub,icon:'sparkles'});
const T={
 decisions:mem('team decisions','12 notes'),launchNotes:mem('last launch notes','kept three weeks ago'),changelog:mem('changelog','34 commits'),
 threads:mem('this week’s threads','7 conversations'),deployLog:mem('deploy log','last run'),runbook:mem('runbook','kept two months ago'),
 mira:mate('Mira','MK','takes the timeline'),arun:mate('Arun','AR','reviews the wording'),jules:mate('Jules','JL','adds the numbers'),sam:mate('Sam','SP','checks the cluster'),
 dates:bot('date checker','checks the dates'),diffs:bot('diff collector','collects the diffs'),board:bot('board reader','reads the board'),trace:bot('trace reader','reads the trace'),
 plan:mem('launch plan v1','kept just now'),notes:mem('release notes v1','kept just now'),summary:mem('weekly summary','kept just now'),cause:mem('root cause: expired token','kept just now'),
 instructions:file('instructions.md','how you like things done'),voice:file('voice notes','how you sound'),styleGuide:file('style guide','from last spring'),
 launchSkill:skill('launch skill','plans a launch'),notesSkill:skill('release-notes skill','writes the notes'),summarySkill:skill('summary skill','sums up a week'),debugSkill:skill('debugging skill','reads a failure'),
};
type Story={prompt:string;memories:[Thing,Thing];woven:[Thing,Thing];agents:[Thing,Thing];reach:string;kept:Thing;report:Thing;reply:[string,string,string];noticed:string;automation:string};
export const stories:Story[]=[
 {prompt:'Plan our next launch.',memories:[T.decisions,T.launchNotes],woven:[T.instructions,T.launchSkill],agents:[T.mira,T.dates],reach:'Handed the timeline to {0}; {1} is checking the dates.',
  kept:T.plan,report:rep('Launch timeline','3 milestones, dated'),reply:['Here’s the plan: three milestones, with the dates checked against the last launch.','I recalled what the team decided, and Mira has the timeline.','The launch timeline is written up, so nothing gets lost this time.'],noticed:'You plan a launch like this every quarter.',automation:'Plan the next one automatically?'},
 {prompt:'Draft the release notes.',memories:[T.plan,T.changelog],woven:[T.voice,T.notesSkill],agents:[T.arun,T.diffs],reach:'Sent the draft to {0}; {1} is collecting the diffs.',
  kept:T.notes,report:rep('Release notes draft','34 commits, 6 highlights'),reply:['Release notes drafted in your voice, from all 34 commits.','Arun is reviewing the wording; the diff collector caught two fixes the changelog missed.','The notes are kept in memory, and the draft is saved as a report.'],noticed:'Every release ends with notes like these.',automation:'Draft them on every release?'},
 {prompt:'Summarize this week for the team.',memories:[T.notes,T.threads],woven:[T.instructions,T.summarySkill],agents:[T.jules,T.board],reach:'Asked {0} for the numbers; {1} is reading the board.',
  kept:T.summary,report:rep('Week in review','2 launches, 7 threads'),reply:['This week: two launches shipped, one incident closed, seven threads resolved.','Jules added the numbers, and the board reader filled in the open work.','The summary is saved, and next Friday it can go out before you ask.'],noticed:'Every Friday, a summary for the team.',automation:'Send it every Friday?'},
 {prompt:'Why did the deploy fail?',memories:[T.deployLog,T.runbook],woven:[T.instructions,T.debugSkill],agents:[T.sam,T.trace],reach:'Asked {0} to check the cluster; {1} is reading the trace.',
  kept:T.cause,report:rep('Incident report','expired token, 401'),reply:['The deploy failed because the registry token had expired.','I recalled the runbook, and the trace reader confirmed the same 401.','Sam is rotating the token, and the incident report is filed so it never repeats.'],noticed:'Deploys fail this way now and then.',automation:'Watch every deploy for it?'},
];
const storyAt=(run:number)=>stories[run%stories.length];
type Part={t:string;b?:boolean};
const fill=(template:string,names:string[]):Part[]=>template.split(/(\{\d\})/).filter(Boolean).map(p=>{const m=/^\{(\d)\}$/.exec(p);return m?{t:names[+m[1]],b:true}:{t:p};});
const rowsFor=(s:Story):Record<number,Part[]>=>({
 1:fill('Recalled {0} and {1} from memory.',[s.memories[0].title,s.memories[1].title]),
 2:fill('Wove in {0} and the {1}, held close.',[s.woven[0].title,s.woven[1].title]),
 3:fill(s.reach,[s.agents[0].title,s.agents[1].title]),
 5:fill('Kept {0} in memory and wrote {1}.',[s.kept.title,s.report.title]),
 6:[{t:s.noticed}],
});
const KIND_TITLE:Record<Kind,string>={memory:'Memory',file:'File',skill:'Skill',teammate:'Teammate',subagent:'Subagent',report:'Report'};
const KIND_PRESET:Record<Kind,'auto'|'draw'>={memory:'draw',file:'draw',skill:'auto',teammate:'auto',subagent:'draw',report:'auto'};
const ROW_ICONS=['','brain','sparkles','users','','bookmark','zap'];
const ROW_PRESET=['auto','draw','auto','auto','auto','auto','auto'] as const;

type Env=(Thing|null)[];
const SLOTS=18;
const BASE:Env=[T.decisions,T.mira,T.launchNotes,T.instructions,T.changelog,T.dates,T.launchSkill,T.threads,T.styleGuide,T.arun,T.deployLog,T.board,T.runbook,T.summarySkill,T.jules,T.trace,null,null];
const slotOf=(env:Env,title:string)=>env.findIndex(t=>t?.title===title);
type Played={s:Story;upTo:number};
function envFor(played:Played[],current:Story,upTo:number):Env{
 const env=BASE.slice(),born=env.map((t,i)=>t?i:-1);let tick=SLOTS;const need=new Set<string>();
 const put=(th:Thing)=>{
  if(slotOf(env,th.title)>=0)return;
  let slot=env.findIndex(t=>!t);
  if(slot<0){const spare=env.map((t,i)=>t&&!need.has(t.title)?i:-1).filter(i=>i>=0);slot=spare.reduce((a,b)=>born[a]<=born[b]?a:b);}
  env[slot]=th;born[slot]=tick++;
 };
 const play=(s:Story,to:number)=>{
  need.clear();[...s.memories,...s.woven,...s.agents,s.kept,s.report].forEach(t=>need.add(t.title));
  if(to>=2)[...s.memories,...s.woven,...s.agents].forEach(put);
  if(to>=7){put(s.kept);put(s.report);}
 };
 played.forEach(p=>play(p.s,p.upTo));play(current,upTo);
 return env;
}
const freshBetween=(before:Env,after:Env)=>after.map((t,i)=>t&&t.title!==before[i]?.title?i:-1).filter(i=>i>=0);

type Cell={px:number;py:number;hw:number;hh:number;r:number;tone:number;rot:number;w:number};
type Strand={ax:number;ay:number;bx:number;by:number;r:number;tone:number;taper:number;w:number};
type Node_PromptBond={px:number;py:number;o:number;s:number;t:number;free:number;rip:number;flash:number;busy:number};
type Row={o:number;dy:number;p:number;g:number};
type Eye={o:number;lid:number};
type World={
 env:{free:number;breath:number;wobble:number;underline:number;pulse:number;contour:number;panel:number};
 A:Cell;B:Cell;O:Cell[];PL:Cell;PR:Cell;K:Cell[];U:Cell[];Y:Cell;H:Cell[];
 strands:Strand[];nodes:Node_PromptBond[];rows:Row[];fold:{o:number;dy:number};
 eyes:Eye[];gaze:{px:number;py:number;w:number};
 lines:{a:number;b:number;c:number;check:number;typing:number};
};
const cell=(tone:number,w=1):Cell=>({px:0,py:0,hw:0,hh:0,r:0,tone,rot:0,w});
const strand=(tone:number):Strand=>({ax:0,ay:0,bx:0,by:0,r:0,tone,taper:0,w:1});
const ROWS=7;
const ORGANISMS=6,RADII=[26,23,13,11,15,10];
function createWorld():World{
 return {
  env:{free:1,breath:0,wobble:1.2,underline:1,pulse:0,contour:0,panel:0},
  A:cell(0),B:cell(2),O:[cell(0),cell(2),cell(0),cell(2)],PL:cell(0),PR:cell(2),
  K:[cell(1,1.4),cell(1,1.4),cell(1,1.2),cell(1,1.2)],U:[cell(2),cell(2)],Y:cell(3),H:[cell(1.6,1.3),cell(1.6,1.3)],
  strands:Array.from({length:8},(_,i)=>strand(i>5?0:1)),
  nodes:Array.from({length:SLOTS},()=>({px:0,py:0,o:0,s:1,t:1,free:1,rip:1,flash:0,busy:0})),
  rows:Array.from({length:ROWS},()=>({o:0,dy:0,p:0,g:0})),fold:{o:0,dy:0},
  eyes:Array.from({length:ORGANISMS},()=>({o:1,lid:0})),gaze:{px:0,py:0,w:0},
  lines:{a:0,b:0,c:0,check:0,typing:0},
 };
}

type Roam={x:number;y:number;vx:number;vy:number;tx:number;ty:number;wait:number;r:number;seed:number};
type Capture={t0:number;from:Point[]};
const createRoam=():Roam[]=>RADII.map((r,i)=>({x:0,y:0,vx:0,vy:0,tx:0,ty:0,wait:0,r,seed:i*1.7}));
function damp(r:Roam,tx:number,ty:number,smooth:number,dt:number){
 const omega=2/smooth,x=omega*dt,ex=1/(1+x+.48*x*x+.235*x*x*x);
 const cx=r.x-tx,cy=r.y-ty,ux=(r.vx+omega*cx)*dt,uy=(r.vy+omega*cy)*dt;
 r.vx=(r.vx-omega*ux)*ex;r.vy=(r.vy-omega*uy)*ex;r.x=tx+(cx+ux)*ex;r.y=ty+(cy+uy)*ex;
}

type Point={x:number;y:number};
type Size={w:number;h:number};
type Rect={cx:number;cy:number;hw:number;hh:number};
type Layout={
 W:number;H:number;k:number;field:Rect;panel:Rect&{left:number;right:number;top:number;bottom:number};composerDy:number;
 endL:Point;endR:Point;docks:Point[];rest:Point[];bounds:{x0:number;y0:number;x1:number;y1:number};
 slots:Point[];rims:Point[];holds:Point[];roomy:boolean;headFit:number|null;
 rows:Point[];reply:{x:number;y:number;w:number;h:number};
};
function measure(stage:HTMLElement,form:HTMLElement,panel:HTMLElement,rowEls:(HTMLElement|null)[],replyEl:HTMLElement|null,formDy:number):Layout|null{
 const s=stage.getBoundingClientRect(),f=form.getBoundingClientRect(),p=panel.getBoundingClientRect();
 if(!s.width||!f.width||!p.width)return null;
 const W=s.width,H=s.height,cx=f.left-s.left+f.width/2,cy=f.top-s.top+f.height/2-formDy;
 const hw=f.width/2+10,hh=f.height/2+6,k=Math.min(1.8,Math.max(.62,hw/290));
 const pl=p.left-s.left,pt=p.top-s.top,pcx=pl+p.width/2,pcy=pt+p.height/2,phw=p.width/2+10,phh=p.height/2+8;
 const composerDy=pt+p.height-f.height/2-10*k-cy;
 const inset=Math.min(90,H*.1),bounds={x0:40*k,y0:inset,x1:W-40*k,y1:H-inset};
 const place=(x:number,y:number):Point=>({x:Math.min(bounds.x1,Math.max(bounds.x0,x)),y:Math.min(bounds.y1,Math.max(bounds.y0,y))});
 const endL={x:cx-hw+hh*.3,y:cy},endR={x:cx+hw-hh*.3,y:cy};
 const rows=Array.from({length:ROWS},(_,i)=>{const el=rowEls[i];return el?{x:pl+el.offsetLeft+10,y:pt+el.offsetTop+el.offsetHeight/2}:{x:pcx,y:pcy};});
 const reply=replyEl?{x:pl+replyEl.offsetLeft,y:pt+replyEl.offsetTop,w:replyEl.offsetWidth,h:replyEl.offsetHeight}:{x:pcx-60,y:pcy,w:120,h:40};
 const left=pcx-phw,right=pcx+phw,top=pcy-phh,bottom=pcy+phh;
 const roomy=left>=230*k&&W-right>=230*k;
 const hdEl=stage.querySelector<HTMLElement>('.prompt-headline'),hd=hdEl?.getBoundingClientRect(),head=hd&&hd.width?{l:hd.left-s.left,r:hd.right-s.left,t:hd.top-s.top,b:hd.bottom-s.top}:null;
 const headFit=roomy&&hdEl&&hd&&hd.width?parseFloat(getComputedStyle(hdEl).fontSize)*(W-2*(184*k+clearX(k)))/hd.width:null;
 const slots=scatter(W,H,k,{left,right},roomy,head);
 const cl=(v:number,lo:number,hi:number)=>Math.min(hi,Math.max(lo,v));
 const rims=slots.map(sl=>sl.x<left||sl.x>right?{x:sl.x<left?left+6:right-6,y:cl(sl.y,top+24*k,bottom-24*k)}:{x:cl(sl.x,left+24*k,right-24*k),y:sl.y<pcy?top+6:bottom-6});
 const hx=roomy?18*k:-4;
 const holds=[{x:left-hx,y:top+78*k},{x:right+hx,y:top+78*k},{x:left-hx,y:top+150*k},{x:right+hx,y:top+150*k}];
 return {W,H,k,field:{cx,cy,hw,hh},panel:{cx:pcx,cy:pcy,hw:phw,hh:phh,left,right,top,bottom},composerDy,
  endL,endR,bounds,
  docks:[endL,endR,{x:cx-hw*.35,y:cy-hh+3},{x:cx+hw*.3,y:cy-hh+3},{x:cx-hw*.05,y:cy+hh-3},{x:cx+hw*.5,y:cy+hh-3}],
  rest:[place(cx-hw*.75,cy-hh-80*k),place(cx+hw*.7,cy+hh+78*k),place(cx-hw-150*k,cy-40*k),place(cx+hw*.25,cy-hh-150*k),place(cx-hw*.3,cy+hh+140*k),place(cx+hw+160*k,cy+30*k)],
  slots,rims,holds,roomy,rows,reply,headFit,
 };
}
const clearX=(k:number)=>50*k+6;
function scatter(W:number,H:number,k:number,panel:{left:number;right:number},roomy:boolean,head:{l:number;r:number;t:number;b:number}|null=null):Point[]{
 let seed=11;const rnd=()=>{seed=(seed*48271)%2147483647;return seed/2147483647;};
 const labelW=roomy?150*k:0,rowH=roomy?62*k:44,per=SLOTS/2;
 const bands=roomy?[{x0:34*k+labelW,x1:panel.left-74*k},{x0:panel.right+74*k,x1:W-34*k-labelW}]:[{x0:24,x1:Math.max(24,panel.left-44)},{x0:Math.min(W-24,panel.right+44),x1:W-24}];
 const y0=roomy?108*k:92,y1=H-(roomy?134*k:124);
 const rows=Math.max(per,Math.floor((y1-y0)/rowH)),step=(y1-y0)/rows,slack=Math.max(0,step-rowH);
 const pick=()=>{const idx=Array.from({length:rows},(_,i)=>i);for(let i=idx.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[idx[i],idx[j]]=[idx[j],idx[i]];}return idx.slice(0,per);};
 const chosen=[pick(),pick()],pts:Point[]=[];
 const edge=roomy?30*k:22;
 for(let i=0;i<SLOTS;i++){const b=bands[i%2],row=chosen[i%2][i>>1];pts.push({x:Math.min(W-edge,Math.max(edge,b.x0+rnd()*(b.x1-b.x0))),y:y0+row*step+rowH/2+rnd()*slack});}
 if(head){const hx=roomy?clearX(k):18+7+6,hy=(roomy?28*k:18)+6*k+4;
  const hits=(p:Point)=>p.y+hy>head.t&&p.y-hy<head.b&&p.x+hx>head.l&&p.x-hx<head.r;
  for(const side of [0,1]){
   const b=bands[side],out=side?head.r+hx:head.l-hx,room=side?out<=Math.max(b.x0,b.x1):out>=Math.min(b.x0,b.x1),mine=pts.filter((_,i)=>i%2===side);
   if(!room&&mine.some(hits)){const lo=y0+rowH/2,hi=y1-rowH/2,top=Math.min(hi,head.b+hy);if(hi>lo)mine.forEach(p=>{p.y=top+(p.y-lo)*(hi-top)/(hi-lo);});}
   mine.forEach(p=>{if(hits(p))p.x=out;});
  }}
 return pts;
}
const at=(p:Point)=>({px:p.x,py:p.y});
const zero={hw:0,hh:0,r:0};
const pocket=(size:Size,k:number,anchor:Point)=>({px:anchor.x,py:anchor.y,hw:size.w/2+9*k,hh:size.h/2+9*k,r:Math.min(size.h/2+9*k,22*k)});
function floatPose(w:World,L:Layout,env:Env){
 w.nodes.forEach((n,i)=>{Object.assign(n,{...at(L.slots[i]),o:env[i]?1:0,s:1,t:1,free:1,rip:1,flash:0,busy:0});});
}
function restPose(w:World,L:Layout,roam:Roam[],env:Env){
 const k=L.k;Object.assign(w.env,{free:1,breath:0,wobble:1.2,underline:1,pulse:0,contour:0,panel:0});
 [w.A,w.B,...w.O].forEach((c,i)=>{const r=RADII[i]*k;Object.assign(c,{...at(L.rest[i]),hw:r,hh:r,r,rot:0});const o=roam[i];o.x=L.rest[i].x;o.y=L.rest[i].y;o.vx=o.vy=0;o.r=r;o.wait=0;o.tx=o.x;o.ty=o.y;});
 for(const c of [w.PL,w.PR,...w.K,...w.U,w.Y,...w.H])Object.assign(c,{px:L.field.cx,py:L.field.cy,...zero,rot:0});
 for(const s of w.strands)Object.assign(s,{ax:L.field.cx,ay:L.field.cy,bx:L.field.cx,by:L.field.cy,r:0,taper:0});
 floatPose(w,L,env);for(const r of w.rows){r.o=0;r.dy=0;r.p=0;r.g=0;}w.fold.o=0;w.fold.dy=0;
 for(const e of w.eyes){e.o=1;e.lid=0;}Object.assign(w.gaze,{px:L.field.cx,py:L.field.cy,w:0});
 Object.assign(w.lines,{a:0,b:0,c:0,check:0,typing:0});
}
function bondedPose(w:World,L:Layout,roam:Roam[],env:Env){
 restPose(w,L,roam,env);const e=L.field.hh+3,F=L.field;
 Object.assign(w.env,{free:0,breath:1,wobble:1.5,underline:0,contour:.7});
 Object.assign(w.A,{...at(L.endL),hw:e,hh:e,r:e});Object.assign(w.B,{...at(L.endR),hw:e,hh:e,r:e});
 [w.A,w.B,...w.O].forEach((c,i)=>{const o=roam[i];o.x=L.docks[i].x;o.y=L.docks[i].y;o.vx=o.vy=0;if(i>1)Object.assign(c,{...at(L.docks[i]),...zero});});
 const half=(F.cx-L.endL.x)/2+8;
 Object.assign(w.PL,{px:L.endL.x+half,py:F.cy,hw:half,hh:F.hh+2,r:F.hh+2});
 Object.assign(w.PR,{px:L.endR.x-half,py:F.cy,hw:half,hh:F.hh+2,r:F.hh+2});
 w.eyes.forEach((e,i)=>{if(i>0)Object.assign(e,{o:0,lid:1});});Object.assign(w.gaze,{px:F.cx,py:F.cy,w:1});
}
function docksFor(L:Layout,env:Env,s:Story):Point[]{
 const used=new Set<number>();
 return s.woven.map(th=>{const a=slotOf(env,th.title),sd=a>=0&&L.slots[a].x>=L.W/2?1:0,i=used.has(sd)?sd+2:sd;used.add(sd);return L.holds[i];});
}
function holdPose(w:World,L:Layout,env:Env,s:Story){
 const k=L.k,docks=docksFor(L,env,s);s.woven.forEach((th,i)=>{const a=slotOf(env,th.title);if(a<0)return;const D=docks[i];Object.assign(w.nodes[a],{...at(D),s:.8,t:0,free:0});Object.assign(w.H[i],{...at(D),hw:26*k,hh:24*k,r:18*k,rot:0});});
}
const headL=(L:Layout)=>({px:L.panel.left+30*L.k,py:L.panel.top+4*L.k,hw:22*L.k,hh:22*L.k,r:22*L.k});
const headR=(L:Layout)=>({px:L.panel.right-30*L.k,py:L.panel.top+4*L.k,hw:20*L.k,hh:20*L.k,r:20*L.k});
const bodyL=(L:Layout)=>({px:L.panel.cx-L.panel.hw*.22,py:L.panel.cy,hw:L.panel.hw*.78,hh:L.panel.hh,r:30*L.k});
const bodyR=(L:Layout)=>({px:L.panel.cx+L.panel.hw*.22,py:L.panel.cy,hw:L.panel.hw*.78,hh:L.panel.hh,r:30*L.k});
function panelPose(w:World,L:Layout,roam:Roam[],upTo:number,folded:boolean,env:Env,s:Story){
 bondedPose(w,L,roam,env);
 if(upTo>4)holdPose(w,L,env,s);
 Object.assign(w.env,{panel:1,contour:.3});
 Object.assign(w.A,headL(L));Object.assign(w.B,headR(L));Object.assign(w.PL,bodyL(L));Object.assign(w.PR,bodyR(L));
 Object.assign(w.gaze,{px:L.panel.cx,py:L.panel.top+40*L.k,w:1});
 w.rows[0].o=1;w.fold.o=folded?1:0;
 const done=(i:number)=>{const r=w.rows[i];r.o=1;r.g=1;};
 if(upTo>3)done(1);if(upTo>4)done(2);if(upTo>5)done(3);
 if(upTo>6){w.rows[4].o=1;Object.assign(w.lines,{a:1,b:1,c:1,check:1});}
 if(upTo>7)done(5);if(upTo>8)done(6);
}

type Beat={seq:AnimationSequence;still:number};
const flow=[.6,0,.15,1] as const,settle=[.4,0,.2,1] as const,haul=[.65,0,.35,1] as const,inOut='easeInOut' as const,out='easeOut' as const;
const spring=(stiffness:number,damping:number)=>({type:'spring' as const,stiffness,damping});
const lookAt=(w:World,p:Point,t:number,d=.4):AnimationSequence[number]=>[w.gaze as any,{...at(p),w:1},{duration:d,at:t}];
const home=(w:World,L:Layout,t:number):AnimationSequence[number]=>[w.gaze as any,{px:L.panel.cx,py:L.panel.top+40*L.k},{duration:.5,at:t}];
const land=(w:World,L:Layout,i:number,t:number):AnimationSequence=>[[w.rows[i] as any,{dy:8*L.k,g:0,p:0},{duration:.01,at:0}],[w.rows[i] as any,{o:1,dy:0},{duration:.5,ease:settle,at:t}]];
const arrive=(w:World,i:number,t:number):AnimationSequence=>[[w.rows[i] as any,{g:1},{...spring(240,14),at:t}],...ripple(w,i,t+.02)];
const ripple=(w:World,i:number,t:number):AnimationSequence=>[[w.rows[i] as any,{p:1},{duration:.08,at:t}],[w.rows[i] as any,{p:0},{duration:.85,ease:out,at:t+.1}]];
const surface=(n:Node_PromptBond,M:Point,t:number,text=1):AnimationSequence=>[
 [n as any,{...at(M),o:0,s:.5,t:text,rip:0,flash:0,busy:0},{duration:.01,at:t}],
 [n as any,{o:1,s:1},{...spring(170,13),at:t+.02}],
 [n as any,{flash:1},{duration:.1,at:t+.02}],[n as any,{flash:0},{duration:.5,ease:out,at:t+.12}],
 [n as any,{rip:1},{duration:.8,ease:out,at:t+.04}],
];
const widen=(w:World,t:number,d=.7):AnimationSequence=>[[w.eyes[0] as any,{lid:-.2},{duration:.2,at:t}],[w.eyes[0] as any,{lid:0},{duration:.35,at:t+d}]];
const blink=(w:World,t:number):AnimationSequence=>[[w.eyes[0] as any,{lid:1},{duration:.1,at:t}],[w.eyes[0] as any,{lid:0},{duration:.22,at:t+.12}]];

function bond(w:World,L:Layout):Beat{
 const e=L.field.hh+3,F=L.field,half=(F.cx-L.endL.x)/2+8;
 return {still:3,seq:[
  [w.env as any,{underline:3.2},{duration:.9,ease:out,at:0}],
  lookAt(w,{x:F.cx,y:F.cy},.1,.3),
  [w.env as any,{free:0},{duration:.25,at:.95}],
  [w.A as any,{hw:e,hh:e,r:e},{...spring(300,14),at:.95}],
  [w.B as any,{hw:e,hh:e,r:e},{...spring(300,14),at:1.0}],
  ...w.O.map((c,i):AnimationSequence[number]=>[c as any,zero,{duration:.4,at:1.3+i*.08}]),
  ...w.eyes.slice(2).map((ey,i):AnimationSequence[number]=>[ey as any,{o:0},{duration:.25,at:1.2+i*.08}]),
  [w.PL as any,{px:L.endL.x+2,py:F.cy,hw:2,hh:F.hh+2,r:F.hh+2},{duration:.01,at:.98}],
  [w.PR as any,{px:L.endR.x-2,py:F.cy,hw:2,hh:F.hh+2,r:F.hh+2},{duration:.01,at:1.04}],
  [w.PL as any,{px:L.endL.x+half,hw:half},{duration:1.05,ease:flow,at:1.0}],
  [w.PR as any,{px:L.endR.x-half,hw:half},{duration:1.05,ease:flow,at:1.06}],
  [w.env as any,{underline:0},{duration:.9,at:1.0}],
  [w.eyes[1] as any,{lid:1},{duration:.35,at:1.2}],
  [w.eyes[1] as any,{o:0},{duration:.4,at:1.55}],
  [w.PL as any,{hh:F.hh+9},{duration:.16,ease:out,at:2.0}],
  [w.PR as any,{hh:F.hh+9},{duration:.16,ease:out,at:2.04}],
  [w.A as any,{hw:e+5,hh:e+5,r:e+5},{duration:.16,ease:out,at:2.0}],
  [w.B as any,{hw:e+5,hh:e+5,r:e+5},{duration:.16,ease:out,at:2.04}],
  [w.PL as any,{hh:F.hh+2},{...spring(170,13),at:2.18}],
  [w.PR as any,{hh:F.hh+2},{...spring(170,13),at:2.22}],
  [w.A as any,{hw:e,hh:e,r:e},{...spring(170,13),at:2.18}],
  [w.B as any,{hw:e,hh:e,r:e},{...spring(170,13),at:2.22}],
  [w.eyes[0] as any,{lid:.5},{duration:.12,at:2.05}],
  [w.eyes[0] as any,{lid:0},{duration:.3,at:2.3}],
  [w.env as any,{contour:.7},{duration:1,at:1.6}],
  [w.env as any,{wobble:1.5},{duration:.8,at:2.0}],
  [w.env as any,{breath:1},{duration:.6,at:2.4}],
 ]};
}

function launch(w:World,L:Layout,again:boolean,fresh:number[]):Beat{
 const k=L.k,[sent,...rest]=w.rows;
 const arrivals=fresh.flatMap((i,j):AnimationSequence=>[[w.nodes[i] as any,{o:0,free:1},{duration:.01,at:0}],...surface(w.nodes[i],L.slots[i],.6+j*.18)]);
 if(again)return {still:1.3,seq:[
  [rest as any,{o:0,g:0,p:0},{duration:.3,at:0}],
  [w.lines as any,{a:0,b:0,c:0,check:0,typing:0},{duration:.3,at:0}],
  [sent as any,{dy:-12*k,o:0},{duration:.3,ease:settle,at:0}],
  [w.fold as any,{o:0,dy:8*k},{duration:.01,at:0}],
  [w.fold as any,{o:1,dy:0},{duration:.4,ease:settle,at:.25}],
  [sent as any,{dy:26*k},{duration:.01,at:.5}],
  [sent as any,{dy:0,o:1},{duration:.55,ease:settle,at:.55}],
  ...blink(w,.35),
  home(w,L,.5),
  ...arrivals,
 ]};
 return {still:1.4,seq:[
  [sent as any,{dy:26*k,o:0},{duration:.01,at:0}],
  [w.PL as any,bodyL(L),{duration:1.0,ease:flow,at:.1}],
  [w.PR as any,bodyR(L),{duration:1.0,ease:flow,at:.1}],
  [w.env as any,{panel:1},{duration:1.0,ease:flow,at:.1}],
  [w.A as any,headL(L),{duration:.9,ease:flow,at:.15}],
  [w.B as any,headR(L),{duration:.9,ease:flow,at:.2}],
  [w.env as any,{contour:.3},{duration:.8,at:.3}],
  home(w,L,.4),
  [sent as any,{dy:0,o:1},{duration:.55,ease:settle,at:.55}],
  ...arrivals,
 ]};
}

function recall(w:World,L:Layout,sizes:Size[],env:Env,s:Story):Beat{
 const k=L.k,[S0,S1]=w.strands,[K0,K1]=w.K,[U0,U1]=w.U,row=L.rows[1];
 const one=(S:Strand,K:Cell,U:Cell,slot:number,t:number):AnimationSequence=>{const n=w.nodes[slot],M=L.slots[slot],P=L.rims[slot],pk=pocket(sizes[slot],k,M),tug={x:M.x+(P.x-M.x)*.18,y:M.y+(P.y-M.y)*.18};return [
  lookAt(w,M,t+.05),
  [S as any,{ax:P.x,ay:P.y,bx:P.x,by:P.y,r:9*k,taper:.35,tone:1},{duration:.01,at:t}],
  [S as any,{bx:M.x,by:M.y},{duration:.7,ease:out,at:t+.02}],
  [n as any,{free:0},{duration:.3,at:t+.6}],
  [K as any,{px:M.x,py:M.y,...zero,r:pk.r,tone:1,w:1.3,rot:0},{duration:.01,at:t+.72}],
  [K as any,{hw:pk.hw,hh:pk.hh},{...spring(210,14),at:t+.75}],
  [n as any,{flash:1},{duration:.1,at:t+.75}],[n as any,{flash:0},{duration:.4,ease:out,at:t+.85}],
  [n as any,{s:1.1},{duration:.14,ease:out,at:t+.75}],
  [n as any,{s:1},{duration:.3,at:t+.89}],
  [[n,K] as any,{px:tug.x,py:tug.y},{duration:.5,ease:inOut,at:t+1.0}],
  [S as any,{bx:tug.x,by:tug.y},{duration:.5,ease:inOut,at:t+1.0}],
  [U as any,{px:tug.x,py:tug.y,...zero,r:5*k,tone:1,w:1.3,rot:0},{duration:.01,at:t+1.45}],
  [U as any,{hw:6*k,hh:6*k},{duration:.15,at:t+1.47}],
  [S as any,{r:12*k},{duration:.3,at:t+1.5}],
  [n as any,{s:.9},{duration:.5,at:t+1.5}],
  [U as any,{px:P.x,py:P.y},{duration:.6,ease:inOut,at:t+1.62}],
  [U as any,{hw:9*k,hh:9*k,r:9*k},{duration:.15,at:t+2.22}],
  [w.env as any,{pulse:1},{duration:.12,at:t+2.22}],
  [w.env as any,{pulse:0},{duration:.35,at:t+2.34}],
  [U as any,{px:row.x,py:row.y},{duration:.4,ease:inOut,at:t+2.45}],
  [U as any,zero,{duration:.25,at:t+2.85}],
  [K as any,zero,{duration:.35,at:t+2.3}],
  [S as any,{r:8*k},{duration:.2,at:t+2.3}],
  [S as any,{bx:P.x,by:P.y,taper:.9},{duration:.5,ease:inOut,at:t+2.5}],
  [S as any,{r:0},{duration:.2,at:t+2.95}],
  [n as any,{px:M.x,py:M.y,s:1},{...spring(120,12),at:t+2.4}],
  [n as any,{free:1},{duration:.5,at:t+2.6}],
 ];};
 const a=slotOf(env,s.memories[0].title),b=slotOf(env,s.memories[1].title);
 return {still:2.0,seq:[
  ...one(S0,K0,U0,a<0?0:a,0),
  ...one(S1,K1,U1,b<0?2:b,.5),
  ...widen(w,.8,1.2),
  ...land(w,L,1,2.8),...arrive(w,1,3.35),...ripple(w,1,3.9),
  home(w,L,4.3),
 ]};
}

function prepare(w:World,L:Layout,sizes:Size[],env:Env,s:Story):Beat{
 const k=L.k,[S0,S1]=w.strands,[K0,K1]=w.K,[U0,U1]=w.U,[H0,H1]=w.H,row=L.rows[2];
 const one=(S:Strand,K:Cell,U:Cell,Hc:Cell,slot:number,D:Point,t:number):AnimationSequence=>{const n=w.nodes[slot],M=L.slots[slot],P=L.rims[slot],pk=pocket(sizes[slot],k,M);return [
  lookAt(w,M,t+.05),
  [S as any,{ax:P.x,ay:P.y,bx:P.x,by:P.y,r:8*k,taper:.35,tone:1.6},{duration:.01,at:t}],
  [S as any,{bx:M.x,by:M.y},{duration:.65,ease:out,at:t+.02}],
  [n as any,{free:0},{duration:.3,at:t+.55}],
  [K as any,{px:M.x,py:M.y,...zero,r:pk.r,tone:1.6,w:1.3,rot:0},{duration:.01,at:t+.67}],
  [K as any,{hw:pk.hw,hh:pk.hh},{duration:.35,ease:out,at:t+.7}],
  [n as any,{flash:1},{duration:.1,at:t+.7}],[n as any,{flash:0},{duration:.4,ease:out,at:t+.8}],
  [n as any,{t:0},{duration:.25,at:t+1.0}],
  [S as any,{r:11*k},{duration:.3,at:t+1.1}],
  [[n,K] as any,{px:D.x,py:D.y},{duration:.9,ease:haul,at:t+1.15}],
  [n as any,{s:.8},{duration:.9,ease:haul,at:t+1.15}],
  [K as any,{hw:pk.hw*.8,hh:pk.hh*.8},{duration:.9,ease:haul,at:t+1.15}],
  [S as any,{bx:D.x,by:D.y},{duration:.9,ease:haul,at:t+1.15}],
  [Hc as any,{px:D.x,py:D.y,hw:pk.hw*.8,hh:pk.hh*.8,r:pk.r,tone:1.6,w:1.3,rot:0},{duration:.01,at:t+2.05}],
  [K as any,zero,{duration:.01,at:t+2.06}],
  [S as any,{bx:P.x,by:P.y,taper:.9},{duration:.4,ease:inOut,at:t+2.1}],
  [S as any,{r:0},{duration:.2,at:t+2.45}],
  [U as any,{px:D.x,py:D.y,...zero,r:5*k,tone:1.6,w:1.3,rot:0},{duration:.01,at:t+2.1}],
  [U as any,{hw:6*k,hh:6*k},{duration:.15,at:t+2.12}],
  [U as any,{px:row.x,py:row.y},{duration:.55,ease:inOut,at:t+2.3}],
  [U as any,zero,{duration:.25,at:t+2.85}],
  [w.env as any,{pulse:1},{duration:.1,at:t+2.3}],
  [w.env as any,{pulse:0},{duration:.3,at:t+2.4}],
 ];};
 const a=slotOf(env,s.woven[0].title),b=slotOf(env,s.woven[1].title),docks=docksFor(L,env,s);
 return {still:2.3,seq:[
  ...one(S0,K0,U0,H0,a<0?3:a,docks[0],0),
  ...one(S1,K1,U1,H1,b<0?6:b,docks[1],.45),
  ...land(w,L,2,2.7),...arrive(w,2,3.2),...ripple(w,2,3.7),
  home(w,L,4.0),
 ]};
}

function reach(w:World,L:Layout,sizes:Size[],env:Env,s:Story):Beat{
 const a0=slotOf(env,s.agents[0].title),b0=slotOf(env,s.agents[1].title),a=a0<0?1:a0,b=b0<0?5:b0;
 const others=env.map((t,i)=>t?.kind==='subagent'&&i!==b?i:-1).filter(i=>i>=0);
 const inform=others.flatMap((i,j):AnimationSequence=>{const n=w.nodes[i],t=2.85+j*.22;return [
  [n as any,{rip:0,flash:.7},{duration:.01,at:t}],
  [n as any,{rip:1},{duration:.9,ease:out,at:t+.02}],
  [n as any,{flash:0},{duration:.5,ease:out,at:t+.12}],
  [n as any,{busy:1},{duration:.15,at:t+.05}],
  [n as any,{busy:0},{duration:.3,at:t+1.1}],
 ];});
 const k=L.k,[S0,S1]=w.strands,[K0,K1,K2]=w.K,[U0,U1]=w.U,row=L.rows[3];
 const one=(S:Strand,U:Cell,K:Cell,slot:number,t:number):AnimationSequence=>{const n=w.nodes[slot],T=L.slots[slot],Q=L.rims[slot],pk=pocket(sizes[slot],k,T);return [
  lookAt(w,T,t+.05),
  [S as any,{ax:Q.x,ay:Q.y,bx:Q.x,by:Q.y,r:8*k,taper:.3,tone:2},{duration:.01,at:t}],
  [S as any,{bx:T.x,by:T.y},{duration:.7,ease:out,at:t+.02}],
  [n as any,{free:0},{duration:.3,at:t+.6}],
  [U as any,{px:pk.px,py:pk.py,...zero,r:pk.r,tone:2,rot:0},{duration:.01,at:t+.72}],
  [U as any,{hw:pk.hw,hh:pk.hh},{...spring(240,15),at:t+.75}],
  [n as any,{s:1.08},{duration:.14,ease:out,at:t+.75}],
  [n as any,{s:1},{duration:.3,at:t+.89}],
  [K as any,{px:row.x,py:row.y,hw:7*k,hh:7*k,r:7*k,tone:0,w:1.4},{duration:.01,at:t+.9}],
  [K as any,at(Q),{duration:.45,ease:inOut,at:t+.95}],
  [K as any,at(T),{duration:.75,ease:inOut,at:t+1.4}],
  [K as any,zero,{duration:.15,at:t+2.15}],
  [n as any,{s:1.2},{duration:.15,ease:out,at:t+2.1}],
  [n as any,{s:1},{duration:.4,at:t+2.25}],
  [n as any,{busy:1},{duration:.2,at:t+2.15}],
  [n as any,{busy:0},{duration:.2,at:t+2.95}],
  [U as any,zero,{duration:.4,at:t+3.05}],
  [S as any,{bx:Q.x,by:Q.y,taper:.9},{duration:.5,ease:inOut,at:t+3.05}],
  [S as any,{r:0},{duration:.2,at:t+3.5}],
  [n as any,{free:1},{duration:.5,at:t+3.1}],
 ];};
 return {still:1.9,seq:[
  ...one(S0,U0,K0,a,0),
  ...one(S1,U1,K1,b,.45),
  [w.nodes[b] as any,{rip:0},{duration:.01,at:2.7}],
  [w.nodes[b] as any,{rip:1},{duration:.8,ease:out,at:2.72}],
  ...inform,
  ...land(w,L,3,.4),...arrive(w,3,.75),
  [w.eyes[1] as any,{o:1,lid:0},{duration:.35,at:.4}],
  [w.eyes[1] as any,{lid:1},{duration:.3,at:3.5}],
  [w.eyes[1] as any,{o:0},{duration:.3,at:3.8}],
  [K2 as any,{...at(L.slots[a]),hw:6*k,hh:6*k,r:6*k,tone:2,w:1.4},{duration:.01,at:2.4}],
  [K2 as any,at(L.rims[a]),{duration:.55,ease:inOut,at:2.45}],
  [K2 as any,{px:row.x,py:row.y},{duration:.4,ease:inOut,at:3.0}],
  [K2 as any,zero,{duration:.2,at:3.4}],
  ...ripple(w,3,3.35),
  home(w,L,3.9),
 ]};
}

function check(w:World,L:Layout):Beat{
 const k=L.k,[K0]=w.K,R=L.reply,a=1,b=1,c=1;
 return {still:3,seq:[
  [w.rows[4] as any,{dy:8*k},{duration:.01,at:0}],
  [w.rows[4] as any,{o:1,dy:0},{duration:.4,ease:settle,at:0}],
  [w.lines as any,{typing:1},{duration:.3,at:.1}],
  [w.eyes[0] as any,{lid:.35},{duration:.3,at:.2}],
  lookAt(w,{x:R.x+R.w/2,y:R.y+R.h/2},.2),
  [w.lines as any,{typing:0},{duration:.25,at:1.0}],
  [w.eyes[0] as any,{lid:0},{duration:.3,at:1.1}],
  [w.lines as any,{a},{duration:.5,ease:out,at:1.1}],
  [w.lines as any,{b},{duration:.5,ease:out,at:1.35}],
  [w.lines as any,{c},{duration:.45,ease:out,at:1.6}],
  [K0 as any,{px:R.x+R.w-8,py:R.y+R.h+2,...zero,tone:1,w:1.4,rot:0},{duration:.01,at:2.05}],
  [K0 as any,{hw:7*k,hh:7*k,r:7*k},{duration:.15,at:2.1}],
  [K0 as any,{px:R.x+8},{duration:.9,ease:inOut,at:2.25}],
  [K0 as any,zero,{duration:.2,at:3.15}],
  [w.lines as any,{check:1},{duration:.3,at:3.0}],
  ...blink(w,3.05),
  home(w,L,3.5),
 ]};
}

function keep(w:World,L:Layout,env:Env,s:Story):Beat{
 const k=L.k,[S0,S1]=w.strands,[K0,K1]=w.K,R=L.reply,row=L.rows[5];
 const a0=slotOf(env,s.kept.title),b0=slotOf(env,s.report.title),a=a0<0?SLOTS-2:a0,b=b0<0?SLOTS-1:b0;
 const nA=w.nodes[a],nB=w.nodes[b],MA=L.slots[a],PA=L.rims[a],MB=L.slots[b],PB=L.rims[b];
 return {still:3.4,seq:[
  [nA as any,{...at(MA),o:0,s:.4,t:0,free:0,rip:1,flash:0,busy:0},{duration:.01,at:0}],
  [nB as any,{...at(MB),o:0,s:.4,t:0,free:0,rip:1,flash:0,busy:0},{duration:.01,at:0}],
  [K0 as any,{px:R.x+R.w*.4,py:R.y+R.h*.55,...zero,tone:1,w:1.5,rot:0},{duration:.01,at:0}],
  [K0 as any,{hw:8*k,hh:8*k,r:8*k},{duration:.2,at:.1}],
  lookAt(w,{x:R.x+R.w*.4,y:R.y+R.h*.55},0,.3),
  [K0 as any,{px:row.x,py:row.y},{duration:.7,ease:inOut,at:.4}],
  ...land(w,L,5,.85),...arrive(w,5,1.15),
  [K1 as any,{px:row.x,py:row.y,...zero,tone:3,w:1.5,rot:0},{duration:.01,at:1.2}],
  [K1 as any,{hw:8*k,hh:8*k,r:8*k},{duration:.2,at:1.25}],
  [K0 as any,at(PA),{duration:.5,ease:inOut,at:1.3}],
  [K1 as any,at(PB),{duration:.5,ease:inOut,at:1.45}],
  [S1 as any,{ax:PA.x,ay:PA.y,bx:PA.x,by:PA.y,r:9*k,taper:.3,tone:1},{duration:.01,at:1.4}],
  [S1 as any,{bx:MA.x,by:MA.y},{duration:.85,ease:out,at:1.45}],
  [K0 as any,at(MA),{duration:.85,ease:out,at:1.8}],
  [S0 as any,{ax:PB.x,ay:PB.y,bx:PB.x,by:PB.y,r:9*k,taper:.3,tone:3},{duration:.01,at:1.55}],
  [S0 as any,{bx:MB.x,by:MB.y},{duration:.85,ease:out,at:1.6}],
  [K1 as any,at(MB),{duration:.85,ease:out,at:1.95}],
  lookAt(w,MA,1.9),lookAt(w,MB,2.5),
  [K0 as any,{hw:0,hh:0},{duration:.3,at:2.7}],
  ...surface(nA,MA,2.66,0),
  [nA as any,{t:1},{duration:.3,at:2.95}],
  [K1 as any,{hw:0,hh:0},{duration:.3,at:2.85}],
  ...surface(nB,MB,2.81,0),
  [nB as any,{t:1},{duration:.3,at:3.1}],
  ...blink(w,3.2),
  [S1 as any,{bx:PA.x,by:PA.y,taper:.95},{duration:.5,ease:inOut,at:3.3}],
  [S1 as any,{r:0},{duration:.2,at:3.75}],
  [S0 as any,{bx:PB.x,by:PB.y,taper:.95},{duration:.5,ease:inOut,at:3.45}],
  [S0 as any,{r:0},{duration:.2,at:3.9}],
  [nA as any,{free:1},{duration:.6,at:3.4}],
  [nB as any,{free:1},{duration:.6,at:3.55}],
  home(w,L,3.9),
 ]};
}

function notice(w:World,L:Layout):Beat{
 const k=L.k,[K0,K1,K2]=w.K,Y=w.Y,row=L.rows[6],y=L.panel.bottom-9*k;
 const dot=(K:Cell,x:number,t:number):AnimationSequence=>[
  [K as any,{px:x,py:y,...zero,r:5*k,tone:3,w:1.6,rot:0},{duration:.01,at:t}],
  [K as any,{hw:5*k,hh:5*k},{duration:.18,ease:out,at:t+.02}],
  [w.env as any,{pulse:1},{duration:.1,at:t}],
  [w.env as any,{pulse:0},{duration:.32,at:t+.1}],
 ];
 return {still:2.6,seq:[
  ...[1,2,3,5].flatMap((i,j)=>ripple(w,i,.05+j*.16)),
  ...dot(K0,L.panel.cx-44*k,0),...dot(K1,L.panel.cx,.32),...dot(K2,L.panel.cx+44*k,.64),
  lookAt(w,{x:L.panel.cx,y},.3),
  [[K0,K1,K2] as any,{px:row.x,py:row.y,hw:7*k,hh:7*k,r:7*k},{duration:.55,ease:inOut,at:1.05}],
  [[K1,K2] as any,zero,{duration:.2,at:1.5}],
  [Y as any,{px:L.panel.right+2,py:row.y,...zero,r:16*k,tone:3,rot:0},{duration:.01,at:1.5}],
  [Y as any,{hw:18*k,hh:14*k},{...spring(210,15),at:1.55}],
  [K0 as any,zero,{duration:.3,at:1.6}],
  ...land(w,L,6,1.4),...arrive(w,6,1.55),...ripple(w,6,2.7),
  lookAt(w,{x:row.x+40*k,y:row.y},1.6),
  ...widen(w,1.7,.9),
  [Y as any,{hw:0,hh:0,px:L.panel.right-8},{duration:.5,ease:inOut,at:4.2}],
  home(w,L,4.4),
 ]};
}

function release(w:World,L:Layout,env:Env,s:Story):Beat{
 return {still:1,seq:s.woven.flatMap((th,i):AnimationSequence=>{const a=slotOf(env,th.title);if(a<0)return [];const n=w.nodes[a],M=L.slots[a];return [
  [w.H[i] as any,zero,{duration:.35,at:.05+i*.1}],
  [n as any,{px:M.x,py:M.y,s:1},{...spring(110,12),at:.1+i*.1}],
  [n as any,{t:1},{duration:.3,at:.55+i*.1}],
  [n as any,{free:1},{duration:.5,at:.45+i*.1}],
 ];})};
}

const LANDED:Record<number,number>={3:2.8,4:1.2,5:.4,6:0,7:.85,8:1.4};
function buildBeat(beat:number,w:World,L:Layout,run:number,sizes:Size[],again:boolean,env:Env,fresh:number[]):Beat|null{
 const s=storyAt(run);
 switch(beat){
  case 1:return bond(w,L);
  case 2:return launch(w,L,again,fresh);
  case 3:return recall(w,L,sizes,env,s);
  case 4:return prepare(w,L,sizes,env,s);
  case 5:return reach(w,L,sizes,env,s);
  case 6:return check(w,L);
  case 7:return keep(w,L,env,s);
  case 8:return notice(w,L);
  case LAST:return release(w,L,env,s);
  default:return null;
 }
}

type Fold={prompt:string;kept:string};
const UiContext=React.createContext(1);
function ownsKeys(stage:HTMLElement|null,target:Element|null){const host=stage?.closest('[data-slot=prompt-bond]')??stage;return !target||target===document.body||target===document.documentElement||!host||host.contains(target);}
function PromptBondImpl({moving,quiet}:{moving:boolean;active?:boolean;quiet:boolean}){
 const [beat,setBeat]=React.useState(0);
 const [prompt,setPrompt]=React.useState('');
 const [sent,setSent]=React.useState('');
 const [run,setRun]=React.useState(0);
 const [folds,setFolds]=React.useState<Fold[]>([]);
 const [noted,setNoted]=React.useState(false);
 const [stopped,setStopped]=React.useState(false);
 const [stoppedAt,setStoppedAt]=React.useState(0);
 const [compact,setCompact]=React.useState(false);
 const [checkOn,setCheckOn]=React.useState(false);
 const [glyphOn,setGlyphOn]=React.useState<boolean[]>(()=>Array(ROWS).fill(false));
 const [picked,setPicked]=React.useState<string|null>(null);
 const [ready,setReady]=React.useState(0);
 const glyphRef=React.useRef<boolean[]>(Array(ROWS).fill(false));
 const input=React.useRef<HTMLInputElement>(null),form=React.useRef<HTMLFormElement>(null),stage=React.useRef<HTMLDivElement>(null),panel=React.useRef<HTMLDivElement>(null);
 const membrane=React.useRef<MembraneHandle>(null);
 const eyeRefs=React.useRef<(HTMLSpanElement|null)[]>([]),foldEl=React.useRef<HTMLDivElement>(null);
 const nodeRefs=React.useRef<(HTMLSpanElement|null)[]>([]),rowRefs=React.useRef<(HTMLElement|null)[]>([]),reply=React.useRef<HTMLDivElement>(null);
 const world=React.useRef(createWorld()),roam=React.useRef(createRoam()),layout=React.useRef<Layout|null>(null);
 const capture=React.useRef<Capture|null>(null),formDy=React.useRef(0),reached=React.useRef(0),pending=React.useRef<string|null>(null);
 const controls=React.useRef<AnimationPlaybackControls|null>(null),generation=React.useRef(0);
 const clock_=React.useRef(0),pointer=React.useRef<Point|null>(null),checkRef=React.useRef(false);
 const typing=React.useRef<{text:string;at:number;fast:boolean;n:number}|null>(null),typed=React.useRef(false),idle=React.useRef<number|null>(null);
 const scene=React.useRef({cells:Array.from({length:17},():MembraneCell=>({x:0,y:0,hw:0,hh:0,r:0,tone:0,rot:0,w:1})),strands:Array.from({length:8},():MembraneStrand=>({ax:0,ay:0,bx:0,by:0,r:0,tone:0,taper:0,w:1}))});
 const bonded=beat>0;
 const story=storyAt(run),lastFold=folds[folds.length-1];
 const upTo=beat===LAST&&stopped?stoppedAt:beat;
 const played=React.useMemo(():Played[]=>folds.flatMap(f=>{const s=stories.find(x=>x.prompt===f.prompt);return s?[{s,upTo:f.kept?LAST:2}]:[];}),[folds]);
 const env=React.useMemo(()=>envFor(played,story,upTo),[played,story,upTo]);
 const fresh=React.useMemo(()=>beat===2?freshBetween(envFor(played,story,1),env):[],[played,story,env,beat]);
 const state=React.useRef({moving,quiet,beat,prompt,run,sent,stopped,folded:folds.length>0,env});
 React.useLayoutEffect(()=>{state.current={moving,quiet,beat,prompt,run,sent,stopped,folded:folds.length>0,env};},[moving,quiet,beat,prompt,run,sent,stopped,folds.length,env]);
 const prevEnv=React.useRef(env);
 const [lively,setLively]=React.useState(-1);
 React.useEffect(()=>{
  if(!moving||quiet)return;let off=0;
  const id=window.setInterval(()=>{const alive=state.current.env.map((t,i)=>t?i:-1).filter(i=>i>=0);setLively(alive[Math.floor(Math.random()*alive.length)]??-1);off=window.setTimeout(()=>setLively(-1),1300);},2400);
  return()=>{window.clearInterval(id);window.clearTimeout(off);};
 },[moving,quiet]);
 const startRef=React.useRef<()=>void>(()=>{});

 const stepRoam=React.useCallback((i:number,dt:number,L:Layout)=>{
  const R=roam.current,r=R[i],k=L.k,F=L.field,cap=capture.current;
  if(cap){
   const tc=clock_.current-cap.t0,dock=L.docks[i],from=cap.from[i],startAt=.28+i*.07;
   if(tc>=1.3){r.x=dock.x;r.y=dock.y;r.vx=r.vy=0;return;}
   if(tc<startAt){const dx=dock.x-from.x,dy=dock.y-from.y,d=Math.hypot(dx,dy)||1,pull=(i<2?22:12)*k;damp(r,from.x-dx/d*pull,from.y-dy/d*pull,.18,dt);}
   else damp(r,dock.x,dock.y,i<2?.22:.2,dt);
   return;
  }
  r.wait-=dt;
  let dx=r.tx-r.x,dy=r.ty-r.y,d=Math.hypot(dx,dy);
  if(r.wait<=0||d<18*k){
   const b=L.bounds;
   if(Math.random()<.4){const a=Math.random()*Math.PI*2;r.tx=F.cx+Math.cos(a)*(F.hw+70*k+Math.random()*90*k);r.ty=F.cy+Math.sin(a)*(F.hh+60*k+Math.random()*70*k);}
   else{r.tx=b.x0+Math.random()*(b.x1-b.x0);r.ty=b.y0+Math.random()*(b.y1-b.y0);}
   r.tx=Math.min(b.x1,Math.max(b.x0,r.tx));r.ty=Math.min(b.y1,Math.max(b.y0,r.ty));
   r.wait=2.5+Math.random()*4;dx=r.tx-r.x;dy=r.ty-r.y;d=Math.hypot(dx,dy)||1;
  }
  const maxS=(i<2?36:48)*k*(.85+.3*((i*7)%5)/5),maxF=(i<2?60:80)*k,arrive=Math.min(1,d/(140*k));
  let fx=dx/d*maxS*arrive-r.vx,fy=dy/d*maxS*arrive-r.vy;
  const fm=Math.hypot(fx,fy);if(fm>maxF){fx*=maxF/fm;fy*=maxF/fm;}
  for(let j=0;j<ORGANISMS;j++){if(j===i)continue;const ex=r.x-R[j].x,ey=r.y-R[j].y,dd=Math.hypot(ex,ey)||1,minD=r.r+R[j].r+30*k;if(dd<minD){fx+=ex/dd*(minD-dd)*4;fy+=ey/dd*(minD-dd)*4;}}
  const kx=F.hw+30*k-Math.abs(r.x-F.cx),ky=F.hh+26*k-Math.abs(r.y-F.cy);
  if(kx>0&&ky>0){if(kx<ky)fx+=Math.sign(r.x-F.cx||1)*kx*6;else fy+=Math.sign(r.y-F.cy||1)*ky*6;}
  const b=L.bounds;if(r.x<b.x0)fx+=(b.x0-r.x)*5;if(r.x>b.x1)fx+=(b.x1-r.x)*5;if(r.y<b.y0)fy+=(b.y0-r.y)*5;if(r.y>b.y1)fy+=(b.y1-r.y)*5;
  r.vx+=fx*dt;r.vy+=fy*dt;r.x+=r.vx*dt;r.y+=r.vy*dt;
 },[]);

 const paint=React.useCallback((delta:number)=>{
  const w=world.current,L=layout.current,m=membrane.current;if(!L||!m)return;
  const {moving:live,quiet:still}=state.current;
  const dt=live&&!still?Math.min(delta,40)/1000:0;clock_.current+=dt;
  const t=clock_.current,k=L.k,f=w.env.free,p=pointer.current,R=roam.current;
  if(f>0)for(let i=0;i<ORGANISMS;i++)stepRoam(i,dt,L);
  const ty=typing.current;
  if(ty){const per=ty.fast?.5/ty.text.length:.055;const n=Math.min(ty.text.length,Math.floor((t-ty.at)/per));if(n!==ty.n){ty.n=n;setPrompt(ty.text.slice(0,n));}if(n===ty.text.length&&t-ty.at>per*n+(ty.fast?.12:.4)){typing.current=null;startRef.current();}}
  const breath=1+w.env.breath*.012*Math.sin(t*1.9),pulse=w.env.pulse*3*k;
  const out=scene.current.cells;
  const put=(i:number,c:Cell,x=c.px,y=c.py,hw=c.hw,hh=c.hh,r=c.r,rot=c.rot)=>{const o=out[i];o.x=x;o.y=y;o.hw=hw;o.hh=hh;o.r=r;o.tone=c.tone;o.rot=rot;o.w=c.w;};
  const lean=(r:Roam)=>{if(!p||f<=0||capture.current)return {x:0,y:0};const dx=p.x-r.x,dy=p.y-r.y,d=Math.hypot(dx,dy);if(d>150*k||d<1)return {x:0,y:0};const a=(1-d/(150*k))*9*k*f;return {x:dx/d*a,y:dy/d*a};};
  const pos:Point[]=[];
  [w.A,w.B,...w.O].forEach((c,i)=>{
   const r=R[i],sp=Math.hypot(r.vx,r.vy),e=Math.min(.32,sp/(110*k)),ang=sp>1?Math.atan2(r.vy,r.vx):0,l=lean(r),bob=Math.sin(t*1.1+r.seed)*3*k;
   const x=c.px+(r.x+l.x-c.px)*f,y=c.py+(r.y+l.y+bob-c.py)*f;
   const hw=(c.hw+(r.r*(1+e)-c.hw)*f)*breath,hh=(c.hh+(r.r*(1-e*.5)-c.hh)*f)*breath,rr=c.r+(r.r-c.r)*f;
   pos[i]={x,y};put(i,c,x,y,hw,hh,rr,f>0?ang:c.rot);
  });
  put(6,w.PL,w.PL.px,w.PL.py,w.PL.hw,w.PL.hh*breath+pulse);put(7,w.PR,w.PR.px,w.PR.py,w.PR.hw,w.PR.hh*breath+pulse);
  w.K.forEach((c,i)=>put(8+i,c));w.U.forEach((c,i)=>put(12+i,c));put(14,w.Y);w.H.forEach((c,i)=>put(15+i,c));
  const strands=scene.current.strands;
  w.strands.forEach((s,i)=>{Object.assign(strands[i],s);});
  const probe=(i:number,host:Point,target:Point,phase:number)=>{const s=strands[6+i],amt=(capture.current?0:f)*Math.pow(Math.max(0,Math.sin(t*.8+phase)),3);const dx=target.x-host.x,dy=target.y-host.y,d=Math.hypot(dx,dy)||1;s.ax=host.x;s.ay=host.y;s.bx=host.x+dx/d*46*k*amt;s.by=host.y+dy/d*46*k*amt;s.r=9*k*amt;s.taper=.7;s.tone=i?2:0;s.w=1;};
  probe(0,pos[0],{x:L.endL.x+40*k,y:L.field.cy},0);probe(1,pos[1],{x:L.endR.x-40*k,y:L.field.cy},2.4);
  m.draw({cells:out,strands,blend:24*k+4,wobble:still?0:w.env.wobble,contour:w.env.contour,time:t});
  const gazeTo=(from:Point)=>{let tx:number,ty:number;if(w.gaze.w>.5){tx=w.gaze.px;ty=w.gaze.py;}else if(p){tx=p.x;ty=p.y;}else{tx=L.field.cx;ty=L.field.cy;}const dx=tx-from.x,dy=ty-from.y,d=Math.hypot(dx,dy)||1,a=Math.min(1,d/80)*3.5*k;return {x:dx/d*a,y:dy/d*a};};
  w.eyes.forEach((e,i)=>{const el=eyeRefs.current[i];if(!el)return;const g=gazeTo(pos[i]);el.style.transform=`translate(${(pos[i].x+g.x).toFixed(1)}px,${(pos[i].y+g.y-2*k).toFixed(1)}px)`;el.style.opacity=String(e.o);el.style.setProperty('--lid',e.lid.toFixed(3));});
  const changedSides=nodeRefs.current.map((el,i)=>{
   if(!el)return null;
   const side=L.slots[i].x<L.W/2?'left':'right';
   if(el.dataset.side===side)return null;
   el.dataset.side=side;return el;
  });
  const origins=changedSides.map(el=>{
   const g=el?.querySelector<HTMLElement>('.thing-shape');
   return g?g.offsetLeft+g.offsetWidth/2:null;
  });
  changedSides.forEach((el,i)=>{const gx=origins[i];if(el&&gx!==null){el.dataset.gx=gx.toFixed(1);el.style.transformOrigin=`${gx.toFixed(1)}px 50%`;}});
  w.nodes.forEach((n,i)=>{const el=nodeRefs.current[i];if(!el)return;const d=(still?0:n.free)*(L.roomy?1:.6),ox=(Math.sin(t*.5+i*1.3)*13+Math.sin(t*.21+i*.7)*7)*k*d*(L.roomy?1:.35),oy=(Math.cos(t*.38+i*.9)*4+Math.cos(t*.17+i)*2)*k*d,rot=Math.sin(t*.3+i)*4*d;
   el.style.transform=`translate(${(n.px+ox).toFixed(1)}px,${(n.py+oy).toFixed(1)}px) translate(${-(el.dataset.gx??0)}px,-50%) rotate(${rot.toFixed(2)}deg) scale(${n.s.toFixed(3)})`;el.style.opacity=String(n.o);
   const st=el.style;st.setProperty('--t',n.t.toFixed(3));st.setProperty('--rip',n.rip.toFixed(3));st.setProperty('--flash',n.flash.toFixed(3));st.setProperty('--busy',n.busy.toFixed(3));st.setProperty('--free',n.free.toFixed(2));});
  if(state.current.beat===2&&w.rows[0].o>.05&&state.current.prompt)setPrompt('');
  if(pending.current&&w.rows[0].o<.05){setSent(pending.current);pending.current=null;}
  w.rows.forEach((r,i)=>{const el=rowRefs.current[i];if(!el)return;el.style.opacity=String(r.o);el.style.setProperty('--dy',`${r.dy.toFixed(1)}px`);el.style.setProperty('--p',r.p.toFixed(3));el.style.setProperty('--g',r.g.toFixed(3));
   const on=r.g>.4;if(glyphRef.current[i]!==on){glyphRef.current[i]=on;setGlyphOn(prev=>{const next=[...prev];next[i]=on;return next;});}
   const hidden=r.o<.5;if(el.inert!==hidden){el.inert=hidden;el.setAttribute('aria-hidden',hidden?'true':'false');}});
  if(foldEl.current){foldEl.current.style.opacity=String(w.fold.o);foldEl.current.style.transform=`translateY(${w.fold.dy.toFixed(1)}px)`;}
  if(reply.current){const el=reply.current;el.style.setProperty('--la',String(w.lines.a));el.style.setProperty('--lb',String(w.lines.b));el.style.setProperty('--lc',String(w.lines.c));el.style.setProperty('--check',String(w.lines.check));el.style.setProperty('--typing',String(w.lines.typing));const on=w.lines.check>.5;if(on!==checkRef.current){checkRef.current=on;setCheckOn(on);}}
  if(form.current){const dy=w.env.panel*L.composerDy;formDy.current=dy;form.current.style.transform=`translateY(${dy.toFixed(1)}px)`;form.current.style.setProperty('--line',w.env.underline.toFixed(3));}
  if(panel.current){const el=panel.current,open=w.env.panel>.5;el.style.opacity=String(w.env.panel);if((el.dataset.open==='true')!==open){el.dataset.open=open?'true':'false';el.inert=!open;}}
 },[stepRoam]);

 const paintSoon=React.useCallback((frames=4)=>{let left=frames;const tick=()=>{paint(0);if(--left<=0)cancelFrame(tick);};frame.postRender(tick,true);},[paint]);
 React.useEffect(()=>{
  const tick=({delta}:{delta:number})=>paint(delta);
  if(moving&&!quiet){frame.postRender(tick,true);return()=>cancelFrame(tick);}
  paintSoon();
 },[moving,quiet,paint,paintSoon,beat,ready]);

 const relayout=React.useCallback(()=>{
  if(!stage.current||!form.current||!panel.current)return;
  const L=measure(stage.current,form.current,panel.current,rowRefs.current,reply.current,formDy.current);if(!L)return;
  const first=!layout.current;layout.current=L;setCompact(!L.roomy);
  if(L.headFit)stage.current.style.setProperty('--headline-fit',`${L.headFit.toFixed(1)}px`);else stage.current.style.removeProperty('--headline-fit');
  const w=world.current,{beat:b,stopped:st,folded,env:ev}=state.current;
  if(b===0)restPose(w,L,roam.current,ev);else if(b===1)bondedPose(w,L,roam.current,ev);else panelPose(w,L,roam.current,b===LAST&&st?reached.current:b,folded,ev,storyAt(state.current.run));
  if(first||b>0)setReady(v=>v+1);
 },[]);

 React.useEffect(()=>{
  const cap=stage.current?.querySelector('.prompt-caption');if(!cap||typeof ResizeObserver==='undefined')return;
  let h=cap.getBoundingClientRect().height;const ro=new ResizeObserver(()=>{const n=cap.getBoundingClientRect().height;if(Math.abs(n-h)<.5)return;h=n;relayout();});ro.observe(cap);return()=>ro.disconnect();
 },[relayout]);

 React.useEffect(()=>{
  const hd=stage.current?.querySelector('.prompt-headline');if(!hd||typeof ResizeObserver==='undefined')return;
  let size=getComputedStyle(hd).fontSize,live=true;const ro=new ResizeObserver(()=>{const n=getComputedStyle(hd).fontSize;if(n===size)return;size=n;relayout();});ro.observe(hd);
  document.fonts?.ready.then(()=>{if(live)relayout();});
  return()=>{live=false;ro.disconnect();};
 },[relayout]);

 React.useLayoutEffect(()=>{
  if(!folds.length||!stage.current||!form.current||!panel.current)return;
  const L=measure(stage.current,form.current,panel.current,rowRefs.current,reply.current,formDy.current);if(L)layout.current=L;
 },[folds.length]);

 React.useEffect(()=>{
  const L=layout.current,w=world.current;
  controls.current?.stop();controls.current=null;
  if(!L)return;
  if(beat===1){
   if(!capture.current)capture.current={t0:clock_.current,from:roam.current.map(r=>({x:r.x,y:r.y}))};
   [w.A,w.B,...w.O].forEach((c,i)=>Object.assign(c,at(L.docks[i])));
   if(quiet||!moving)roam.current.forEach((r,i)=>{r.x=L.docks[i].x;r.y=L.docks[i].y;r.vx=r.vy=0;});
  } else capture.current=null;

  const dimensions=nodeRefs.current.map(el=>{
   const g=el?.querySelector<HTMLElement>('.thing-shape'),w=g?.offsetWidth??30,h=g?.offsetHeight??30;
   return {w,h,gx:g?g.offsetLeft+w/2:w/2};
  });
  const sizes=dimensions.map(({w,h,gx},i):Size=>{
   const el=nodeRefs.current[i];
   if(el){el.dataset.gx=gx.toFixed(1);el.style.transformOrigin=`${gx.toFixed(1)}px 50%`;}
   return {w,h};
  });

  env.forEach((th,i)=>{if(th?.title!==prevEnv.current[i]?.title)w.nodes[i].o=th&&beat!==2&&beat!==7?1:0;});prevEnv.current=env;
  const built=buildBeat(beat,w,L,run,sizes,folds.length>0,env,fresh);
  if(beat===LAST)panelPose(w,L,roam.current,stopped?reached.current:LAST,folds.length>0,env,story);
  if(!built){if(beat===0)restPose(w,L,roam.current,env);return;}
  const own=++generation.current;let cancelled=false;
  const c=animate(built.seq as any,{defaultTransition:{ease:'easeInOut'}});
  controls.current=c;
  if(quiet||!moving){c.pause();c.time=quiet?built.still:0;}
  c.finished.then(()=>{if(cancelled||generation.current!==own||!state.current.moving||state.current.quiet)return;c.complete();setBeat(b=>Math.min(LAST,b+1));},()=>{});
  return()=>{cancelled=true;if(controls.current===c){c.stop();controls.current=null;}};
 },[beat,ready,quiet,run]);

 React.useEffect(()=>{const c=controls.current;if(!c||quiet)return;if(moving)c.play();else c.pause();},[moving,quiet]);

 const nextPrompt=()=>storyAt(state.current.beat===0?0:state.current.run+1).prompt;
 const typeThenStart=React.useCallback((text:string,fast:boolean)=>{
  if(state.current.quiet||!state.current.moving){setPrompt(text);typing.current=null;window.setTimeout(()=>startRef.current(),60);return;}
  typing.current={text,at:clock_.current,fast,n:0};
 },[]);

 const start=React.useCallback(()=>{
  const {beat:b,prompt:text,quiet:still,moving:live}=state.current;
  if(b!==0&&b!==LAST)return;
  if(typing.current){const ty=typing.current;typing.current=null;setPrompt(ty.text);window.setTimeout(()=>startRef.current(),40);return;}
  if(!text.trim()){typeThenStart(nextPrompt(),true);return;}
  const partial=!typed.current?stories.find(s=>s.prompt.startsWith(text)&&s.prompt!==text):undefined;
  if(partial){typeThenStart(partial.prompt,true);return;}
  typed.current=false;setNoted(false);setPicked(null);input.current?.blur();
  const chosen=stories.findIndex(s=>s.prompt===text.trim());
  if(b===0){if(chosen>=0)setRun(chosen);setSent(text.trim());setBeat(1);return;}
  const previous=storyAt(state.current.run);
  setFolds(f=>[...f,{prompt:state.current.sent,kept:state.current.stopped?'':previous.kept.title}].slice(-3));
  if(still||!live)setSent(text.trim());else pending.current=text.trim();
  setStopped(false);setRun(r=>chosen>=0?chosen:r+1);setBeat(2);
 },[typeThenStart]);

 React.useLayoutEffect(()=>{startRef.current=start;},[start]);

 const stop=(e:React.MouseEvent)=>{
  e.preventDefault();
  const b=state.current.beat;if(b<2||b>=LAST)return;
  const landed=LANDED[b]!==undefined&&(controls.current?.time??0)>=LANDED[b];
  reached.current=landed?b+1:b;setStoppedAt(reached.current);setStopped(true);controls.current?.complete();setBeat(LAST);
 };

 React.useEffect(()=>{
  const onEnter=(e:KeyboardEvent)=>{if(e.key!=='Enter'||e.isComposing||e.defaultPrevented)return;
   const target=e.target as HTMLElement;
   if(target!==input.current&&target.closest('input,button,a,textarea,[role=button],[role=switch],[contenteditable]'))return;
   if(!ownsKeys(stage.current,target))return;
   if(state.current.beat!==0&&state.current.beat!==LAST)return;
   e.preventDefault();start();
  };
  window.addEventListener('keydown',onEnter);return()=>window.removeEventListener('keydown',onEnter);
 },[start]);

 React.useEffect(()=>{
  if(!moving||quiet||(beat!==0&&beat!==LAST))return;
  const clear=()=>{if(idle.current!==null){window.clearTimeout(idle.current);idle.current=null;}};
  const arm=()=>{clear();idle.current=window.setTimeout(()=>{idle.current=null;if(typed.current||typing.current||state.current.prompt.trim())return;typeThenStart(nextPrompt(),false);},IDLE_MS);};
  const activity=(e:Event)=>{if(typing.current&&!(e.type==='keydown'&&(e as KeyboardEvent).key==='Enter')){typing.current=null;if(!typed.current)setPrompt('');}arm();};
  window.addEventListener('keydown',activity,true);window.addEventListener('pointerdown',activity,true);
  arm();
  return()=>{clear();window.removeEventListener('keydown',activity,true);window.removeEventListener('pointerdown',activity,true);};
 },[moving,quiet,beat,typeThenStart]);

 const next=()=>{controls.current?.complete();setBeat(b=>Math.min(LAST,b+1));};
 const back=()=>{controls.current?.complete();setBeat(b=>Math.max(1,b-1));};
 const acceptSuggestion=()=>{setNoted(true);const c=controls.current;if(c&&c.time<4.05)c.time=4.05;if(!moving||quiet)paintSoon();};
 const pick=(text:string)=>{typing.current=null;typed.current=false;setPicked(text);typeThenStart(text,true);};
 const onPointer=(e:React.PointerEvent)=>{const s=stage.current?.getBoundingClientRect();if(!s)return;pointer.current={x:e.clientX-s.left,y:e.clientY-s.top};};
 const rows=rowsFor(story);
 const ui=React.useContext(UiContext);
 const cue=beat===8&&noted?'Noted. It will be there next time.':beat===LAST&&stopped?'Stopped. Whenever you’re ready.':beats[beat].cue;
 const composing=beat===0||beat===LAST,working=bonded&&!composing;
 const suggestions=beat===0?stories.slice(0,3).map(s=>s.prompt):beat===LAST?[storyAt(run+1).prompt]:[];
 React.useEffect(()=>{if(composing&&matchMedia('(hover:hover) and (pointer:fine)').matches)requestAnimationFrame(()=>{if(ownsKeys(stage.current,document.activeElement))input.current?.focus({preventScroll:true});});
 },[composing]);
 const renderParts=(ps:Part[])=><span className="chat-row-text">{ps.map((p,j)=>p.b?<b key={j}>{p.t}</b>:<span key={j}>{p.t}</span>)}</span>;

 return <div className="prompt-story" ref={stage} data-beat={beat} data-bonded={bonded} data-moving={moving} data-quiet={quiet} data-compact={compact} onPointerMove={onPointer} onPointerLeave={()=>{pointer.current=null;}}>
  <Membrane ref={membrane} className="prompt-membrane" style={{position:"absolute"}} onMeasure={relayout}/>
  <div className="stage-layer" aria-hidden="true">
   {RADII.map((_,i)=><span key={i} className="eyes" data-small={i>1} ref={el=>{eyeRefs.current[i]=el;}}><i/><i/></span>)}
   {env.map((th,i)=>{const kind=th?.kind??'memory';return <span key={i} ref={el=>{nodeRefs.current[i]=el;}} className="thing" data-kind={kind} data-empty={!th} style={{'--i':i} as React.CSSProperties}>
    <span className="thing-shape"><i className="thing-ring"/><i className="thing-flash"/>{th?.initials?<b>{th.initials}</b>:<AnimatedIcon name={th?.icon??'brain'} preset={KIND_PRESET[kind]} active={lively===i} size="sm"/>}<span className="thing-busy"><i/><i/><i/></span></span>
    <span className="thing-label"><em>{KIND_TITLE[kind]}</em><b>{th?.title??''}</b><small>{th?.sub??''}</small></span>
   </span>;})}
  </div>
  <div className="prompt-title"><div className="prompt-headline" role="heading" aria-level={1}>
   <VariableProximity className="headline-part headline-one" text="Every prompt." radius={Math.round(160*ui)} fromWeight={620} toWeight={800} paused={!moving}/>
   <VariableProximity className="headline-part headline-two" text="A little more alive." radius={Math.round(160*ui)} fromWeight={340} toWeight={700} paused={!moving}/>
  </div></div>
  <div className="prompt-theatre" role="group" aria-label="An illustrative prompt lifecycle">
   <div className="chat-panel" ref={panel} data-open="false" inert>
    {lastFold&&<div className="chat-fold" ref={foldEl}><span className="chat-fold-prompt">› {lastFold.prompt}</span>{lastFold.kept&&<span className="chat-fold-kept"><AnimatedIcon name="bookmark" size="sm"/>{lastFold.kept}</span>}{folds.length>1&&<span className="chat-fold-more">+{folds.length-1} earlier</span>}</div>}
    <div className="chat-sent" ref={el=>{rowRefs.current[0]=el;}}><BubbleMe className="chat-bubble chat-bubble-me">{sent}</BubbleMe></div>
    <ul className="chat-work">
     {[1,2,3].map(i=><li key={i} className="chat-row" data-tone={['memory','prepare','reach'][i-1]} ref={el=>{rowRefs.current[i]=el;}}><span className="chat-row-glyph"><AnimatedIcon name={ROW_ICONS[i]} preset={ROW_PRESET[i]} active={glyphOn[i]} size="sm"/></span>{renderParts(rows[i])}</li>)}
    </ul>
    <div className="chat-reply" ref={el=>{rowRefs.current[4]=el;}}><span className="chat-glyph" aria-hidden="true"/><div className="chat-bubble chat-bubble-reply" ref={reply}><span className="chat-typing" aria-hidden="true"><i/><i/><i/></span><p className="reply-text">{story.reply.map((line,j)=><span key={j} className="reply-line">{line}{j<2?' ':''}</span>)}</p><span className="response-check"><AnimatedIcon name="check" preset="draw" active={checkOn} size="sm"/></span></div></div>
    <ul className="chat-work">
     <li className="chat-row" data-tone="kept" ref={el=>{rowRefs.current[5]=el;}}><span className="chat-row-glyph"><AnimatedIcon name="bookmark" preset={ROW_PRESET[5]} active={glyphOn[5]} size="sm"/></span>{renderParts(rows[5])}</li>
     <li className="chat-row chat-row-action" data-tone="automation" ref={el=>{rowRefs.current[6]=el;}}><span className="chat-row-glyph"><AnimatedIcon name={ROW_ICONS[6]} preset={ROW_PRESET[6]} active={glyphOn[6]} size="sm"/></span>{renderParts(rows[6])}<Button className="bud-button" onClick={acceptSuggestion} disabled={noted}>{noted&&<AnimatedIcon name="check" preset="auto" active size="sm"/>}{noted?'Automation saved':story.automation}</Button></li>
    </ul>
   </div>
   <form className="living-prompt" ref={form} data-has-text={composing&&prompt.trim().length>0} onSubmit={e=>{e.preventDefault();start();}}>
    <span className="prompt-prefix" aria-hidden="true">›</span>
    <InputControl ref={input} aria-label="Your prompt" value={prompt} maxLength={80} placeholder={beat===0?'Type a thought…':beat===LAST?'Next thought…':undefined} readOnly={!composing} onChange={e=>{typed.current=e.target.value.length>0;setPrompt(e.target.value);}} onKeyDown={e=>{if(e.nativeEvent.isComposing&&e.key==='Enter')e.preventDefault();}}/>
    <Button type={working?'button':'submit'} className="prompt-send" data-state={working?'stop':'send'} disabled={beat===1} onClick={working?stop:undefined} aria-label={working?'Stop working':beat===LAST?'Send another thought':'Start the bond'}>
     <span className="send-glyph"><AnimatedIcon name="arrow-right" size="sm"/></span><span className="stop-glyph"><i/></span>
    </Button>
   </form>
  </div>
  <div className="prompt-caption">
   {suggestions.length>0&&<div className="prompt-thoughts" role="group" aria-label="Thoughts to try"><span className="thoughts-label">{beat===0?'or pick a thought':'next'}</span>{suggestions.map((s,i)=><Button key={s} className="thought" style={{'--i':i} as React.CSSProperties} data-picked={picked===s} onClick={()=>pick(s)}><i className="thought-tail" aria-hidden="true"><b/><b/></i>{s}</Button>)}</div>}
   <TextReveal as="p" text={cue} stagger={24} duration={440} aria-live="polite" aria-atomic="true"/>
   {beat===0?<Button className="enter-invitation" onClick={start}>Press <kbd>Enter ↵</kbd></Button>
   :beat===LAST?<p className="again-hint">Type another thought and press <kbd>Enter ↵</kbd></p>
   :<div className="lifecycle-progress" aria-label={`Prompt lifecycle: ${beats[beat].label}`}>{beats.slice(1,LAST).map((b,i)=><span key={b.label} data-complete={beat>i+1} data-current={beat===i+1} title={b.label}/>)}</div>}
   {bonded&&beat<LAST&&<div className="lifecycle-steps"><Button className="lifecycle-step" onClick={back} disabled={beat<=1} aria-label="Previous lifecycle step"><span aria-hidden="true">←</span> Back</Button><Button className="lifecycle-step" onClick={next} aria-label="Next lifecycle step">Next <span aria-hidden="true">→</span></Button></div>}
  </div>
 </div>;
}
export function PromptBond(props: Parameters<typeof PromptBondImpl>[0]) {
  return (
    <>
      <CojeevStyles />
      {PromptBondImpl(props)}
    </>
  );
}

type SceneMode=ThemeMode;
const sceneUi=(w:number,h:number)=>w<=700?1:Math.min(1.8,Math.max(w<=1024?.9:.8,Math.min(w/1440,h/900)));
class ShaderBoundary extends React.Component<React.PropsWithChildren,{failed:boolean}>{
  state={failed:false};
  static getDerivedStateFromError(){return{failed:true};}
  componentDidCatch(error:Error){console.warn('Shader background unavailable; using the still colour field.',error);}
  render(){return this.state.failed?null:this.props.children;}
}
function BondField({mode,moving}:{mode:SceneMode;moving:boolean}){
 const [painted,setPainted]=React.useState(false);
 React.useEffect(()=>{
  let second=0,idle=0;
  const first=requestAnimationFrame(()=>{second=requestAnimationFrame(()=>{
   if('requestIdleCallback' in window)idle=(window as any).requestIdleCallback(()=>setPainted(true),{timeout:500});
   else setPainted(true);
  });});
  return()=>{cancelAnimationFrame(first);cancelAnimationFrame(second);if(idle)(window as any).cancelIdleCallback(idle);};
 },[]);
 return <div aria-hidden="true" className="bond-background" data-mode={mode} data-moving={moving}>
  {painted&&<ShaderBoundary><ShaderScene mode={mode} moving={moving}/></ShaderBoundary>}
 </div>;
}
export type PromptBondSceneProps=Omit<React.ComponentProps<'div'>,'children'>&{
 onModeChange?:(mode:SceneMode)=>void;
};
function PromptBondSceneImpl({onModeChange,className,...props}:PromptBondSceneProps){
 const host=React.useRef<HTMLDivElement>(null);
 const {enabled,inView}=useMotionVisibility(host);
 const [paused,setPaused]=React.useState(false),[replayKey,setReplayKey]=React.useState(0);
 const [mode,setMode]=React.useState<SceneMode>('light');
 const [ui,setUi]=React.useState<number|null>(null);
 const mirror=React.useRef(false);
 const moving=enabled&&inView&&!paused;
 React.useLayoutEffect(()=>{
  const el=host.current;if(!el)return;
  let last=0;
  const fit=()=>{const next=sceneUi(el.clientWidth,el.clientHeight);el.style.setProperty('--ui',next.toFixed(3));if(Math.abs(next-last)>.005){last=next;setUi(next);}};
  fit();
  const observer=new ResizeObserver(fit);observer.observe(el);
  return()=>observer.disconnect();
 },[]);
 React.useLayoutEffect(()=>{
  const el=host.current;if(!el)return;
  const root=document.documentElement;
  const read=()=>{
   if(mirror.current&&root.dataset.mode)root.classList.toggle('dark',root.dataset.mode==='dark');
   setMode(el.closest('.dark')||root.dataset.mode==='dark'?'dark':'light');
  };
  read();
  const observer=new MutationObserver(read);
  for(let node=el.parentElement;node;node=node.parentElement)observer.observe(node,{attributes:true,attributeFilter:['class','data-mode']});
  return()=>observer.disconnect();
 },[]);
 const changeMode=(next:SceneMode)=>{
  if(onModeChange){onModeChange(next);return;}
  mirror.current=true;
  applyTheme(next,paused);
 };
 return <div {...props} ref={host} data-slot="prompt-bond" className={cn('bond-scene',className)}>
  <div className="bond-demo" data-moving={moving}>
   <BondField mode={mode} moving={moving}/>
   {ui!==null&&<UiContext.Provider value={ui}><PromptBond key={replayKey} moving={moving} active={moving} quiet={!enabled}/></UiContext.Provider>}
   <div className="bond-bottom" role="group" aria-label="Scene controls">
    <div className="bond-motion">
     <Button className="replay-button" onClick={()=>setReplayKey(k=>k+1)}><AnimatedIcon name="play" size="sm"/>Replay</Button>
     <Button className="pause-button" aria-label={paused?'Resume motion':'Pause motion'} aria-pressed={paused} onClick={()=>setPaused(v=>!v)}><AnimatedIcon name={paused?'play':'pause'} size="sm"/></Button>
    </div>
    <ThemeToggle mode={mode} responsive onModeChange={changeMode}/>
   </div>
  </div>
 </div>;
}
export function PromptBondScene(props: Parameters<typeof PromptBondSceneImpl>[0]) {
  return (
    <>
      <CojeevStyles />
      {PromptBondSceneImpl(props)}
    </>
  );
}

// ---- Styles ----
const COJEEV_CSS = `
@font-face {
  font-family: 'Bricolage Grotesque';
  font-style: normal;
  font-weight: 200 800;
  font-stretch: 75% 100%;
  font-display: swap;
  src: url(https://cdn.21st.dev/assets/mirror/9f/9fee080fcc2d2e0ea8c7ce2a58abaa8ba1f40c6e603643327cd5eb6f07db06a8.woff2) format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}
@font-face {
  font-family: 'DM Sans';
  font-style: normal;
  font-weight: 100 1000;
  font-display: swap;
  src: url(https://cdn.21st.dev/assets/mirror/aa/aa530716b0d351866af7dbfa3eee4120fb36f2d071baff8c234185141865c7ff.woff2) format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}
@layer theme, base, components, utilities, cojeev-states, cojeev-flow, cojeev-morph, cojeev-accessibility;

:root{
color-scheme:light;
--v-pink:#F0A4CC;--v-olive:#A8BC75;--v-blue:#95BAE8;--v-yellow:#F1D369;
--v-canvas:#F8F6F1;--v-paper:#FFFFFF;--v-beige:#EEE9E1;
--v-ink:#26282d;--v-on-ink:#F8F6F1;
--v-text:#26282d;--v-text-2:#464951;--v-disabled-ink:#52565e;--v-disabled-face:#EEE9E1;--v-disabled-edge:#706e6d;
--v-brand:#845c73;
--v-border:#b4b0ab;
--v-pink-deep:#d693b7;--v-olive-deep:#96a86a;--v-blue-deep:#86a6cf;--v-yellow-deep:#d6bc60;
--font-display:"Bricolage Grotesque",ui-sans-serif,system-ui,sans-serif;
--font-text:"DM Sans",ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;--fs-body:15px;--fs-control:14px;--fs-small:13px;--fs-meta:12px;
--lh-body:1.45;
--fw-regular:400;
--fw-medium:500;
--fw-body:var(--fw-regular);
--fw-control:var(--fw-medium);--s-2:8px;--s-3:12px;--s-4:16px;--s-5:20px;--s-6:24px;
--r-xs:4px;--r-sm:8px;--r-card:20px;--r-panel:24px;--r-pill:999px;
--icon-sm:16px;
--icon-md:20px;
--icon-stroke:1.6;
--ctl-sm:32px;
--ctl-md:40px;
--t-micro:120ms;
--enter:cubic-bezier(.2,.8,.2,1);
--mfill:transparent;
--mstroke:transparent;
--v-on-accent:#14171B;
--ink-fixed:#111111;
}
:root[data-mode="dark"], .dark{
color-scheme:dark;
--v-canvas:#15171A;--v-paper:#20242A;--v-beige:#292F37;
--v-ink:#f3f4f4;--v-on-ink:#15171A;--v-on-accent:#14171B;--v-text:#f3f4f4;--v-text-2:#bdc1c5;
--v-border:#4e5359;--v-brand:#F0A4CC;
--v-pink:#F0A4CC;--v-pink-deep:#d693b7;--v-olive:#A8BC75;--v-olive-deep:#96a86a;--v-blue:#95BAE8;--v-blue-deep:#86a6cf;--v-yellow:#F1D369;--v-yellow-deep:#d6bc60;--v-disabled-ink:#a9aeb4;--v-disabled-face:#292F37;--v-disabled-edge:#8c9094;
}
@media (prefers-reduced-motion:reduce){:root{
--t-micro:0ms;
}}

@layer cojeev-states {
.v-variable-proximity{display:grid;position:relative;place-items:center;min-inline-size:0;inline-size:100%;min-block-size:260px;padding:var(--s-6);overflow:hidden;border-radius:var(--r-panel,24px);color:var(--v-text);background:var(--v-beige);font-family:var(--font-display,"Bricolage Grotesque",sans-serif);font-size:clamp(2rem,5vw,3.5rem);line-height:1.15;isolation:isolate}
.v-variable-proximity__accessible,.v-text-reveal__accessible{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0}
.v-variable-proximity__line{max-inline-size:100%;overflow-wrap:anywhere;text-align:center}
.v-variable-proximity__word{display:inline-block;max-inline-size:100%}
.v-variable-proximity [data-proximity-letter]{font-synthesis:none;transition:font-variation-settings 120ms ease-out}
.v-variable-proximity[data-running="false"] [data-proximity-letter]{transition:none}
.v-bubble[data-slot].-me{background:var(--v-pink);border-radius:var(--r-card) var(--r-card) var(--r-xs) var(--r-card);color:var(--v-on-accent)}
.v-bubble[data-slot]{min-width:0;max-width:min(100%,65ch);overflow-wrap:anywhere}
:is(:root[data-mode="dark"], .dark) .v-bubble[data-slot].-me{background:var(--v-pink);color:var(--v-on-accent)}
.v-btn[data-slot]{text-decoration:none;transition:background var(--t-micro) var(--enter),color var(--t-micro),transform var(--t-micro) var(--enter)}
:is(:root[data-mode="dark"], .dark) .v-btn[data-slot].-ghost{color:var(--v-text)}
.v-btn[data-slot] .v-icon{width:18px;height:18px}
:root .v-btn[data-slot]:is(:disabled,[aria-disabled="true"]:not([aria-busy="true"])){background:var(--v-disabled-face);color:var(--v-disabled-ink);box-shadow:inset 0 0 0 1px var(--v-disabled-edge);cursor:not-allowed;transform:none}
.v-icon:where([data-slot]).-sm{width:var(--icon-sm);height:var(--icon-sm)}
.v-icon:where([data-slot]){overflow:visible}
.v-text-reveal{overflow-wrap:anywhere}
.v-text-reveal [data-reveal-word]{display:inline-block;max-inline-size:100%;overflow-wrap:anywhere}
.v-text-reveal [data-reveal-unit]{display:inline-block;max-inline-size:100%;opacity:var(--reveal-opacity,1);transform:perspective(12em) translateY(var(--reveal-y,0em)) rotateX(var(--reveal-fold,0deg)) scale(var(--reveal-scale,1));transform-origin:50% 85%;filter:blur(var(--reveal-blur,0px))}
.v-text-reveal[data-motion-quiet="true"] [data-reveal-unit]{opacity:1;transform:none;filter:none}
:root .v-btn.v-theme-toggle[data-slot][data-label]{--mfill:var(--v-paper);--mstroke:var(--v-border);gap:var(--s-2);height:44px;width:112px;min-width:112px;padding:0 var(--s-4);border-radius:var(--r-pill);background:var(--mfill);color:var(--v-text);box-shadow:inset 0 0 0 1px var(--mstroke);transition:background-color .16s ease,box-shadow .16s ease}
:root .v-btn.v-theme-toggle[data-slot][data-label]:is(:hover,:focus-visible){--mfill:var(--v-beige);--mstroke:var(--v-text-2)}
[data-slot="theme-toggle-icon"]{flex:none;overflow:visible}
.v-theme-toggle__label{color:inherit;font:var(--fw-medium) var(--fs-small)/1 var(--font-text)}
@media (max-width:640px){:root .v-btn.v-theme-toggle[data-slot][data-responsive="true"]{min-width:44px;width:44px;padding:0}.v-theme-toggle[data-responsive="true"] .v-theme-toggle__label{display:none}}
[data-slot="animated-icon"],[data-slot="animated-icon"]>span{display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;vertical-align:middle}
[data-slot="animated-icon"] svg{overflow:visible}
.v-btn{border-radius:var(--v-control-radius,var(--r-pill))}
@media (prefers-reduced-motion:reduce){.v-variable-proximity [data-proximity-letter],.v-btn[data-slot]{transition:none}.v-text-reveal [data-reveal-unit]{opacity:1;transform:none;filter:none}}

.bond-scene{container:prompt-bond / size;position:relative;display:block;width:100%;height:100%;min-height:560px;overflow:hidden;color-scheme:light;font-synthesis:none;--v-canvas:#FBF4E6;--v-paper:#FBF4E6;--v-text:#242126;--v-ink:#242126;--v-on-ink:#FBF4E6;--v-on-accent:#242126;--v-text-2:#62575c;--v-brand:#9C3E6E;--v-pink:#F0A4CC;--v-olive:#A8BC75;--v-blue:#95BAE8;--v-yellow:#F1D369;background:var(--v-canvas);color:var(--v-text);font-family:var(--font-text);-webkit-text-size-adjust:100%}
:is(:root[data-mode="dark"], .dark) .bond-scene{color-scheme:dark;--v-canvas:#15171A;--v-paper:#20242A;--v-text:#f3f4f4;--v-ink:#f3f4f4;--v-on-ink:#15171A;--v-on-accent:#14171B;--v-text-2:#d4d1dd;--v-brand:#F0A4CC}
.bond-scene,.bond-scene *,.bond-scene *::before,.bond-scene *::after{box-sizing:border-box}
.bond-scene button{cursor:pointer;font-family:inherit;-webkit-tap-highlight-color:transparent}
.bond-scene button:focus-visible{outline:2px solid var(--v-brand);outline-offset:5px}
.bond-scene .v-btn{display:inline-flex;position:relative;align-items:center;justify-content:center;text-decoration:none;line-height:1.2}
.bond-demo{position:absolute;inset:0;isolation:isolate;overflow:hidden;color:var(--v-ink);font-family:var(--font-text)}
.bond-background{position:absolute;inset:0;overflow:hidden;pointer-events:none;background:radial-gradient(ellipse at 12% 30%,#ebedff,transparent 60%),radial-gradient(ellipse at 85% 85%,#dbf8ff,transparent 65%),#f3f2f8}
.bond-background[data-mode=dark]{background:radial-gradient(ellipse at 20% 60%,#4a4364,transparent 65%),radial-gradient(ellipse at 90% 20%,#8E80BC,transparent 70%),#2b2836}
.bond-background canvas{animation:pb-field-in 1.6s ease-out 3.4s both}
@keyframes pb-field-in{from{opacity:0}}
.bond-bottom{position:absolute;z-index:8;bottom:0;left:0;right:0;height:calc(92px * var(--ui,1));display:grid;grid-template-columns:1fr 1fr;align-items:center;gap:calc(12px * var(--ui,1));padding:0 max(32px,4.5%)}
.bond-motion{display:flex;align-items:center;gap:calc(4px * var(--ui,1));justify-self:start}
.bond-bottom>.v-theme-toggle{justify-self:end}
.bond-bottom .v-btn[data-slot]{height:calc(40px * var(--ui,1));min-height:calc(40px * var(--ui,1));font-size:calc(14px * var(--ui,1))}
.bond-bottom .v-btn[data-slot] .v-icon{width:calc(18px * var(--ui,1));height:calc(18px * var(--ui,1))}
.bond-bottom .replay-button.v-btn[data-slot]{color:var(--v-text-2);gap:calc(8px * var(--ui,1));padding:0 calc(14px * var(--ui,1));background:transparent;box-shadow:none;transition:color .2s,background .2s}
.bond-bottom .replay-button.v-btn[data-slot]:hover{color:var(--v-text);background:color-mix(in srgb,var(--v-ink) 6%,transparent)}
:root .bond-bottom .v-btn.v-theme-toggle[data-slot][data-label]{height:calc(40px * var(--ui,1));width:calc(112px * var(--ui,1));min-width:calc(112px * var(--ui,1));padding:0 calc(14px * var(--ui,1));gap:calc(8px * var(--ui,1))}
.bond-bottom .v-theme-toggle__label{font-size:calc(13px * var(--ui,1))}
.bond-bottom .pause-button.v-btn[data-slot]{width:calc(40px * var(--ui,1));min-width:calc(40px * var(--ui,1));padding:0;color:var(--v-text-2);background:transparent;box-shadow:none;transition:color .2s,background .2s}
.bond-bottom .pause-button.v-btn[data-slot]:hover{color:var(--v-text);background:color-mix(in srgb,var(--v-ink) 6%,transparent)}
:is(:root[data-mode="dark"], .dark) .bond-bottom .replay-button.v-btn[data-slot]:hover,:is(:root[data-mode="dark"], .dark) .bond-bottom .pause-button.v-btn[data-slot]:hover{background:#F6EFE214}
@container prompt-bond (max-width:700px){.bond-bottom{height:100px;padding:0 16px;gap:8px}.bond-bottom .replay-button.v-btn[data-slot]{padding:0 10px}:root .bond-bottom .v-btn.v-theme-toggle[data-slot][data-label]{width:40px;min-width:40px;padding:0;gap:0}.bond-bottom .v-theme-toggle__label{display:none}}

.prompt-story{position:absolute;inset:0;--u:var(--ui,1);--story-top:calc(112px * var(--u));--story-bottom:calc(100px * var(--u));padding:var(--story-top) 0 var(--story-bottom);box-sizing:border-box;display:flex;align-items:center;flex-direction:column;justify-content:center;color:var(--v-text);--ink-on-body:#1a1620;--paper-on-body:#fbf4e6bf;--field-glass:color-mix(in srgb,var(--v-paper) 70%,transparent);--field-edge:color-mix(in srgb,var(--v-ink) 14%,transparent);--field-ink:var(--v-ink);--note:color-mix(in srgb,var(--v-paper) 88%,transparent)}
:where(.prompt-story) .prompt-title{position:relative;text-align:center;z-index:4}
:where(.prompt-story) .prompt-title .prompt-headline{font:500 min(calc(64px * var(--u)),4.45cqw,var(--headline-fit,999px))/1.02 var(--font-display);letter-spacing:-.045em;margin:0;font-variant-ligatures:none;display:block}
:where(.prompt-story) .prompt-title .headline-part.v-variable-proximity{display:inline-block;min-block-size:0;inline-size:auto;padding:0;background:none;border-radius:0;overflow:visible;isolation:auto;color:inherit;font:inherit;letter-spacing:inherit;white-space:nowrap}
:where(.prompt-story) .prompt-title .headline-part+.headline-part{margin-left:.28em}
:where(.prompt-story) .prompt-title .v-variable-proximity__line{white-space:nowrap;overflow-wrap:normal;text-align:inherit}:where(.prompt-story) .prompt-title .v-variable-proximity__word{display:inline}
:where(.prompt-story) .prompt-title .headline-part.headline-two.v-variable-proximity{color:var(--v-brand)}
:is(:root[data-mode="dark"], .dark) :where(.prompt-story) .prompt-title .headline-part.headline-two.v-variable-proximity{color:var(--v-pink,#F5B8DB)}
:where(.prompt-story) .prompt-membrane{position:absolute;inset:0;z-index:2;--membrane-ink:#1a1620;--membrane-dim:0;--membrane-glow:.14}
:where(.prompt-story) .stage-layer{position:absolute;inset:0;z-index:3;pointer-events:none}
:where(.prompt-story) .prompt-theatre{position:relative;width:min(calc(960px * var(--u)),100%);height:min(calc(460px * var(--u)),48cqh);flex-shrink:0;margin:calc(28px * var(--u)) 0 calc(4px * var(--u));--field-w:min(calc(600px * var(--u)),84%);--field-h:calc(64px * var(--u));--panel-h:calc(100% - var(--field-h))}
:where(.prompt-story) .living-prompt{position:absolute;isolation:isolate;z-index:4;left:50%;top:50%;width:var(--field-w);height:var(--field-h);translate:-50% -50%;display:flex;align-items:center;gap:calc(14px * var(--u));padding:0 calc(8px * var(--u)) 0 calc(18px * var(--u));color:var(--field-ink);transition:color .7s ease 1.05s,padding .8s cubic-bezier(.4,0,.2,1) .5s;will-change:transform}
:where(.prompt-story) .living-prompt::before{content:"";position:absolute;inset:-4px -3px;z-index:-1;border-radius:999px;background:var(--field-glass);box-shadow:inset 0 1px 0 #ffffff55,0 0 0 1px var(--field-edge),0 0 0 calc(max(var(--line,1) - 1, 0) * 1.4px) color-mix(in srgb,var(--v-pink-deep,#E09CC1) 75%,transparent),0 14px 40px -22px #0007;transition:opacity .45s,box-shadow .35s}
:where(.prompt-story) .living-prompt:focus-within::before{box-shadow:inset 0 1px 0 #ffffff55,0 0 0 1px color-mix(in srgb,var(--v-brand) 45%,transparent),0 0 0 calc(max(var(--line,1) - 1, 0) * 1.4px) color-mix(in srgb,var(--v-pink-deep,#E09CC1) 75%,transparent),0 14px 40px -22px #0007}
.prompt-story[data-bonded=true] .living-prompt::before{opacity:0;transition:opacity 1.1s cubic-bezier(.4,0,.2,1) .95s}
:where(.prompt-story) .living-prompt [data-slot=input-control]{font:400 calc(20px * var(--u)) var(--font-text);color:inherit;width:100%;border-radius:14px;caret-color:var(--v-brand);background:transparent;outline:0}
:where(.prompt-story) .living-prompt [data-slot=input-control]::placeholder{color:color-mix(in srgb,var(--field-ink) 50%,transparent)}
:where(.prompt-story) .living-prompt [data-slot=input-control]:focus-visible{outline:0;box-shadow:none}
.prompt-story[data-beat="9"] .living-prompt:focus-within{box-shadow:inset 0 -1px 0 color-mix(in srgb,var(--ink-on-body) 18%,transparent)}
:where(.prompt-story) .prompt-prefix{font:300 calc(26px * var(--u)) var(--font-text);opacity:.55;transition:opacity .9s}
:where(.prompt-story) .prompt-send.v-btn[data-slot]{position:relative;width:calc(44px * var(--u));min-width:calc(44px * var(--u));height:calc(44px * var(--u));min-height:calc(44px * var(--u));padding:0;color:inherit;background:transparent;box-shadow:none;transition:opacity .6s,background .35s,color .35s,transform .25s cubic-bezier(.4,0,.2,1)}:where(.prompt-story) .prompt-send:disabled{opacity:.55}
:where(.prompt-story) .prompt-send.v-btn[data-slot] .v-icon{width:calc(18px * var(--u));height:calc(18px * var(--u))}
:where(.prompt-story) .living-prompt[data-has-text=true] .prompt-send.v-btn[data-slot]{background:var(--v-brand);color:var(--v-on-accent,#1a1620)}
:where(.prompt-story) .living-prompt[data-has-text=true] .prompt-send.v-btn[data-slot]:hover{transform:translateX(2px)}
:where(.prompt-story) .send-glyph,:where(.prompt-story) .stop-glyph{position:absolute;inset:0;display:grid;place-items:center;transition:opacity .28s,transform .28s cubic-bezier(.4,0,.2,1)}
:where(.prompt-story) .stop-glyph{opacity:0;transform:scale(.4)}:where(.prompt-story) .stop-glyph i{display:block;width:calc(11px * var(--u));height:calc(11px * var(--u));border-radius:3px;background:currentColor;animation:pb-stop-breathe 1.8s ease-in-out infinite}
:where(.prompt-story) .prompt-send[data-state=stop] .send-glyph{opacity:0;transform:translateX(8px) scale(.5)}:where(.prompt-story) .prompt-send[data-state=stop] .stop-glyph{opacity:1;transform:none}
.prompt-story[data-bonded=true] .living-prompt{color:var(--ink-on-body);padding-left:calc(34px * var(--u))}.prompt-story[data-bonded=true] .living-prompt [data-slot=input-control]{caret-color:var(--ink-on-body)}.prompt-story[data-bonded=true] .living-prompt [data-slot=input-control]::placeholder{color:color-mix(in srgb,var(--ink-on-body) 45%,transparent)}.prompt-story[data-bonded=true] .prompt-prefix{opacity:.55}
.prompt-story[data-bonded=true] .prompt-send:disabled{opacity:.28}.prompt-story[data-beat="9"] .prompt-send{opacity:1}
.prompt-story[data-beat="2"] .living-prompt,.prompt-story[data-beat="3"] .living-prompt,.prompt-story[data-beat="4"] .living-prompt,.prompt-story[data-beat="5"] .living-prompt,.prompt-story[data-beat="6"] .living-prompt,.prompt-story[data-beat="7"] .living-prompt,.prompt-story[data-beat="8"] .living-prompt,.prompt-story[data-beat="9"] .living-prompt{padding-left:calc(22px * var(--u))}

.chat-panel{position:absolute;z-index:4;left:50%;top:50%;translate:-50% -50%;width:var(--field-w);height:var(--panel-h);box-sizing:border-box;padding:calc(12px * var(--u)) calc(20px * var(--u)) calc(var(--field-h) + 2px * var(--u));display:flex;flex-direction:column;gap:calc(5px * var(--u));color:var(--ink-on-body);opacity:0;pointer-events:none;overflow:hidden}
:where(.prompt-story) .chat-panel[data-open=true]{pointer-events:auto}
:where(.prompt-story) .chat-fold{position:absolute;left:calc(20px * var(--u));right:calc(20px * var(--u));top:calc(5px * var(--u));display:flex;align-items:center;gap:calc(8px * var(--u));height:calc(15px * var(--u));padding:0 2px 1px;font:500 calc(10px * var(--u))/1.3 var(--font-text);letter-spacing:.01em;opacity:0;border-bottom:1px solid color-mix(in srgb,var(--ink-on-body) 14%,transparent);will-change:transform,opacity}:where(.prompt-story) .chat-panel:has(.chat-fold){padding-top:calc(25px * var(--u))}
:where(.prompt-story) .chat-fold-prompt{flex:1 1 auto;min-width:0;opacity:.62;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
:where(.prompt-story) .chat-fold-kept{flex:none;display:inline-flex;align-items:center;gap:4px;padding:1px calc(6px * var(--u));border-radius:8px;background:var(--paper-on-body);white-space:nowrap}:where(.prompt-story) .chat-fold-kept svg.v-icon{width:calc(9px * var(--u));height:calc(9px * var(--u))}
:where(.prompt-story) .chat-fold-more{flex:none;opacity:.5;white-space:nowrap}
:where(.prompt-story) .chat-sent{align-self:flex-end;max-width:82%;will-change:transform,opacity}
:where(.prompt-story) .chat-bubble.v-bubble[data-slot]{background:var(--paper-on-body);color:var(--ink-on-body);font:400 calc(13px * var(--u))/1.35 var(--font-text);padding:calc(6px * var(--u)) calc(12px * var(--u)) calc(7px * var(--u));max-width:none}
:where(.prompt-story) .chat-bubble-me.v-bubble[data-slot]{border-radius:14px 14px 4px 14px;box-shadow:inset 0 0 0 100vmax var(--paper-on-body)}
:is(:root[data-mode="dark"], .dark) :where(.prompt-story) .chat-bubble.v-bubble[data-slot]{background:var(--paper-on-body);color:var(--ink-on-body)}
:where(.prompt-story) .chat-work{list-style:none;margin:0;padding:0 2px;display:flex;flex-direction:column;align-items:flex-start;gap:calc(6px * var(--u))}
:where(.prompt-story) .chat-sent,:where(.prompt-story) .chat-reply{transform:translateY(var(--dy,0px))}
:where(.prompt-story) .chat-row{position:relative;display:flex;align-items:center;gap:calc(10px * var(--u));min-height:calc(18px * var(--u));font:500 calc(12px * var(--u))/1.3 var(--font-text);letter-spacing:.01em;opacity:0;transform:translateY(var(--dy,0px));will-change:transform,opacity;--tone:var(--v-olive-deep,#808F53)}
:where(.prompt-story) .chat-row-text{min-width:0;overflow:hidden;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2}
:where(.prompt-story) .chat-row-text b{font-weight:700;box-shadow:inset 0 -1.5px 0 color-mix(in srgb,var(--tone) 70%,transparent)}
:where(.prompt-story) .chat-row[data-tone=prepare]{--tone:color-mix(in srgb,var(--v-olive-deep,#808F53) 60%,var(--v-blue-deep,#8BA2C8))}
:where(.prompt-story) .chat-row[data-tone=reach]{--tone:var(--v-blue-deep,#8BA2C8)}
:where(.prompt-story) .chat-row[data-tone=kept]{--tone:var(--v-yellow-deep,#E8C84D)}
:where(.prompt-story) .chat-row[data-tone=automation]{--tone:var(--v-yellow-deep,#E8C84D)}
:where(.prompt-story) .chat-row-glyph{position:relative;flex:none;display:grid;place-items:center;width:calc(18px * var(--u));height:calc(18px * var(--u));border-radius:50%;background:color-mix(in srgb,var(--tone) 72%,transparent);color:var(--ink-on-body);transform:scale(var(--g,1));will-change:transform}
:where(.prompt-story) .chat-row-glyph::after{content:"";position:absolute;inset:-3px;border-radius:50%;border:1.5px solid var(--tone);opacity:calc(var(--p,0) * .8);transform:scale(calc(1 + (1 - var(--p,0)) * 1.2))}
:where(.prompt-story) .chat-row-glyph svg.v-icon{width:calc(11px * var(--u));height:calc(11px * var(--u));stroke-width:2.1}
:where(.prompt-story) .chat-row-action{min-height:calc(26px * var(--u));flex-wrap:wrap;row-gap:4px}:where(.prompt-story) .chat-row-action .chat-row-text{flex:0 1 auto}
:where(.prompt-story) .chat-reply{display:flex;gap:calc(9px * var(--u));align-items:flex-end;max-width:88%;opacity:0;will-change:transform,opacity}
:where(.prompt-story) .chat-glyph{flex:none;width:calc(15px * var(--u));height:calc(15px * var(--u));margin-bottom:calc(5px * var(--u));border-radius:44% 56% 52% 48%/56% 46% 54% 44%;background:var(--v-pink-deep,#E09CC1);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--ink-on-body) 18%,transparent)}
:where(.prompt-story) .chat-bubble-reply{position:relative;flex:1;min-width:calc(170px * var(--u));display:flex;flex-direction:column;gap:calc(6px * var(--u));padding:calc(7px * var(--u)) calc(12px * var(--u)) calc(8px * var(--u));border-radius:14px 14px 14px 4px;background:var(--paper-on-body)}
:where(.prompt-story) .reply-text{margin:0;font:400 calc(12px * var(--u))/1.42 var(--font-text);min-height:2.85em}:where(.prompt-story) .reply-line{opacity:var(--la,0);transform:translateY(calc((1 - var(--la,0)) * 3px));display:inline}:where(.prompt-story) .reply-line:nth-child(2){opacity:var(--lb,0);transform:translateY(calc((1 - var(--lb,0)) * 3px))}:where(.prompt-story) .reply-line:nth-child(3){opacity:var(--lc,0);transform:translateY(calc((1 - var(--lc,0)) * 3px))}
:where(.prompt-story) .chat-typing{position:absolute;left:calc(12px * var(--u));top:50%;translate:0 -50%;display:flex;gap:4px;opacity:var(--typing,0)}:where(.prompt-story) .chat-typing i{width:calc(5px * var(--u));height:calc(5px * var(--u));border-radius:50%;background:var(--ink-on-body);opacity:.5;animation:pb-typing 1.1s ease-in-out infinite}:where(.prompt-story) .chat-typing i:nth-child(2){animation-delay:.15s}:where(.prompt-story) .chat-typing i:nth-child(3){animation-delay:.3s}
:where(.prompt-story) .response-check{position:absolute;right:calc(-26px * var(--u));bottom:calc(8px * var(--u));color:var(--ink-on-body);opacity:var(--check,0);scale:calc(.6 + .4 * var(--check,0))}:where(.prompt-story) .response-check svg.v-icon{width:calc(16px * var(--u));height:calc(16px * var(--u))}
:where(.prompt-story) .bud-button.v-btn[data-slot]{height:calc(26px * var(--u));min-height:calc(26px * var(--u));font-size:calc(11px * var(--u));font-weight:600;padding:0 calc(11px * var(--u));gap:6px;background:color-mix(in srgb,var(--tone) 48%,var(--paper-on-body));box-shadow:0 0 0 1px color-mix(in srgb,var(--tone) 65%,transparent),0 0 0 calc(var(--p,0) * 7px) color-mix(in srgb,var(--tone) 35%,transparent);color:var(--ink-on-body);white-space:nowrap;transform:scale(calc(.7 + .3 * var(--g,1)));transform-origin:left center}:where(.prompt-story) .bud-button:disabled{opacity:.85}
:where(.prompt-story) .bud-button.v-btn[data-slot]:not(:disabled):hover{background:color-mix(in srgb,var(--tone) 62%,var(--paper-on-body))}
:where(.prompt-story) .bud-button.v-btn[data-slot] .v-icon{width:calc(13px * var(--u));height:calc(13px * var(--u))}

:where(.prompt-story) .eyes{position:absolute;left:0;top:0;display:flex;gap:calc(6px * var(--u));translate:-50% -50%;will-change:transform}
:where(.prompt-story) .eyes i{display:block;width:calc(3px * var(--u));height:calc(6px * var(--u));border-radius:50%;background:#2b2530;transform:scaleY(calc(1 - var(--lid,0)));animation:pb-blink 5.4s infinite}
:where(.prompt-story) .eyes[data-small=true]{gap:calc(4px * var(--u))}:where(.prompt-story) .eyes[data-small=true] i{width:calc(2px * var(--u));height:calc(4px * var(--u))}
:where(.prompt-story) .thing{position:absolute;left:0;top:0;display:flex;align-items:center;gap:calc(11px * var(--u));color:var(--v-text);opacity:0;white-space:nowrap;will-change:transform,opacity;--kind:var(--v-olive-deep,#808F53);--fill:var(--v-olive,#B9C48E);--phase:calc(var(--i,0) * -1.15s)}
:where(.prompt-story) .thing[data-empty=true]{display:none}
:where(.prompt-story) .thing[data-side=left]{flex-direction:row-reverse}
:where(.prompt-story) .thing[data-kind=teammate]{--kind:var(--v-blue-deep,#8BA2C8);--fill:var(--v-blue,#B7C7E6)}
:where(.prompt-story) .thing[data-kind=subagent]{--kind:color-mix(in srgb,var(--v-blue-deep,#8BA2C8) 55%,var(--v-ink));--fill:color-mix(in srgb,var(--v-blue,#B7C7E6) 70%,var(--v-ink))}
:where(.prompt-story) .thing[data-kind=report]{--kind:var(--v-yellow-deep,#E8C84D);--fill:var(--v-yellow,#F3E39A)}
:where(.prompt-story) .thing[data-kind=skill]{--kind:color-mix(in srgb,var(--v-olive-deep,#808F53) 50%,var(--v-yellow-deep,#E8C84D));--fill:color-mix(in srgb,var(--v-olive,#B9C48E) 50%,var(--v-yellow,#F3E39A))}
:where(.prompt-story) .thing[data-kind=file]{--kind:var(--v-pink-deep,#E09CC1);--fill:var(--v-pink,#F4C6DC)}
:where(.prompt-story) .thing-shape{position:relative;flex:none;display:grid;place-items:center;width:calc(48px * var(--u));height:calc(46px * var(--u));color:color-mix(in srgb,var(--v-ink) 86%,var(--kind));background:radial-gradient(130% 120% at 28% 22%,color-mix(in srgb,var(--fill) 45%,#fff) 0%,var(--fill) 48%,color-mix(in srgb,var(--fill) 72%,var(--kind)) 100%);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--kind) 55%,transparent),inset 0 1px 1px #ffffff8c,inset 0 -3px 6px -4px color-mix(in srgb,var(--kind) 50%,transparent),0 10px 22px -12px color-mix(in srgb,var(--kind) 55%,#000);border-radius:46% 54% 52% 48%/56% 44% 56% 44%;animation:pb-blob 9s ease-in-out infinite;animation-delay:var(--phase)}
:where(.prompt-story) .thing-shape svg.v-icon{width:calc(18px * var(--u));height:calc(18px * var(--u));stroke-width:1.75}
:where(.prompt-story) .thing[data-kind=memory] .thing-shape::after{content:"";position:absolute;inset:-2px;border-radius:inherit;border:1.5px solid var(--kind);opacity:0;animation:pb-recall 7s ease-out infinite;animation-delay:var(--phase);pointer-events:none}
:where(.prompt-story) .thing[data-kind=file] .thing-shape{width:calc(42px * var(--u));height:calc(50px * var(--u));border-radius:44% 56% 48% 52%/52% 48% 52% 48%;animation:pb-blob 8.5s ease-in-out infinite,pb-flutter 9s ease-in-out infinite;animation-delay:var(--phase),calc(var(--phase) * 1.7)}
:where(.prompt-story) .thing[data-kind=skill] .thing-shape{width:calc(50px * var(--u));height:calc(44px * var(--u));animation-duration:6.5s}
:where(.prompt-story) .thing[data-kind=skill] .thing-shape svg.v-icon{animation:pb-twinkle 5s ease-in-out infinite;animation-delay:calc(var(--phase) * 2.1)}
:where(.prompt-story) .thing[data-kind=teammate] .thing-shape{width:calc(46px * var(--u));height:calc(46px * var(--u));color:var(--v-on-accent,#1a1620);font:700 calc(12px * var(--u))/1 var(--font-display);letter-spacing:.02em;animation:pb-blob 11s ease-in-out infinite,pb-nod 8s ease-in-out infinite;animation-delay:var(--phase),calc(var(--phase) * 1.3)}
:where(.prompt-story) .thing[data-kind=teammate] .thing-shape::before{content:"";position:absolute;right:0;bottom:1px;width:calc(10px * var(--u));height:calc(10px * var(--u));border-radius:50%;background:var(--v-olive-deep,#808F53);box-shadow:0 0 0 2.5px var(--v-paper);animation:pb-presence 3.2s ease-in-out infinite;animation-delay:calc(var(--phase) * .8)}
:where(.prompt-story) .thing[data-kind=subagent] .thing-shape{width:calc(58px * var(--u));height:calc(42px * var(--u));color:#F6EFE2;animation-duration:7s}
:where(.prompt-story) .thing[data-kind=subagent] .thing-shape::after{content:"";position:absolute;left:0;top:0;width:calc(7px * var(--u));height:calc(7px * var(--u));border-radius:50%;background:var(--kind);box-shadow:0 0 0 2px var(--v-paper),0 0 calc(8px * var(--busy,0)) var(--kind);opacity:calc(.55 + .45 * var(--busy,0));offset-path:inset(calc(-7px * var(--u)) round 50% / 45%);offset-rotate:0deg;animation:pb-orbit calc(6.4s - 5.3s * var(--busy,0)) linear infinite;animation-delay:var(--phase);pointer-events:none}
:where(.prompt-story) .thing[data-kind=report] .thing-shape{width:calc(44px * var(--u));height:calc(50px * var(--u));animation-duration:10s}
:where(.prompt-story) .thing[data-kind=report] .thing-shape::before{content:"";position:absolute;inset:0;border-radius:inherit;background:linear-gradient(115deg,transparent 38%,#ffffffb0 50%,transparent 62%) no-repeat;background-size:300% 100%;background-position:150% 0;animation:pb-glint 8s ease-in-out infinite;animation-delay:calc(var(--phase) * 1.5);pointer-events:none}
:where(.prompt-story) .thing-ring{position:absolute;inset:-8px;border-radius:inherit;border:2px solid var(--kind);opacity:calc((1 - var(--rip,1)) * .9);transform:scale(calc(1 + var(--rip,1) * .9));pointer-events:none}
:where(.prompt-story) .thing-flash{position:absolute;inset:0;border-radius:inherit;background:#fff;opacity:calc(var(--flash,0) * .65);pointer-events:none}
:where(.prompt-story) .thing-busy{position:absolute;left:50%;bottom:calc(-13px * var(--u));translate:-50% 0;display:none;gap:3px;opacity:var(--busy,0)}:where(.prompt-story) .thing[data-kind=teammate] .thing-busy{display:flex}:where(.prompt-story) .thing-busy i{width:calc(4px * var(--u));height:calc(4px * var(--u));border-radius:50%;background:var(--kind);animation:pb-typing 1s ease-in-out infinite}:where(.prompt-story) .thing-busy i:nth-child(2){animation-delay:.15s}:where(.prompt-story) .thing-busy i:nth-child(3){animation-delay:.3s}
:where(.prompt-story) .thing-label{display:flex;flex-direction:column;gap:calc(1.5px * var(--u));font:700 calc(12.5px * var(--u))/1.15 var(--font-text);letter-spacing:.005em;opacity:var(--t,1);transform:translateX(calc((1 - var(--t,1)) * 6px))}
:where(.prompt-story) .thing-label em{display:flex;align-items:center;gap:5px;font:700 calc(8.5px * var(--u))/1 var(--font-text);font-style:normal;letter-spacing:.18em;text-transform:uppercase;color:var(--v-text-2)}:where(.prompt-story) .thing-label em::before{content:"";width:calc(5px * var(--u));height:calc(5px * var(--u));border-radius:50%;background:var(--kind)}
:where(.prompt-story) .thing-label small{font-size:calc(10.5px * var(--u));font-weight:500;color:var(--v-text-2)}
:where(.prompt-story) .thing[data-side=left] .thing-label{align-items:flex-end;text-align:right;transform:translateX(calc((var(--t,1) - 1) * 6px))}:where(.prompt-story) .thing[data-side=left] .thing-label em{flex-direction:row-reverse}
.prompt-story[data-compact=true] .thing{gap:0}.prompt-story[data-compact=true] .thing-label{display:none}.prompt-story[data-compact=true] .thing-shape{width:32px;height:31px}.prompt-story[data-compact=true] .thing[data-kind=teammate] .thing-shape{width:31px;height:31px;font-size:9px}.prompt-story[data-compact=true] .thing[data-kind=subagent] .thing-shape{width:38px;height:28px}.prompt-story[data-compact=true] .thing[data-kind=report] .thing-shape{width:30px;height:34px}.prompt-story[data-compact=true] .thing[data-kind=file] .thing-shape{width:28px;height:34px}.prompt-story[data-compact=true] .thing[data-kind=skill] .thing-shape{width:34px;height:30px}.prompt-story[data-compact=true] .thing-shape svg.v-icon{width:14px;height:14px}.prompt-story[data-compact=true] .thing[data-kind=teammate] .thing-shape::before{width:7px;height:7px}

:where(.prompt-story) .prompt-caption{text-align:center;height:calc(124px * var(--u));min-height:0;padding-top:calc(6px * var(--u));box-sizing:border-box;position:relative;z-index:5;display:flex;flex-direction:column;align-items:center}
:where(.prompt-story) .prompt-caption>p{margin:0 calc(18px * var(--u)) calc(10px * var(--u));font-size:calc(13px * var(--u));line-height:1.5;color:var(--v-text-2)}.prompt-story[data-beat="1"] .prompt-caption>p{animation:pb-cue-late 2.4s both}
:where(.prompt-story) .prompt-thoughts{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:calc(8px * var(--u)) calc(10px * var(--u));margin:calc(4px * var(--u)) calc(16px * var(--u)) calc(14px * var(--u))}
:where(.prompt-story) .thoughts-label{font-size:calc(10px * var(--u));letter-spacing:.14em;text-transform:uppercase;color:var(--v-text-2);margin-right:calc(4px * var(--u))}
:where(.prompt-story) .thought.v-btn[data-slot]{position:relative;height:calc(32px * var(--u));min-height:calc(32px * var(--u));font-size:calc(12px * var(--u));font-weight:500;padding:0 calc(14px * var(--u));color:var(--v-text);background:var(--field-glass);box-shadow:inset 0 1px 0 #ffffff55,0 0 0 1px var(--field-edge);border-radius:999px;animation:pb-chip-in .5s both,pb-chip-float 5.6s ease-in-out infinite;animation-delay:calc(var(--i,0) * .12s + .25s),calc(var(--i,0) * -1.9s);transition:transform .25s cubic-bezier(.4,0,.2,1),opacity .25s,box-shadow .25s,background .25s}
:where(.prompt-story) .thought.v-btn[data-slot]:hover{box-shadow:inset 0 1px 0 #ffffff55,0 0 0 1px color-mix(in srgb,var(--v-brand) 55%,transparent);background:color-mix(in srgb,var(--v-paper) 86%,transparent);transform:translateY(-1px)}
:where(.prompt-story) .thought[data-picked=true].v-btn[data-slot]{opacity:0;transform:scale(.85)}
:where(.prompt-story) .thought-tail{position:absolute;left:-1px;bottom:-5px;display:block;width:14px;height:12px}:where(.prompt-story) .thought-tail b{position:absolute;border-radius:50%;background:var(--field-glass);box-shadow:inset 0 1px 0 #ffffff55,0 0 0 1px var(--field-edge)}:where(.prompt-story) .thought-tail b:first-child{left:5px;bottom:5px;width:7px;height:7px}:where(.prompt-story) .thought-tail b:last-child{left:0;bottom:0;width:4px;height:4px}
:where(.prompt-story) .enter-invitation.v-btn[data-slot]{font-size:calc(11px * var(--u));gap:calc(9px * var(--u));background:transparent;color:var(--v-text);box-shadow:none;height:calc(36px * var(--u));min-height:calc(36px * var(--u))}
:where(.prompt-story) .prompt-caption kbd{font:calc(10px * var(--u)) var(--font-text);padding:calc(5px * var(--u)) calc(8px * var(--u));border:1px solid color-mix(in srgb,var(--v-text) 23%,transparent);border-radius:7px;transition:border-color .25s}:where(.prompt-story) .enter-invitation:hover kbd{border-color:var(--v-brand)}:where(.prompt-story) .prompt-caption>p.again-hint{font-size:calc(11px * var(--u));color:var(--v-text)}:is(:root[data-mode="dark"], .dark) :where(.prompt-story) .prompt-caption>p.again-hint{color:var(--v-text)}
:where(.prompt-story) .lifecycle-progress{display:flex;gap:calc(8px * var(--u));justify-content:center;padding:calc(12px * var(--u)) 0 calc(6px * var(--u))}:where(.prompt-story) .lifecycle-progress span{width:calc(5px * var(--u));height:calc(5px * var(--u));border-radius:999px;background:var(--v-text);opacity:.15;transition:width .5s,opacity .5s}:where(.prompt-story) .lifecycle-progress [data-current=true]{width:calc(24px * var(--u));background:var(--v-brand);opacity:.75}:where(.prompt-story) .lifecycle-progress [data-complete=true]{opacity:.4;background:var(--v-olive)}
:where(.prompt-story) .lifecycle-steps{display:flex;gap:4px;margin-top:calc(2px * var(--u))}:where(.prompt-story) .lifecycle-step.v-btn[data-slot]{font-size:calc(10px * var(--u));color:var(--v-text-2);gap:calc(8px * var(--u));height:calc(36px * var(--u));min-height:calc(36px * var(--u));padding:0 calc(12px * var(--u));box-shadow:none;background:transparent;transition:color .2s}:where(.prompt-story) .lifecycle-step.v-btn[data-slot]:not(:disabled):hover{color:var(--v-text)}:where(.prompt-story) .lifecycle-step:disabled{opacity:.35}

.prompt-story[data-quiet=true] :is(.eyes i,.chat-typing i,.stop-glyph i,.thought,.thing-busy i,.thing-shape,.thing-shape::before,.thing-shape::after,.thing-shape svg.v-icon){animation:none}
@keyframes pb-cue-late{0%,78%{opacity:0}100%{opacity:1}}@keyframes pb-blink{0%,46%,50%,100%{scale:1 1}48%{scale:1 .1}}@keyframes pb-typing{0%,100%{translate:0 0;opacity:.45}50%{translate:0 -3px;opacity:1}}@keyframes pb-stop-breathe{0%,100%{scale:1;opacity:.85}50%{scale:1.18;opacity:1}}
@keyframes pb-orbit{to{offset-distance:100%}}@keyframes pb-blob{0%,100%{border-radius:46% 54% 52% 48%/56% 44% 56% 44%}33%{border-radius:58% 42% 45% 55%/42% 60% 40% 58%}66%{border-radius:44% 56% 60% 40%/54% 44% 56% 46%}}@keyframes pb-chip-in{from{opacity:0}to{opacity:1}}@keyframes pb-chip-float{0%,100%{translate:0 0}50%{translate:0 -3px}}
@keyframes pb-recall{0%{opacity:.55;transform:scale(1)}30%{opacity:0;transform:scale(1.7)}100%{opacity:0;transform:scale(1.7)}}
@keyframes pb-flutter{0%,86%,100%{transform:skewX(0) rotate(0)}90%{transform:skewX(3deg) rotate(-1.5deg)}95%{transform:skewX(-2deg) rotate(1deg)}}
@keyframes pb-twinkle{0%,70%,100%{transform:scale(1) rotate(0);filter:drop-shadow(0 0 0 transparent)}80%{transform:scale(1.22) rotate(-8deg);filter:drop-shadow(0 0 4px #fff9)}90%{transform:scale(.96) rotate(4deg)}}
@keyframes pb-nod{0%,80%,100%{rotate:0deg}86%{rotate:-4deg}93%{rotate:3deg}}
@keyframes pb-presence{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.25);opacity:.75}}
@keyframes pb-glint{0%,70%{background-position:150% 0}85%,100%{background-position:-50% 0}}
:is(:root[data-mode="dark"], .dark) :where(.prompt-story) .eyes i{background:#F6EFE2e6}
:is(:root[data-mode="dark"], .dark) .prompt-story{--ink-on-body:#F6EFE2;--paper-on-body:#1a1620b8;--field-glass:#F6EFE247;--field-edge:#F6EFE299;--field-ink:#F6EFE2;--note:#2a2433}
:is(:root[data-mode="dark"], .dark) :where(.prompt-story) .living-prompt [data-slot=input-control]::placeholder{color:#F6EFE2c9}
:is(:root[data-mode="dark"], .dark) :where(.prompt-story) .thoughts-label{color:#F6EFE2b8}
:is(:root[data-mode="dark"], .dark) :where(.prompt-story) .thought.v-btn[data-slot]{background:var(--field-glass);box-shadow:inset 0 1px 0 #ffffff33,0 0 0 1px var(--field-edge)}
:is(:root[data-mode="dark"], .dark) :where(.prompt-story) .thought.v-btn[data-slot]:hover{background:#F6EFE252;box-shadow:inset 0 1px 0 #ffffff33,0 0 0 1px color-mix(in srgb,var(--v-pink) 80%,transparent)}
:is(:root[data-mode="dark"], .dark) :where(.prompt-story) .thought-tail b{box-shadow:inset 0 1px 0 #ffffff33,0 0 0 1px var(--field-edge)}
:is(:root[data-mode="dark"], .dark) :where(.prompt-story) .living-prompt::before{box-shadow:inset 0 1px 0 #ffffff40,0 0 0 1px var(--field-edge),0 0 0 calc(max(var(--line,1) - 1, 0) * 1.4px) color-mix(in srgb,var(--v-pink-deep,#E09CC1) 75%,transparent),0 0 34px -6px #F6EFE240,0 14px 40px -22px #000}
:is(:root[data-mode="dark"], .dark) :where(.prompt-story) .living-prompt:focus-within::before{box-shadow:inset 0 1px 0 #ffffff40,0 0 0 1px color-mix(in srgb,var(--v-pink) 80%,transparent),0 0 0 calc(max(var(--line,1) - 1, 0) * 1.4px) color-mix(in srgb,var(--v-pink-deep,#E09CC1) 75%,transparent),0 0 34px -6px #F6EFE240,0 14px 40px -22px #000}
:is(:root[data-mode="dark"], .dark) :where(.prompt-story) .thought.v-btn[data-slot]{color:#F6EFE2}:is(:root[data-mode="dark"], .dark) :where(.prompt-story) .thing-shape{color:#1a1620;background:radial-gradient(130% 120% at 28% 22%,color-mix(in srgb,var(--fill) 72%,#fff) 0%,var(--fill) 50%,color-mix(in srgb,var(--fill) 78%,#2a2433) 100%);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--kind) 65%,#F6EFE2),inset 0 1px 1px #ffffff73,0 0 26px -6px color-mix(in srgb,var(--fill) 70%,transparent),0 10px 22px -12px #0009}:is(:root[data-mode="dark"], .dark) :where(.prompt-story) .thing[data-kind=subagent] .thing-shape{color:#F6EFE2}:is(:root[data-mode="dark"], .dark) :where(.prompt-story) .thing[data-kind=teammate] .thing-shape::before{background:var(--v-olive,#B9C48E);box-shadow:0 0 0 2.5px #2a2433}:is(:root[data-mode="dark"], .dark) :where(.prompt-story) .thing[data-kind=subagent] .thing-shape::after{background:#F6EFE2;box-shadow:0 0 0 2px color-mix(in srgb,var(--fill) 60%,transparent),0 0 calc(10px * var(--busy,0)) var(--fill)}:is(:root[data-mode="dark"], .dark) :where(.prompt-story) .thing[data-kind=memory] .thing-shape::after{border-color:var(--fill)}:is(:root[data-mode="dark"], .dark) :where(.prompt-story) .thing-ring{border-color:var(--fill)}
:is(:root[data-mode="dark"], .dark) :where(.prompt-story) .thing-label{color:#F6EFE2;text-shadow:0 1px 10px #0000006e}:is(:root[data-mode="dark"], .dark) :where(.prompt-story) .thing-label em,:is(:root[data-mode="dark"], .dark) :where(.prompt-story) .thing-label small{color:#F6EFE2bf}
:is(:root[data-mode="dark"], .dark) :where(.prompt-story) .prompt-caption>p{color:#F6EFE2c9}
:is(:root[data-mode="dark"], .dark) :where(.prompt-story) .thing[data-kind=report] .thing-shape::before{background-image:linear-gradient(115deg,transparent 38%,#ffffff70 50%,transparent 62%)}
:is(:root[data-mode="dark"], .dark) :where(.prompt-story) .thing-flash{opacity:calc(var(--flash,0) * .35)}
:is(:root[data-mode="dark"], .dark) :where(.prompt-story) .prompt-membrane{--membrane-ink:#14121b;--membrane-dim:.34;--membrane-glow:.5}

@container prompt-bond (max-width:700px){.prompt-story{--story-top:104px;--story-bottom:118px}:where(.prompt-story) .prompt-title .prompt-headline{font-size:38px}:where(.prompt-story) .prompt-title .headline-part+.headline-part{margin-left:0}:where(.prompt-story) .prompt-title .headline-part{display:block}
:where(.prompt-story) .prompt-theatre{height:auto;flex:1 1 auto;min-height:290px;max-height:min(376px,50cqh);margin:22px 0 0;--field-w:64%;--field-h:56px;--panel-h:calc(100% - 44px)}:where(.prompt-story) .living-prompt{gap:7px;padding:0 4px 0 14px}.prompt-story[data-bonded=true] .living-prompt{padding-left:36px}.prompt-story[data-beat="2"] .living-prompt,.prompt-story[data-beat="9"] .living-prompt{padding-left:18px}:where(.prompt-story) .living-prompt [data-slot=input-control]{font-size:15px}:where(.prompt-story) .prompt-prefix{font-size:22px}:where(.prompt-story) .prompt-send.v-btn[data-slot]{width:38px;min-width:38px;height:38px;min-height:38px}:where(.prompt-story) .prompt-caption{height:112px}:where(.prompt-story) .prompt-caption>p{font-size:11px;max-width:300px}:where(.prompt-story) .prompt-thoughts{margin:0 12px 10px;gap:6px}:where(.prompt-story) .thoughts-label{display:none}:where(.prompt-story) .thought.v-btn[data-slot]{font-size:11px;height:30px;min-height:30px;padding:0 12px}:where(.prompt-story) .thought:nth-child(n+4){display:none}:where(.prompt-story) .eyes{gap:4px}:where(.prompt-story) .eyes i{width:2.5px;height:5px}:where(.prompt-story) .eyes[data-small=true] i{width:1.8px;height:3.5px}:where(.prompt-story) .chat-panel{padding:9px 14px calc(var(--field-h) - 3px);gap:3px}:where(.prompt-story) .chat-row-action .chat-row-text{display:none}:where(.prompt-story) .chat-fold{left:14px;right:14px;top:3px;height:13px;font-size:9px;padding-bottom:1px}:where(.prompt-story) .chat-panel:has(.chat-fold){padding-top:18px}:where(.prompt-story) .chat-fold-kept{display:none}:where(.prompt-story) .chat-bubble.v-bubble[data-slot]{font-size:12px;padding:5px 10px 6px}:where(.prompt-story) .chat-row{font-size:10.5px;gap:7px;min-height:16px}:where(.prompt-story) .chat-row-glyph{width:16px;height:16px}:where(.prompt-story) .chat-row-glyph svg.v-icon{width:10px;height:10px}:where(.prompt-story) .chat-work{gap:4px}:where(.prompt-story) .chat-reply{max-width:92%}:where(.prompt-story) .chat-bubble-reply{min-width:140px;padding:7px 10px 8px;gap:4px}:where(.prompt-story) .reply-text{font-size:11px;line-height:1.4;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;overflow:hidden}:where(.prompt-story) .chat-row-text{-webkit-line-clamp:1}:where(.prompt-story) .bud-button.v-btn[data-slot]{font-size:10px;height:22px;min-height:22px;padding:0 8px}:where(.prompt-story) .response-check{right:-22px}}
@container prompt-bond (max-height:620px) and (min-width:701px){.prompt-story{--story-top:calc(80px * var(--u));--story-bottom:calc(80px * var(--u))}:where(.prompt-story) .prompt-caption{height:calc(104px * var(--u))}:where(.prompt-story) .prompt-thoughts{display:none}:where(.prompt-story) .prompt-theatre{margin:calc(12px * var(--u)) 0 0}}
}

@layer cojeev-accessibility {
  .prompt-story[data-moving=false] *{animation-play-state:paused}
  @media(prefers-reduced-motion:reduce){
    .bond-scene *,.bond-scene *::before,.bond-scene *::after{animation:none;transition:none}
    .bond-scene .bond-background canvas{animation:pb-field-in 0s linear 3.4s both}
  }
}
`;

function CojeevStyles() {
  return (
    <style href="000h-prompt-bond" precedence="default">
      {COJEEV_CSS}
    </style>
  );
}
