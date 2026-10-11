export async function parseJsonResponse<T = unknown>(
  res: Response
): Promise<{ ok: boolean; data: T | { error: string } }> {
  const text = await res.text();
  try {
    return { ok: res.ok, data: JSON.parse(text) as T };
  } catch {
    return {
      ok: false,
      data: {
        error: `שרת החזיר תשובה לא תקינה (קוד ${res.status}). ייתכן שההעלאה גדולה מדי או שחלה שגיאת timeout.`,
      },
    };
  }
}
