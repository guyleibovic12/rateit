# RateIt

אפליקציית Web מותאמת מובייל לדירוג דגמי נעליים חדשים. נבנתה מחדש ב-Next.js, עם ממשק RTL מלא בעברית.

## קונספט

- **מדרגים (raters)** נכנסים עם שם או כ"אנונימי", ומדרגים כל דגם ב-1 עד 5 כוכבים. ניתן לדרג גם מהמקלדת (מקשים 1-5). האפליקציה זוכרת איפה כל מדרג הפסיק ומאפשרת להמשיך משם.
- **מנהלים (admins)** מזוהים אוטומטית לפי שם משתמש (`ADMIN_USERNAMES`), ויכולים:
  - לייבא דגמים מקובץ CSV / Excel
  - להעלות תמונות ולמפות אותן לדגמים (באופן אוטומטי לפי שם קובץ / מק"ט, או ידנית)
  - לראות דשבורד סיכום עם פילוח לפי דגם ולפי מדרג, עם סינונים (כולם / בעלי שם / אנונימיים / בחירה ידנית)
  - לייצא את כל הדירוגים ל-CSV

## טכנולוגיה

- **Next.js 16** (App Router, TypeScript) — frontend + API routes באותו פרויקט
- **Tailwind CSS v4** לעיצוב, RTL מלא
- **SQLite** (`better-sqlite3`) לאחסון הנתונים — קובץ DB מקומי, ללא תלות בשירות חיצוני
- תמונות נשמרות בדיסק המקומי (תיקיית `uploads` תחת `DATA_DIR`) ומוגשות דרך route מוגן (רק למשתמשים מחוברים)

## הרצה מקומית

```bash
npm install
cp .env.example .env.local   # ולערוך ADMIN_USERNAMES לפי הצורך
npm run dev
```

האפליקציה תרוץ על http://localhost:3000

## הרצה עם Docker

```bash
cp .env.example .env   # docker compose קורא .env אוטומטית
docker compose up -d --build
```

הנתונים (DB + תמונות) נשמרים ב-volume בשם `rateit_data`, כך שהם שורדים restart/rebuild.

## פריסה על שרת (Proxmox / VM / כל שרת עם Docker) + Cloudflare Tunnel

```bash
# על השרת (למשל VM ב-Proxmox):
git clone <repo-url> rateit && cd rateit
cp .env.example .env
nano .env   # למלא ADMIN_USERNAMES, NEXT_PUBLIC_GA_MEASUREMENT_ID, CLOUDFLARE_TUNNEL_TOKEN
docker compose up -d --build
```

ה-`docker-compose.yml` כולל שני שירותים:
- **rateit** — האפליקציה עצמה, פורט 3000 (אפשר להסיר את מיפוי הפורט החוצה לגמרי אם הגישה היחידה היא דרך הטאנל)
- **cloudflared** — Cloudflare Tunnel, חושף את האפליקציה לציבור בלי לפתוח פורטים בראוטר/פיירוול

להקמת הטאנל:
1. ב-Cloudflare Zero Trust Dashboard: Networks → Tunnels → Create a tunnel → Cloudflared → Docker
2. מעתיקים את ה-`--token` מתוך הפקודה שמוצגת, שמים ב-`.env` בתור `CLOUDFLARE_TUNNEL_TOKEN`
3. בלשונית Public Hostname של הטאנל: מגדירים Hostname (למשל `rateit.yourdomain.com`) שמצביע על Service `http://rateit:3000` (שם השירות בתוך רשת ה-Docker, לא localhost)
4. `docker compose up -d --build`

## משתני סביבה

| משתנה | ברירת מחדל | תיאור |
|---|---|---|
| `PORT` | `3000` | פורט השרת |
| `DATA_DIR` | `./data` | תיקייה לקובץ ה-DB ולתמונות שהועלו |
| `ADMIN_USERNAMES` | (ריק) | רשימת שמות משתמש (מופרדים בפסיק, לא תלוי רישיות) שמקבלים הרשאת מנהל אוטומטית בכניסה |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | (ריק) | מזהה Google Analytics 4 (`G-XXXXXXXXXX`). נטמע בזמן build — שינוי דורש `docker compose build` מחדש |
| `CLOUDFLARE_TUNNEL_TOKEN` | (ריק) | טוקן החיבור של ה-Tunnel מ-Cloudflare Zero Trust, לשירות ה-`cloudflared` |

## מבנה הפרויקט

```
src/
  app/
    page.tsx              # מסך כניסה
    rate/page.tsx          # מסך דירוג למדרגים
    admin/                 # דשבורד ניהול (דגמים / תמונות / סיכום)
    api/                   # כל ה-API routes (auth, models, images, ratings, summary, export, files)
  lib/
    db.ts                  # אתחול SQLite + סכמה
    auth.ts                # לוגיקת כניסה/session
    types.ts
```
