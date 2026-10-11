"use client";

import { useEffect, useRef, useState } from "react";
import { parseJsonResponse } from "@/lib/fetchJson";

interface ModelOption {
  id: string;
  name: string;
  sku: string | null;
}

interface ImageRow {
  id: string;
  model_id: string | null;
  original_name: string | null;
  filename: string;
}

const BATCH_SIZE = 20;

export default function ImagesTab() {
  const [models, setModels] = useState<ModelOption[]>([]);
  const [unassigned, setUnassigned] = useState<ImageRow[] | null>(null);
  const [targetModel, setTargetModel] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [msg, setMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);

  async function load() {
    const [modelsRes, imagesRes] = await Promise.all([
      fetch("/api/models"),
      fetch("/api/images?unassigned=1"),
    ]);
    const modelsData = await modelsRes.json();
    const imagesData = await imagesRes.json();
    setModels(modelsData.models || []);
    setUnassigned(imagesData.images || []);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount
    load();
  }, []);

  async function upload(fileList: FileList) {
    const files = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
    if (files.length === 0) {
      setMsg("לא נמצאו קבצי תמונה בבחירה");
      return;
    }

    setUploading(true);
    setMsg("");
    setProgress({ done: 0, total: files.length });

    let assigned = 0;
    let unassignedCount = 0;
    let failed = 0;
    let lastError = "";

    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE);
      const fd = new FormData();
      if (targetModel) fd.append("modelId", targetModel);
      for (const f of batch) fd.append("files", f);

      try {
        const res = await fetch("/api/images", { method: "POST", body: fd });
        const { ok, data } = await parseJsonResponse(res);
        if (!ok) {
          failed += batch.length;
          lastError = (data as { error?: string })?.error || "שגיאה בהעלאה";
        } else {
          const d = data as { assigned: number; unassigned: number };
          assigned += d.assigned;
          unassignedCount += d.unassigned;
        }
      } catch {
        failed += batch.length;
        lastError = "שגיאת רשת בהעלאה";
      }

      setProgress({ done: Math.min(i + BATCH_SIZE, files.length), total: files.length });
    }

    setUploading(false);
    setProgress(null);
    if (fileRef.current) fileRef.current.value = "";
    if (folderRef.current) folderRef.current.value = "";

    const parts = [];
    if (assigned || unassignedCount) {
      parts.push(
        targetModel
          ? `הועלו ${assigned + unassignedCount} תמונות לדגם הנבחר`
          : `${assigned} הותאמו אוטומטית, ${unassignedCount} ממתינות למיפוי ידני`
      );
    }
    if (failed) parts.push(`${failed} תמונות נכשלו (${lastError})`);
    setMsg(parts.join(" · ") || "לא הועלה כלום");

    load();
  }

  async function assign(imageId: string, modelId: string) {
    await fetch(`/api/images/${imageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modelId: modelId || null }),
    });
    load();
  }

  async function remove(imageId: string) {
    await fetch(`/api/images/${imageId}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-6 py-4">
      <section className="bg-surface border border-border rounded-2xl p-4 space-y-3">
        <h2 className="font-semibold">העלאת תמונות</h2>
        <p className="text-muted text-sm">
          ניתן לבחור דגם מסוים, או להעלות קבוצה שלמה — המערכת תנסה להתאים אוטומטית לפי שם הקובץ / מק&quot;ט,
          ותמונות שלא תואמו יחכו למיפוי ידני למטה. העלאה גדולה (מאות תמונות) מתבצעת אוטומטית בקבוצות קטנות.
        </p>
        <select
          value={targetModel}
          onChange={(e) => setTargetModel(e.target.value)}
          className="w-full rounded-lg bg-surface-2 border border-border px-3 py-2 text-sm outline-none focus:border-accent"
        >
          <option value="">— התאמה אוטומטית / מיפוי ידני —</option>
          {models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} {m.sku ? `(${m.sku})` : ""}
            </option>
          ))}
        </select>

        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted">בחירת קבצים</span>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept="image/*"
              disabled={uploading}
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) upload(e.target.files);
              }}
              className="w-full text-xs text-muted"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted">בחירת תיקייה שלמה</span>
            <input
              ref={folderRef}
              type="file"
              // @ts-expect-error -- non-standard attributes for folder selection, supported in Chrome/Edge/Safari
              webkitdirectory=""
              directory=""
              multiple
              disabled={uploading}
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) upload(e.target.files);
              }}
              className="w-full text-xs text-muted"
            />
          </label>
        </div>

        {progress && (
          <div className="space-y-1">
            <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
              <div
                className="h-full bg-accent transition-all"
                style={{ width: `${(progress.done / progress.total) * 100}%` }}
              />
            </div>
            <p className="text-xs text-muted">
              מעלה {progress.done} / {progress.total}...
            </p>
          </div>
        )}
        {msg && <p className="text-sm text-accent-2">{msg}</p>}
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold px-1">
          תמונות ללא מיפוי ({unassigned?.length ?? 0})
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {unassigned?.map((img) => (
            <div key={img.id} className="bg-surface border border-border rounded-xl overflow-hidden">
              <img
                src={`/api/files/${img.filename}`}
                alt={img.original_name || ""}
                className="w-full aspect-square object-cover"
              />
              <div className="p-2 space-y-2">
                <p className="text-xs text-muted truncate">{img.original_name}</p>
                <select
                  defaultValue=""
                  onChange={(e) => assign(img.id, e.target.value)}
                  className="w-full rounded-md bg-surface-2 border border-border px-2 py-1.5 text-xs outline-none"
                >
                  <option value="" disabled>
                    שיוך לדגם...
                  </option>
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => remove(img.id)}
                  className="w-full text-danger text-xs py-1"
                >
                  מחק תמונה
                </button>
              </div>
            </div>
          ))}
        </div>
        {unassigned?.length === 0 && (
          <p className="text-muted text-sm text-center py-6">אין תמונות שמחכות למיפוי 🎉</p>
        )}
      </section>
    </div>
  );
}
