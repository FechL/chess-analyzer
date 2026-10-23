# Kuda Chess Studio

Aplikasi catur localhost dengan pilihan bahasa Indonesia/Inggris, komponen **ObsidianUI Dashboard Shell**, React, TypeScript, Tailwind CSS v4, chess.js, dan **Stockfish 19 lite WebAssembly**.

## Menjalankan

Memerlukan Node.js 22.12+ (atau versi 24 LTS) dan npm.

```bash
npm install
npm run dev
```

Buka **http://127.0.0.1:5173**. Server hanya mendengarkan loopback. Instalasi pertama membutuhkan internet; engine, bidak, dan font kemudian disajikan dari localhost. Tidak memerlukan API key, akun, atau layanan analisis eksternal.

`postinstall`, `predev`, dan `prebuild` menyiapkan aset engine otomatis. Bila perlu:

```bash
npm run prepare:engine
```

## Fitur

- **Analisis:** PGN/FEN, unggah berkas, papan klik/drag, langkah legal, rokade, en passant, pilihan promosi, navigasi keyboard, balik papan, dan jelajah cabang dengan kembali ke jalur sebelumnya.
- **Stockfish lokal:** evaluasi putih, mate score, depth, 1–3 variasi UCI dalam SAN, panah saran, waktu analisis 0,2–5 detik per posisi.
- **Game review:** analisis setiap posisi, estimasi akurasi kedua warna, kategori langkah, grafik evaluasi yang dapat diklik, catatan pelatih berbasis aturan, dan latihan ulang kesalahan menggunakan langkah terbaik hasil engine.
- **Lawan bot:** empat tingkat kesulitan, putih/hitam/acak, waktu 3/5/10 menit serta preset bullet/blitz/rapid dan waktu kustom dengan increment. Mendukung antrean hingga lima premove, petunjuk (H), undo, navigasi notasi, penanda ancaman lawan, buah tertangkap, dan analisis permainan. Sesi serta jam disimpan secara lokal dan dijeda saat meninggalkan halaman; mode Tanpa Bantuan memblokir Hint/Undo dan engine, Bantuan membuka Hint/Undo, dan Bantuan Penuh membuka tab Engine serta seluruh Opsi. Pengaturan bantuan bot terpisah dari analisis.
- **Opening explorer:** katalog 12 opening dengan lebih dari 1.100 variasi lokal dari Lichess. Detail opening memakai workspace board dan sidebar penjelasan, pencarian variasi, notasi, serta mode Belajar/Latihan/Review dengan balasan otomatis. Progres dan jadwal pengulangan 1/3/7/14/30 hari tersimpan lokal; langkah yang perlu diperbaiki atau memakai petunjuk tetap masuk antrean review. Setiap opening punya alamat langsung, misalnya `#openings/italian`.
- **Akademi:** sembilan pelajaran interaktif tentang pusat, perkembangan, rokade, fork, pin, skakmat baris belakang, promosi, en passant, dan kombinasi Morphy.
- **Puzzle Lichess:** puzzle permainan nyata dari API resmi Lichess, filter tema dan tingkat kesulitan, rating, petunjuk, solusi, dan progres. Maksimal lima puzzle disimpan per kombinasi filter dan diisi ulang saat puzzle digunakan; pengambilan puzzle baru memerlukan internet, tanpa akun atau API key.
- **Tampilan:** mode terang (default) atau gelap, tema buah Classic/Merida/Celtic, notasi huruf/gambar/keduanya, dan bahasa Indonesia/Inggris untuk seluruh antarmuka. Ikon kategori langkah pada buah dapat diaktifkan di tab Opsi.
- **Navigasi variasi:** penghitung menjadi `- / -` ketika keluar dari notasi asli, dengan tombol untuk kembali ke langkah terakhir notasi asli.
- **Koleksi:** simpan, cari, buka, hapus permainan dengan konfirmasi, ekspor PGN, serta catatan posisi yang bisa diekspor.
- Preferensi papan, sesi analisis, ulasan terakhir, koleksi, catatan, dan progres tersimpan di browser.

## Pemeriksaan

Pada opening trainer, challenge Learn dibuka berurutan setelah line sebelumnya selesai.
Practice untuk setiap line terbuka setelah Learn line tersebut selesai. Hasil Learn
menyediakan pilihan langsung Practice atau melanjutkan ke line berikutnya. Panah langkah
hanya tersedia dalam Learn, aktif secara default, dan bisa dinonaktifkan dari panel Lesson.

```bash
npm test
npm run build
npm run preview
```

Tes memeriksa legalitas semua jalur opening/latihan, PGN/FEN round-trip, aturan khusus, parsing UCI, normalisasi skor hitam, dan perhitungan ulasan. Build menjalankan pemeriksaan TypeScript. Pengujian browser mencakup pemuatan engine, ulasan, impor, bot, latihan, dan navigasi.

## Batas yang perlu dipahami

Stockfish lite memakai jaringan lebih kecil daripada versi penuh. Waktu pencarian dibatasi, sehingga posisi rumit memerlukan pemeriksaan lebih lama. Ulasan cepat memakai **350 ms per posisi**, terpisah dari pengaturan analisis posisi.

Akurasi menggunakan perubahan estimasi peluang menang dengan kurva publik berbasis centipawn, kemudian fungsi akurasi eksponensial. Kategori langkah adalah heuristik aplikasi; hasilnya **bukan skor resmi Chess.com atau Lichess**. Angka Elo bot merupakan perkiraan tingkat latihan, belum dikalibrasi melalui pertandingan rating. Catatan pelatih memakai aturan dan variasi Stockfish, bukan LLM.

Explorer memakai jalur pengantar terkurasi dan database nama/variasi Lichess CC0. Variasi bernama mencakup pilihan utama, gambit, dan cabang samping; variasi tersebut tidak selalu merupakan rekomendasi langkah terbaik engine. Penjelasan langkah memberi panduan prinsip umum; materi ini tidak menyediakan statistik pertandingan atau komentar khusus untuk setiap posisi. Jam latihan dijalankan di browser, bukan jam kompetisi yang tahan manipulasi.

Data tersimpan dalam `localStorage` pada browser dan origin yang sama. Menghapus data browser dapat menghilangkan progres dan koleksi. Ekspor PGN untuk cadangan permainan; PGN tidak mencakup catatan posisi yang tersimpan terpisah.

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
