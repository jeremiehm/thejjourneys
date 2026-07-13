import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp", "avif"]);

export type UploadImageResult =
  | { ok: true; url: string; bucket: string }
  | { ok: false; error: string };

export async function uploadAdminImage(file: File): Promise<UploadImageResult> {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) {
    return { ok: false, error: "Supabase is not configured. Paste an image URL instead." };
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return { ok: false, error: "Unsupported file type. Use JPG, PNG, GIF, or WebP." };
  }

  const path = `uploads/${crypto.randomUUID()}.${ext}`;
  const buckets = ["media", "article-images"] as const;

  for (const bucket of buckets) {
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      upsert: false,
      contentType: file.type || `image/${ext === "jpg" ? "jpeg" : ext}`,
    });
    if (!error) {
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      return { ok: true, url: data.publicUrl, bucket };
    }
    if (!error.message.toLowerCase().includes("bucket")) {
      return { ok: false, error: error.message };
    }
  }

  return { ok: false, error: "No storage bucket available. Check Supabase storage setup." };
}
