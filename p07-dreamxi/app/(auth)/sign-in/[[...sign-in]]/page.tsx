import { redirect } from "next/navigation";

function normalizeRedirect(value?: string) {
  if (!value) return "/contests";
  if (!value.startsWith("/")) return "/contests";
  if (value.startsWith("//")) return "/contests";
  return value;
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect_url?: string; redirectUrl?: string }>;
}) {
  const params = await searchParams;
  const target = normalizeRedirect(params.redirect_url ?? params.redirectUrl);
  redirect(target);
}
