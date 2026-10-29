import { copy } from "@/content/copy";

// Placeholder. The three-input flow arrives in build step 4.
export default function HomePage() {
  return (
    <>
      <h1 className="text-2xl font-semibold">{copy.siteName}</h1>
      <p className="mt-2">{copy.tagline}</p>
    </>
  );
}
