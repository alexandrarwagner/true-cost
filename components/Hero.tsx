import { copy } from "@/content/copy";

/** Small rounded tiles with an icon, inline in the headline. Decorative: the sentence reads without them. */
function Tile({ tone, children }: { tone: string; children: React.ReactNode }) {
  return (
    <span
      aria-hidden="true"
      className={`mx-1 inline-flex h-[0.95em] w-[1.15em] items-center justify-center rounded-[0.22em] align-[-0.12em] ${tone}`}
    >
      {children}
    </span>
  );
}

const Book = () => (
  <svg
    viewBox="0 0 24 24"
    className="h-[60%] w-[60%]"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" />
    <path d="M4 20.5V5.5M20 18v3H6.5" />
  </svg>
);
const Receipt = () => (
  <svg
    viewBox="0 0 24 24"
    className="h-[60%] w-[60%]"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M6 3h12v18l-2-1.5L14 21l-2-1.5L10 21l-2-1.5L6 21z" />
    <path d="M9 8h6M9 12h6" />
  </svg>
);

export function Hero() {
  const t = copy.hero;
  return (
    <section className="container flex flex-col items-center pt-10 text-center sm:pt-20 lg:pt-[150px]">
      <h1 className="display max-w-[1100px] text-[40px] leading-none sm:text-display lg:text-display-lg">
        {t.headline1}
        <Tile tone="bg-cat-tuition-chip text-ink">
          <Book />
        </Tile>
        {t.headline2}
        <Tile tone="bg-cat-living text-ink">
          <Receipt />
        </Tile>
        {t.headline3}
      </h1>
      <p className="mx-auto mt-6 max-w-[680px] text-lg leading-[1.55] text-muted sm:text-xl">
        {t.subhead}
      </p>
    </section>
  );
}
