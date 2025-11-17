# API User Management System

Sistem manajemen user dengan API key yang terintegrasi dengan database MySQL.

## Fitur Utama

- ✅ Admin Login & Register
- ✅ Dashboard dengan list user dan API keys
- ✅ Generate API key otomatis (berlaku 30 hari)
- ✅ Buat user baru dengan validasi
- ✅ Automatic API key expiry (status berubah menjadi inactive setelah 30 hari)
- ✅ Session management dengan express-session
- ✅ Password hashing dengan bcrypt

## Struktur Database

### Tabel: admin
```sql
- id (INT, Primary Key)
- email (VARCHAR 255, UNIQUE)
- password (VARCHAR 255, hashed)
```

### Tabel: apikey
```sql
- id (INT, Primary Key)
- key_value (VARCHAR 255, UNIQUE)
- created_at (TIMESTAMP)
- expires_at (TIMESTAMP)
- status (ENUM: 'active', 'inactive')
```

### Tabel: user
```sql
- id (INT, Primary Key)
- first_name (VARCHAR 100)
- last_name (VARCHAR 100)
- email (VARCHAR 255)
- apikey_id (INT, Foreign Key → apikey.id)
```

## Setup Awal

### 1. Setup Database MySQL

```bash
# Login ke MySQL
mysql -u root -p

# Buat database dan tabel
source db.sql
```

Atau jalankan queries dalam `db.sql` secara manual di MySQL client.

### 2. Konfigurasi Database Connection

Edit file `index.js` dan ubah konfigurasi MySQL:

```javascript
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',           // Sesuaikan dengan user MySQL Anda
  password: '',           // Sesuaikan dengan password MySQL Anda
  database: 'apiuser',
  // ... rest of config
});
```

### 3. Install Dependencies

```bash
npm install
```

## Menjalankan Aplikasi

```bash
# Terminal Windows
node index.js

# atau gunakan npm script (perlu ditambahkan di package.json)
npm start
```

Server akan berjalan di: **http://localhost:3000**

## Alur Penggunaan

### 1. Login/Register Admin
- Buka http://localhost:3000
- Jika belum punya akun, klik "Register"
- Isi email dan password, lalu create account
- Login dengan credentials yang baru dibuat

### 2. Dashboard
- Tampilan list users dengan API key mereka
- Tampilan list API keys dengan status dan tanggal kadaluarsa
- Tombol "Buat User Baru"
- Tombol "Logout"

### 3. Create User
- Klik tombol "Buat User Baru" di dashboard
- Step 1: Klik "Generate" untuk membuat API key (otomatis tersimpan)
- Step 2: Isi data user (first name, last name, email)
- Step 3: Klik "Create User" untuk menyimpan ke database

### 4. API Key Management
- API key berlaku 30 hari dari tanggal pembuatan
- Status otomatis berubah menjadi 'inactive' setelah kadaluarsa
- Setiap user memiliki 1 API key (relasi one-to-many terbalik)

## File Structure

```
Project_API_auth/
├── index.js              # Server utama (Express)
├── db.sql                # Schema database
├── package.json          # Dependencies
├── README.md             # Dokumentasi ini
└── public/
    ├── index.html        # Redirect page
    ├── login.html        # Login & Register page
    ├── dashboard.html    # Dashboard utama
    └── create-user.html  # Halaman buat user
```

## API Endpoints

### Authentication
- `POST /api/register` - Register admin baru
- `POST /api/login` - Login admin
- `POST /api/logout` - Logout
- `GET /api/check-auth` - Check authentication status

### User Management
- `POST /api/create-user` - Create user baru
- `GET /api/users` - Get semua users dengan API key mereka

### API Key Management
- `POST /api/generate-apikey` - Generate API key baru
- `GET /api/apikeys` - Get semua API keys

## Security Notes

1. Password di-hash menggunakan bcrypt dengan salt 10
2. Session disimpan di memory (perlu store eksternal untuk production)
3. Secret key session harus diganti di production
4. Gunakan HTTPS di production
5. Input validation dilakukan di frontend dan backend

## Dependency List

- **express** - Web framework
- **mysql2** - MySQL driver dengan promise support
- **bcrypt** - Password hashing
- **crypto** - Generate random API keys
- **express-session** - Session management

## Troubleshooting

### Database Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:3306
```
**Solusi:** Pastikan MySQL server sudah running

### "Table doesn't exist" Error
**Solusi:** Jalankan `db.sql` untuk membuat tabel

### EADDRINUSE Port 3000
```
Error: listen EADDRINUSE: address already in use :::3000
```
**Solusi:** 
- Gunakan port lain: ubah `const PORT = 3000` menjadi port lain
- Atau kill proses yang menggunakan port 3000

## Development Mode

Untuk development dengan auto-reload, install nodemon:

```bash
npm install -D nodemon
```

Update package.json scripts:

```json
"scripts": {
  "start": "node index.js",
  "dev": "nodemon index.js"
}
```

Kemudian jalankan:
```bash
npm run dev
```

## Future Enhancements

- [ ] Add password reset functionality
- [ ] Add API key revocation
- [ ] Add user deletion
- [ ] Add audit logs
- [ ] Add email verification
- [ ] Add two-factor authentication
- [ ] Add rate limiting
- [ ] Add database migration system
