/** The logo: "tuition" in the display style with a small raised "+" in the tuition colour. */
export function Wordmark({ className = "text-xl" }: { className?: string }) {
  return (
    <span className={`display inline-flex items-start leading-none ${className}`}>
      tuition
      <span className="ml-0.5 text-[0.7em] text-cat-tuition" aria-hidden="true">
        +
      </span>
      <span className="sr-only">+</span>
    </span>
  );
}
