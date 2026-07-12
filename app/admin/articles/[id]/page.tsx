import { redirect } from "next/navigation";

type PageProps = { params: Promise<{ id: string }> };

export default async function ArticleEditRedirectPage({ params }: PageProps) {
  const { id } = await params;
  redirect(`/admin/articles/${id}/edit`);
}
