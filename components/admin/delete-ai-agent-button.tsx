"use client";

import { deleteAiAgent } from "@/app/admin/actions";

type DeleteAiAgentButtonProps = {
  id: string;
  name: string;
};

export function DeleteAiAgentButton({ id, name }: DeleteAiAgentButtonProps) {
  return (
    <form
      action={deleteAiAgent}
      onSubmit={(event) => {
        if (!confirm(`Delete agent "${name}"?`)) event.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="font-medium text-red-600 hover:text-red-700">
        Delete
      </button>
    </form>
  );
}
