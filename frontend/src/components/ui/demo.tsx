"use client";

import { PromptBondScene } from "@/components/ui/prompt-bond";

/**
 * The whole hero from cojeev.com. The scene fills its parent, so the demo gives it the full screen. Press Enter (or wait a few
 * seconds) and the story plays: Back and Next step through it, Replay starts again, Pause stills everything, and the toggle
 * switches the page between light and dark. The scene brings its own colours, so it looks the same on any host page.
 */
export default function Demo() {
  return (
    <div className="h-dvh min-h-[560px] w-full">
      <PromptBondScene />
    </div>
  );
}
