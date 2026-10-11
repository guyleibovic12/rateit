"use client";

import { useEffect, useRef, useState } from "react";

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

export default function ImagesTab() {
  const [models, setModels] = useState<ModelOption[]>([]);
  const [unassigned, setUnassigned] = useState<ImageRow[] | null>(null);
  const [targetModel, setTargetModel] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

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

  async function upload(files: FileList) {
    setUploading(true);
    setMsg("");
    try {
      const fd = new FormData();
      if (targetModel) fd.append("modelId", targetModel);
      for (const f of Array.from(files)) fd.append("files", f);
      const res = await fetch("/api/images", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה בהעלאה");
      setMsg(
        targetModel
          ? `הועלו ${data.total} תמונות לדגם הנבחר`
          : `${data.assigned} הותאמו אוטומטית, ${data.unassigned} ממתינות למיפוי ידני`
      );
      load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "שגיאה בהעלאה");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
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
          ותמונות שלא תואמו יחכו למיפוי ידני למטה.
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
        <input
          ref={fileRef}
          type="file"
          multiple
          accept="image/*"
          disabled={uploading}
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) upload(e.target.files);
          }}
          className="w-full text-sm text-muted"
        />
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
