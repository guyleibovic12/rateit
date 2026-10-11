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

הדרך המומלצת (ברירת מחדל): **cloudflared כשירות מערכת native** (לא container) שמתחבר ל-`localhost:3000`. הפורט של האפליקציה נשאר קשור ל-`127.0.0.1` בלבד — שום דבר לא נחשף ברשת מלבד דרך הטאנל.

```bash
# על השרת (למשל VM/LXC ב-Proxmox), עם Docker + docker compose מותקנים מראש:
git clone <repo-url> rateit && cd rateit
./scripts/deploy-proxmox.sh
```

הסקריפט (`scripts/deploy-proxmox.sh`) עושה הכל אוטומטית:
1. מתקין `cloudflared` (apt repo של Cloudflare) אם חסר
2. `cloudflared tunnel login` — **הצעד היחיד שדורש אינטראקציה**: נפתח קישור, מאשרים בדפדפן מול חשבון ה-Cloudflare ובוחרים את הדומיין `guyleibo.tech`
3. יוצר טאנל בשם `rateit` (אם לא קיים כבר)
4. כותב `/etc/cloudflared/config.yml` עם ingress rule ל-`rateit.guyleibo.tech` → `http://localhost:3000`
5. `cloudflared tunnel route dns` — יוצר את רשומת ה-DNS אוטומטית
6. מתקין את `cloudflared` כ-systemd service (עולה אוטומטית אחרי reboot)
7. יוצר `.env` מ-`.env.example` (עם `ADMIN_USERNAMES=arik_admin`, `NEXT_PUBLIC_GA_MEASUREMENT_ID=G-4CHYG42M2R`) אם לא קיים
8. `docker compose up -d --build` — מרים את האפליקציה

בסיום: האפליקציה זמינה ב-**https://rateit.guyleibo.tech**

אפשר להריץ את הסקריפט שוב בבטחה (idempotent) — הוא מדלג על שלבים שכבר בוצעו.

### חלופה: cloudflared כ-container

אם עדיף טאנל בתוך Docker במקום systemd service, יש שירות `cloudflared` מוכן ב-`docker-compose.yml` תחת profile נפרד (לא עולה כברירת מחדל):
1. ב-Cloudflare Zero Trust Dashboard: Networks → Tunnels → Create a tunnel → Cloudflared → Docker, מעתיקים את ה-`--token`
2. שמים ב-`.env` בתור `CLOUDFLARE_TUNNEL_TOKEN`
3. בלשונית Public Hostname של הטאנל: Service = `http://rateit:3000` (שם השירות ברשת ה-Docker, לא localhost)
4. `docker compose --profile docker-tunnel up -d --build`

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
