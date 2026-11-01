// The "This deal ended" link: a pre-filled email or new-issue page carrying only the deal id.
// Nothing about the person is included.

export function dealReportHref(
  reportUrl: string,
  dealId: string,
  text: { subject: string; body: string },
): string {
  const q = new URLSearchParams(
    reportUrl.startsWith("mailto:")
      ? { subject: text.subject, body: text.body }
      : { title: text.subject, body: text.body },
  );
  return `${reportUrl}${reportUrl.includes("?") ? "&" : "?"}${q.toString()}`;
}
