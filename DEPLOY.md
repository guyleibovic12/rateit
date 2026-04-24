# RateIt — הוראות פריסה על VPS

## דרישות מינימום
- Node.js 22+ **או** Docker + Docker Compose
- 512MB RAM, 2GB דיסק

---

## אפשרות א — Docker (מומלץ)

### 1. התקנת Docker על ה-VPS
```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com | sh
sudo apt install docker-compose-plugin
```

### 2. בניית הפרויקט והרצה
```bash
# העתק את תיקיית הפרויקט ל-VPS
scp -r rateit-local/ user@your-vps:/opt/rateit

# התחבר ל-VPS
ssh user@your-vps
cd /opt/rateit

# ערוך את ה-SESSION_SECRET ב-docker-compose.yml (חשוב!)
nano docker-compose.yml

# הפעל
docker compose up -d --build
```

### 3. גישה לאפליקציה
פתח דפדפן: `http://your-vps-ip:3000`

### 4. עצירה / הפעלה מחדש
```bash
docker compose stop        # עצור
docker compose start       # הפעל מחדש
docker compose logs -f     # צפה ב-logs
```

### 5. גיבוי הנתונים
```bash
# הנתונים נשמרים ב-volume: rateit_data
docker volume inspect rateit_data   # מיקום
tar -czf backup.tar.gz /var/lib/docker/volumes/rateit_data
```

---

## אפשרות ב — Node.js ישיר (ללא Docker)

### 1. התקנת Node.js 22
```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 2. פריסה
```bash
cd /opt/rateit

# התקן תלויות הממשק
npm install

# התקן תלויות השרת
cd server && npm install && cd ..

# בנה את ממשק React
npm run build:web

# צור קובץ הגדרות
cp .env.example .env
nano .env   # ערוך SESSION_SECRET ו-ADMIN_USERNAMES
```

### 3. הפעלה
```bash
# הפעלה ידנית
npm start

# הפעלה אוטומטית עם PM2 (מומלץ לייצור)
npm install -g pm2
pm2 start "npm start" --name rateit
pm2 save
pm2 startup
```

---

## הגדרות חשובות

### `docker-compose.yml` / `.env`

| משתנה | תיאור | ברירת מחדל |
|-------|-------|------------|
| `PORT` | פורט השרת | `3000` |
| `SESSION_SECRET` | מחרוזת סודית לסשנים — **חייב לשנות!** | `change-this...` |
| `ADMIN_USERNAMES` | שמות מנהלים מופרדים בפסיק | `arik_admin` |
| `DATA_DIR` | מיקום מסד הנתונים ותמונות | `./data` |

### הוספת מנהל נוסף
```bash
# ב-docker-compose.yml:
ADMIN_USERNAMES=arik_admin,david_admin,sara_admin

# הפעל מחדש:
docker compose up -d
```

---

## HTTPS (מומלץ לייצור)

להוסיף Nginx כ-reverse proxy:
```nginx
server {
    listen 80;
    server_name rateit.yourcompany.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        client_max_body_size 100M;  # לקבצים גדולים
    }
}
```

לאחר מכן הוסף SSL עם Let's Encrypt:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d rateit.yourcompany.com
```

---

## פתרון בעיות

**השרת לא עולה:**
```bash
docker compose logs rateit
```

**אין גישה לאפליקציה:**
```bash
# וודא שהפורט פתוח בחומת האש
sudo ufw allow 3000
# או
sudo firewall-cmd --add-port=3000/tcp --permanent
```

**איבוד נתונים:**
- הנתונים נשמרים ב-`data/rateit.db` (SQLite)
- גבה קובץ זה באופן קבוע
