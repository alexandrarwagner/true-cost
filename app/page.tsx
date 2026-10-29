import { EstimateFlow } from "@/components/EstimateFlow";
import { copy } from "@/content/copy";
import { decodeShare } from "@/lib/schema/share";

// A shared link can be edited: /?c=IN&... prefills the form, decoded on the server.
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(raw)) if (typeof v === "string") params.set(k, v);
  const initial = decodeShare(params);
  return (
    <>
      <h1 className="text-2xl font-semibold">{copy.siteName}</h1>
      <p className="mt-1 mb-6">{copy.tagline}</p>
      <EstimateFlow initial={initial} />
    </>
  );
}
