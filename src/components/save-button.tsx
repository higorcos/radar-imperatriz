"use client";

import { useState, useTransition } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { toggleSaveArticle } from "@/app/(app)/actions";
import { toast } from "./toaster";
import { buttonClass } from "./ui";

export function SaveButton({ articleId, initialSaved }: { articleId: string; initialSaved: boolean }) {
  const [saved, setSaved] = useState(initialSaved);
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      aria-pressed={saved}
      className={buttonClass(saved ? "secondary" : "ghost", "sm")}
      onClick={() =>
        start(async () => {
          const res = await toggleSaveArticle(articleId);
          if (res.ok) {
            setSaved(res.data?.saved ?? !saved);
            toast(res.message ?? "Ok");
          } else toast(res.error, "error");
        })
      }
    >
      {saved ? <BookmarkCheck className="size-4 text-accent" aria-hidden /> : <Bookmark className="size-4" aria-hidden />}
      {saved ? "Salva" : "Salvar"}
    </button>
  );
}
