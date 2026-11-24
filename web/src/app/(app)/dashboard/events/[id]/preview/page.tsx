import { EventPreview } from "./event-preview";

/**
 * How the public page will look, before publishing (SRS 4.2: "Preview an
 * event before publication"). `params` is a promise in Next.js 15+.
 */
export default async function EventPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EventPreview eventID={id} />;
}
