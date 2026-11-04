# Kuda Chess Studio

Aplikasi catur localhost dengan pilihan bahasa Indonesia/Inggris, komponen **ObsidianUI Dashboard Shell**, React, TypeScript, Tailwind CSS v4, chess.js, dan **Stockfish 19 lite WebAssembly**.

## Menjalankan

Memerlukan **Node.js 22.12+** (disarankan 24 LTS), npm, dan Docker dengan Docker Compose.

```bash
npm install
npm run dev
```

Buka **http://127.0.0.1:5173**. Satu perintah tersebut:

1. Membuat `.env` dengan password database acak jika belum ada.
2. Menjalankan PostgreSQL 17 di Docker dan menunggu health check.
3. Menerapkan migrasi SQL yang belum dijalankan.
4. Menjalankan API akun/state pada `127.0.0.1:3001` dan Vite pada `127.0.0.1:5173`.

Server development dan database hanya terbuka di loopback. Port PostgreSQL default
adalah `55432`; semua port dapat diatur di `.env`. File `.env` tidak masuk Git.
Simpan file tersebut karena passwordnya dipakai oleh volume database yang sama.

`Ctrl+C` menghentikan API dan Vite. Database tetap berjalan; untuk menghentikannya:

```bash
npm run db:down
```

Perintah tersebut **tidak menghapus data**. PostgreSQL menyimpan data dalam volume
Docker `kuda-chess_postgres_data`.

Perintah terpisah tersedia bila dibutuhkan:

```bash
npm run db:up        # start PostgreSQL, membuat .env bila belum ada
npm run db:migrate   # menerapkan migrasi SQL secara idempoten
npm run dev:api      # API saja, dengan file watching
npm run dev:web      # Vite saja; membutuhkan API yang berjalan
```

Instalasi pertama membutuhkan internet. Engine, buah, dan font kemudian disajikan
dari localhost. Pengambilan permainan publik dan puzzle baru tetap membutuhkan
koneksi internet. Tidak memerlukan API key layanan analisis eksternal.

## Akun dan migrasi data browser

- Buat akun melalui **Create Account**. Username terdiri atas 3–24 huruf, angka,
  atau underscore dan unik tanpa membedakan huruf besar/kecil. Password 6–128 karakter.
- Jika aplikasi menemukan data lama yang belum terikat akun, pendaftaran menampilkan
  opsi migrasi yang aktif secara default. Koleksi, sesi analisis/bot, catatan, preferensi,
  akurasi permainan, pemain tersimpan, progres opening/academy, dan riwayat puzzle
  dipindahkan ke akun baru. Salinan data awal tetap disimpan di browser sebagai cadangan.
- Migrasi browser dijalankan satu kali per akun dan tidak menimpa key yang sudah ada
  dalam database. Data akun lain tidak dipakai sebagai sumber migrasi.
- **Profile** tersedia pada sidebar desktop dan menu More di mobile. Pengguna dapat
  mengganti username, nama tampilan dan password, serta keluar dari akun.
  Mengganti password mencabut session lain.
- PostgreSQL menjadi penyimpanan utama state akun. Browser memegang cache sinkron
  dan antrean perubahan yang belum dikonfirmasi server. Perubahan dikirim otomatis
  dengan debounce, dicoba ulang saat koneksi pulih, dan dipulihkan setelah reload.
- Pengguna yang berbeda memiliki state dan koleksi yang terpisah. Login mengisi cache
  browser dari database akun yang sesuai sebelum aplikasi catur dipasang.

API memakai session cookie `HttpOnly` dan `SameSite=Strict`; token session di database
berupa hash SHA-256. Password memakai scrypt dengan salt acak, N=131072, r=8, p=1,
dan tidak pernah dikirim kembali ke frontend. SQL memakai parameter dan semua akses
state dibatasi user dari session. Cookie `Secure` dapat diaktifkan melalui
`COOKIE_SECURE=true` jika aplikasi disajikan melalui HTTPS.

Sumber implementasi: [OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
dan [node-postgres parameterized queries](https://node-postgres.com/features/queries).

### Skema dan endpoint

Migrasi berada di `server/migrations/`. Migrasi diterapkan dalam transaksi dengan
advisory lock agar dua proses startup tidak menerapkan migrasi bersamaan.

- `users`: username unik, password hash, profil, dan waktu pembuatan.
- `sessions`: hash token, pemilik session, dan waktu kedaluwarsa.
- `user_state`: pasangan key/value per akun; format state lama dipertahankan supaya
  seluruh fitur yang sudah ada ikut dimigrasikan, termasuk nilai suara non-JSON.
- `user_imports`: pencatatan migrasi browser yang sudah dilakukan.
- `schema_migrations`: daftar migrasi SQL yang sudah diterapkan.

Endpoint API: `/api/auth/register`, `/api/auth/login`, `/api/auth/me`,
`/api/auth/logout`, `/api/profile`, `/api/profile/password`, `/api/state`,
`/api/state/import`, dan `/api/health`.

## Fitur

- **Analisis:** PGN/FEN, unggah berkas, papan klik/drag, langkah legal, rokade, en passant, pilihan promosi, navigasi keyboard, balik papan, dan jelajah cabang dengan kembali ke jalur sebelumnya.
- **Stockfish lokal:** evaluasi putih, mate score, depth, 1–3 variasi UCI dalam SAN, panah saran, waktu analisis 0,2–5 detik per posisi.
- **Game review:** analisis setiap posisi, estimasi akurasi kedua warna, kategori langkah, grafik evaluasi yang dapat diklik, catatan pelatih berbasis aturan, dan latihan ulang kesalahan menggunakan langkah terbaik hasil engine.
- **Lawan bot:** empat tingkat kesulitan, putih/hitam/acak, waktu 3/5/10 menit serta preset bullet/blitz/rapid dan waktu kustom dengan increment. Mendukung antrean hingga lima premove, petunjuk (H), undo, navigasi notasi, penanda ancaman lawan, buah tertangkap, dan analisis permainan. Sesi serta jam disimpan ke state akun dan dijeda saat meninggalkan halaman; mode Tanpa Bantuan memblokir Hint/Undo dan engine, Bantuan membuka Hint/Undo, dan Bantuan Penuh membuka tab Engine serta seluruh Opsi. Pengaturan bantuan bot terpisah dari analisis.
- **Opening explorer:** katalog 12 opening dengan variasi lokal dari Lichess yang disaring menggunakan Stockfish 19 Full. Setiap challenge berakhir pada langkah pemain; jalur yang berhenti pada langkah lawan dilengkapi balasan hasil analisis engine dengan asal data tercatat. Duplikasi posisi akhir dan prefix berulang digabungkan. Konflik jawaban pemain disaring per posisi dengan mempertahankan line lebih panjang; line yang merugikan pemain lebih dari 1 pion menurut audit juga dihapus. Detail opening memakai workspace board dan sidebar penjelasan, pencarian variasi, notasi, serta Belajar/Latihan/Review. Review menguji line yang sudah selesai Learn dan Practice 100%, dengan opsi nyawa dan timer. Progres disinkronkan ke akun. Setiap opening punya alamat langsung, misalnya `#openings/italian`.
- **Akademi:** sembilan pelajaran interaktif tentang pusat, perkembangan, rokade, fork, pin, skakmat baris belakang, promosi, en passant, dan kombinasi Morphy.
- **Puzzle Lichess:** puzzle permainan nyata dari API resmi Lichess, filter tema dan tingkat kesulitan, rating, petunjuk, solusi, dan progres. Maksimal lima puzzle disimpan per kombinasi filter dan diisi ulang saat puzzle digunakan; pengambilan puzzle baru memerlukan internet, tanpa akun atau API key.
- **Tampilan:** mode terang (default) atau gelap, tema buah Classic/Merida/Celtic, notasi huruf/gambar/keduanya, dan bahasa Indonesia/Inggris untuk seluruh antarmuka. Ikon kategori langkah pada buah dapat diaktifkan di tab Opsi.
- **Navigasi variasi:** penghitung menjadi `- / -` ketika keluar dari notasi asli, dengan tombol untuk kembali ke langkah terakhir notasi asli.
- **Koleksi:** simpan, cari, buka, hapus permainan dengan konfirmasi, ekspor PGN, serta catatan posisi yang bisa diekspor.
- Preferensi papan, sesi analisis, ulasan terakhir, koleksi, catatan, dan progres tersimpan per akun di PostgreSQL dengan cache browser.

## Pemeriksaan

Pada opening trainer, challenge Learn dibuka berurutan setelah line sebelumnya selesai.
Practice untuk setiap line terbuka setelah Learn line tersebut selesai. Hasil Learn
menyediakan pilihan langsung Practice atau melanjutkan ke line berikutnya. Panah langkah
hanya tersedia dalam Learn, aktif secara default, dan bisa dinonaktifkan dari panel Opsi.

Audit sumber, ambang kualitas langkah, dan cara membangun ulang katalog dijelaskan
di [docs/OPENING_AUDIT.md](docs/OPENING_AUDIT.md). Data hasil audit dan daftar penolakan
disertakan agar perubahan setiap cabang bisa diperiksa.

```bash
npm test
npm run build
npm run test:api # membutuhkan PostgreSQL; memakai skema tes sementara
```

Tes API memeriksa akun, username unik, cookie, login/logout, isolasi state, migrasi satu kali, origin, profil, dan pencabutan session setelah password diganti. Tes sinkronisasi memeriksa pemulihan antrean offline dan pergantian akun.

Tes fitur catur memeriksa legalitas semua jalur opening/latihan, PGN/FEN round-trip, aturan khusus, parsing UCI, normalisasi skor hitam, dan perhitungan ulasan. Build menjalankan pemeriksaan TypeScript. Pengujian browser mencakup pemuatan engine, ulasan, impor, bot, latihan, dan navigasi.

## Batas yang perlu dipahami

Stockfish lite memakai jaringan lebih kecil daripada versi penuh. Waktu pencarian dibatasi, sehingga posisi rumit memerlukan pemeriksaan lebih lama. Ulasan cepat memakai **350 ms per posisi**, terpisah dari pengaturan analisis posisi.

Akurasi menggunakan perubahan estimasi peluang menang dengan kurva publik berbasis centipawn, kemudian fungsi akurasi eksponensial. Kategori langkah adalah heuristik aplikasi; hasilnya **bukan skor resmi Chess.com atau Lichess**. Angka Elo bot merupakan perkiraan tingkat latihan, belum dikalibrasi melalui pertandingan rating. Catatan pelatih memakai aturan dan variasi Stockfish, bukan LLM.

Explorer memakai jalur pengantar terkurasi dan database nama/variasi Lichess CC0 yang disaring untuk sisi pemain. Pemeriksaan Stockfish menolak kesalahan besar menurut ambang katalog; ini memakai anggaran pencarian terbatas dan tidak menjamin kesempurnaan teori opening. Lawan masih dapat memainkan gambit yang kurang baik, tetapi respons pemain diperiksa. Kelanjutan yang ditambahkan engine dibedakan dari langkah sumber. Book Move pada Game Analysis tetap memakai database klasifikasi tersendiri. Penjelasan langkah memberi panduan prinsip umum; materi ini tidak menyediakan statistik pertandingan atau komentar khusus untuk setiap posisi. Jam latihan dijalankan di browser, bukan jam kompetisi yang tahan manipulasi.

Data akun disimpan dalam PostgreSQL. Menghapus cache browser tidak menghapus state yang sudah tersinkron. Perubahan yang belum berhasil dikirim tetap bergantung pada antrean lokal. Perubahan pada key yang sama dari beberapa perangkat mengikuti penulisan terakhir; aplikasi belum memakai penggabungan konflik real-time. PGN dapat disalin sebagai cadangan permainan, tetapi tidak mencakup seluruh state akun.

## Struktur

- `src/components/block/dashboard-shell.*`: sumber komponen resmi ObsidianUI yang dipasang melalui registry.
- `src/lib/engine.ts`: worker Stockfish dan antrean perintah UCI.
- `src/lib/chess.ts`: impor, histori, evaluasi, klasifikasi, dan penyimpanan.
- `src/pages/`: ruang analisis, bot, serta modul belajar.
- `src/data/content.ts`: materi dan jalur latihan.
- `scripts/prepare-engine.mjs`: menyalin worker/WASM tanpa memodifikasi engine.
- `docs/RESEARCH.md`: sumber riset dan keputusan produk.
- `THIRD_PARTY_NOTICES.md`: atribusi dan lisensi.

Engine Stockfish.js/Stockfish berlisensi GPL v3. Aset bidak memiliki lisensi tersendiri; lihat notices sebelum mendistribusikan aplikasi.
