# Panduan Deploy Aplikasi MRC & Bot WhatsApp di aaPanel (Linux)

Panduan lengkap instalasi dan deployment aplikasi **MRC (Maintenance Repair Calibration)** dan **Bot WhatsApp (Baileys)** di server menggunakan **aaPanel**.

---

## 1. Persiapan di aaPanel (App Store)
Pastikan software berikut sudah terinstall di aaPanel melalui menu **App Store**:
1. **Nginx** (Web Server, misal versi 1.22 / 1.24)
2. **MySQL** / **MariaDB** (Database Server, misal MySQL 5.7 / 8.0 atau MariaDB 10.x)
3. **PM2 Manager** atau **Node.js Version Manager** (pilih versi Node.js **v18.x** atau **v20.x** LTS)

---

## 2. Membuat Database MySQL
1. Buka menu **Database** di sidebar aaPanel.
2. Klik tombol **Add database**:
   - **DBName**: `mrc_db`
   - **DBUser**: `mrc_user` (atau sesuaikan)
   - **Password**: *(Buat password aman & catat)*
   - **Character**: `utf8mb4`
3. Klik tombol **Import** pada database `mrc_db` yang baru dibuat (atau buka via phpMyAdmin).
4. Upload dan import file **`mrc_db.sql`** yang ada di dalam paket arsip.

---

## 3. Upload & Ekstrak File Project
1. Buka menu **Files** di sidebar aaPanel.
2. Buat / buka direktori website Anda, misalnya:  
   `/www/wwwroot/mrc.domainanda.com`
3. Upload file arsip (`mrc-deployment.rar` atau `mrc-deployment.zip`) ke direktori tersebut.
4. Klik kanan file arsip lalu pilih **Uncompress** (Ekstrak).
5. Buka file **`.env`** di File Manager aaPanel, sesuaikan kredensial database Anda:
   ```env
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_USER=mrc_user
   DB_PASSWORD=password_database_anda
   DB_NAME=mrc_db
   PORT=3554
   BOT_API_URL=http://127.0.0.1:3445
   ```

---

## 4. Install Dependensi & Jalankan Semua Layanan via PM2
Buka menu **Terminal** di aaPanel (atau via SSH terminal):
```bash
# 1. Masuk ke folder project
cd /www/wwwroot/mrc.domainanda.com

# 2. Pastikan node dan npm aktif (versi 18 / 20)
node -v
npm -v

# 3. Install dependensi Web Next.js
npm install --omit=dev

# 4. Install dependensi Bot WhatsApp
cd mrc-bot
npm install --omit=dev
cd ..

# 5. Jalankan SEMUA layanan (Web Next.js, Bot WA, Scheduler) melalui PM2
pm2 start ecosystem.config.js

# 6. Simpan konfigurasi PM2 agar otomatis start saat server restart/reboot
pm2 save
pm2 startup
```

Layanan yang otomatis berjalan di PM2:
* **`mrc-web`**: Web Next.js (Port `3554`)
* **`mrc-bot`**: WhatsApp Bot Baileys (Port `3445`, sesi login sudah tersimpan di folder `auth_info`)
* **`mrc-scheduler`**: Pengirim notifikasi & reminder jatuh tempo otomatis

Untuk memantau status atau log kapan saja:
```bash
pm2 status
pm2 logs mrc-bot
pm2 logs mrc-web
```

---

## 5. Konfigurasi Domain & Reverse Proxy di Nginx
Agar aplikasi web dapat diakses langsung melalui domain (port 80 / 443 HTTPS):
1. Buka menu **Website** di aaPanel.
2. Klik **Add site** jika belum dibuat:
   - **Domain name**: `mrc.sekolah.sch.id` (sesuaikan domain Anda)
   - **FTP**: False
   - **Database**: False (sudah dibuat di langkah 2)
   - **PHP version**: `Pure / Static` (atau no PHP)
3. Setelah site terbuat, klik nama domain untuk membuka **Site Settings**:
4. Pilih tab **Reverse Proxy** -> Klik **Add reverse proxy**:
   - **Proxy name**: `nextjs`
   - **Target URL**: `http://127.0.0.1:3554`
   - **Sent Domain**: `$host`
   - Centang / aktifkan fitur **WebSocket**.
   - Klik **Submit / Save**.
5. *(Sangat disarankan)* Buka tab **SSL** -> Centang Let's Encrypt untuk mengaktifkan HTTPS agar akses Kamera Webcam browser diizinkan.

---

## 6. Login Default
* **Admin**:
  - Username: `admin`
  - Password: `password_lama_anda` (atau `nesas1965!`)
* **Operator**:
  - Username: `operator`
  - Password: `operator123`
*(Password dapat diubah kapan saja melalui menu Pengaturan)*
