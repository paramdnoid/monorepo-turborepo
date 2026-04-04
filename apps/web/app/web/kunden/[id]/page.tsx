import { redirect } from "next/navigation";

type PageProps = { params: Promise<{ id: string }> };

export default async function KundenLegacyIdRedirectPage({ params }: PageProps) {
  const { id } = await params;
  redirect(`/web/customers/${id}`);
}
