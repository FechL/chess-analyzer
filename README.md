# Kuda Chess Studio

Aplikasi catur localhost berbahasa Indonesia dengan komponen **ObsidianUI Dashboard Shell**, React, TypeScript, Tailwind CSS v4, chess.js, dan **Stockfish 19 lite WebAssembly**.

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
- **Lawan bot:** empat preset Stockfish, putih/hitam/acak, waktu tanpa batas/5/10 menit, mulai dari posisi analisis, petunjuk, undo, menyerah, dan pindah ke analisis.
- **Opening explorer:** 12 opening, pencarian, filter warna, penjelasan strategi, langkah contoh, dan latihan dengan balasan otomatis.
- **Akademi:** sembilan pelajaran interaktif tentang pusat, perkembangan, rokade, fork, pin, skakmat baris belakang, promosi, en passant, dan kombinasi Morphy.
- **Taktik:** enam tantangan dengan petunjuk, jawaban, umpan balik, dan progres.
- **Koleksi:** simpan, cari, buka, hapus permainan dengan konfirmasi, ekspor PGN, serta catatan posisi yang bisa diekspor.
- Preferensi papan, sesi analisis, ulasan terakhir, koleksi, catatan, dan progres tersimpan di browser.

## Pemeriksaan

```bash
npm test
npm run build
npm run preview
```

Tes memeriksa legalitas semua jalur opening/latihan, PGN/FEN round-trip, aturan khusus, parsing UCI, normalisasi skor hitam, dan perhitungan ulasan. Build menjalankan pemeriksaan TypeScript. Pengujian browser mencakup pemuatan engine, ulasan, impor, bot, latihan, dan navigasi.

## Batas yang perlu dipahami

Stockfish lite memakai jaringan lebih kecil daripada versi penuh. Waktu pencarian dibatasi, sehingga posisi rumit memerlukan pemeriksaan lebih lama. Ulasan cepat memakai **350 ms per posisi**, terpisah dari pengaturan analisis posisi.

Akurasi menggunakan perubahan estimasi peluang menang dengan kurva publik berbasis centipawn, kemudian fungsi akurasi eksponensial. Kategori langkah adalah heuristik aplikasi; hasilnya **bukan skor resmi Chess.com atau Lichess**. Tidak ada klaim rating Elo untuk preset bot. Tidak ada label brilliant yang dibuat-buat. Catatan pelatih memakai aturan dan variasi Stockfish, bukan LLM.

Explorer merupakan **repertoar terkurasi**, bukan database statistik jutaan pertandingan. Jam latihan dijalankan di browser, bukan jam kompetisi yang tahan manipulasi. Undo tidak mengembalikan jam sebelumnya.

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
