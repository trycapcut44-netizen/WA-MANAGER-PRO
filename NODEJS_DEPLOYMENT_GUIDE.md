# WA MANAGER PRO - Complete Node.js Deployment Guide

Yeh guide aapko WA MANAGER PRO ko kisi bhi Node.js hosting ya VPS par deploy karne ke mukammal tareeqay faraham karti hai.

---

## 1. Hostinger par Node.js Setup (Hostinger Web Apps / VPS)

### Option A: Agar Hostinger me "Web Apps" / "Node.js" mojood hai (Business / Cloud Hosting):
1. **Hostinger hPanel** me jayein aur **Web Applications** ya **Node.js** par click karein.
2. **Add Application** / **Create Application** select karein:
   - **Framework / Runtime:** Node.js (Node 20 ya 18)
   - **Root Directory:** Apka domain folder (e.g., `public_html` ya `socialshopservice.online`)
   - **Entry Point / Startup File:** `app.js` ya `server.js`
   - **Build Command:** `npm install && npm run build`
   - **Run / Start Command:** `npm start`
3. Files upload karein (ya GitHub repo connect karein: `https://github.com/trycapcut44-netizen/WA-MANAGER-PRO`).
4. **Deploy** par click karein.

---

### Option B: Hostinger VPS ya Kisi bhi Ubuntu/Debian VPS par (DigitalOcean, Contabo, AWS, etc.) — *Best & Most Stable*
WhatsApp bots ke liye VPS sabse best option hota hai kyunke Baileys sessions 24/7 background me bina band hue chalte hain.

#### Step 1: VPS me login karein
```bash
ssh root@YOUR_SERVER_IP
```

#### Step 2: Node.js (v20) aur Git install karein (agar nahi hai)
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git nginx
npm install -g pm2
```

#### Step 3: Project clone karein aur build karein
```bash
cd /var/www
git clone https://github.com/trycapcut44-netizen/WA-MANAGER-PRO.git
cd WA-MANAGER-PRO

# Dependencies & build
npm install
npm run build
```

#### Step 4: PM2 se start karein (Background 24/7 Runner)
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

#### Step 5: Nginx Domain & SSL Setup
Nginx configuration create karein:
```bash
nano /etc/nginx/sites-available/socialshopservice.online
```
Neeche wala code paste karein (apne domain ke mutabiq):
```nginx
server {
    listen 80;
    server_name socialshopservice.online www.socialshopservice.online;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```
Enable karein aur Nginx restart karein:
```bash
ln -s /etc/nginx/sites-available/socialshopservice.online /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```
Free SSL (Certbot) lagayein:
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d socialshopservice.online -d www.socialshopservice.online
```

---

## 2. Render.com / Railway par 1-Click Deployment (Bina Server Management ke)

Agar aap server manage nahi karna chahte aur free/cheap cloud hosting chahte hain:
1. **Render.com** par jayein aur **New Web Service** banayein.
2. Apna GitHub repository connect karein: `https://github.com/trycapcut44-netizen/WA-MANAGER-PRO`
3. Settings:
   - **Environment:** Node
   - **Build Command:** `npm run build`
   - **Start Command:** `npm start`
4. Deploy kar dein. Render aapko foran live URL faraham kar dega jahan aap custom domain bhi attach kar sakte hain.

---

## 3. Docker ke zariye 1-Command Deploy
Agar aapke server me Docker install hai:
```bash
docker compose up -d --build
```
App automatically port `5000` par run ho jayegi aur sessions volume me save rahenge.
