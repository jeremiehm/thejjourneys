"use client";

import { deleteArticle } from "@/app/admin/actions";

type DeleteArticleButtonProps = {
  id: string;
  title: string;
};

export function DeleteArticleButton({ id, title }: DeleteArticleButtonProps) {
  return (
    <form
      action={deleteArticle}
      onSubmit={(event) => {
        if (!confirm(`Supprimer l'article « ${title} » ?`)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="font-medium text-red-600 hover:text-red-700">
        Supprimer
      </button>
    </form>
  );
}
