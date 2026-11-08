// Shared by <Reveal> (client) and the public layout (server). Kept out of the
// "use client" module so the server can import the string itself.
export const REVEAL_READY_ATTR = "data-reveal-ready";

// Inline script rendered at the top of the public layout. Arms the reveal CSS
// only when JS runs; if no <Reveal> has hydrated within the grace period (JS
// error, blocked bundle, very slow device), it disarms so nothing stays hidden.
export const REVEAL_ARM_SCRIPT = `(function(){var d=document.documentElement;d.classList.add("reveal-armed");setTimeout(function(){if(!d.hasAttribute("${REVEAL_READY_ATTR}"))d.classList.remove("reveal-armed")},4000)})();`;
