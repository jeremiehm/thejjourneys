"use client";

import { deleteCollection } from "@/app/admin/actions";

type DeleteCollectionButtonProps = {
  id: string;
  title: string;
};

export function DeleteCollectionButton({ id, title }: DeleteCollectionButtonProps) {
  return (
    <form
      action={deleteCollection}
      onSubmit={(event) => {
        if (!confirm(`Delete collection "${title}"? Associated articles will also be deleted.`)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="font-medium text-red-600 hover:text-red-700">
        Delete
      </button>
    </form>
  );
}
