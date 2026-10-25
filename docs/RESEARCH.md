# Riset fitur dan keputusan produk

Ditinjau 20 Oktober 2026. Riset memakai halaman produk/dokumentasi resmi. Pola fungsional dipelajari tanpa menyalin tampilan atau materi pelatihan platform lain.

| Platform                                                                 | Fitur yang ditinjau                                                          | Implementasi Kuda                                                                           |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| [Lichess features](https://lichess.org/features)                         | Analysis board, Stockfish, PGN, opening explorer, study, learn from mistakes | Papan analisis, impor/ekspor, variasi, catatan posisi, latihan ulang kesalahan              |
| [Lichess practice](https://lichess.org/practice)                         | Tutorial dasar, motif taktik, skakmat, endgame                               | Tutorial dengan langkah legal, petunjuk, balasan otomatis, dan progres                      |
| [Chess.com analysis](https://www.chess.com/analysis)                     | Review per langkah, akurasi, klasifikasi, best lines, retry mistakes         | Laporan heuristik, kategori langkah, grafik evaluasi, variasi engine, latihan posisi kritis |
| [Chessify](https://chessify.me/analysis), [FAQ](https://chessify.me/faq) | Analisis engine, pengaturan komputasi, variasi dan notasi                    | Waktu pencarian dan MultiPV dapat diatur, depth dan evaluasi terlihat                       |
| [ChessTempo](https://chesstempo.com/chess-tactics/)                      | Latihan taktik, motif, opening training, endgame training                    | Tantangan pola dan latihan opening terkurasi                                                |

## Ruang lingkup versi lokal

Dipilih enam ruang yang saling terhubung: analisis, bot, opening, akademi, taktik, koleksi. Login, multiplayer, database pertandingan global, rating kompetitif, pembayaran, layanan cloud, dan penjelasan LLM tidak diperlukan untuk menjalankan versi ini.

## Engine

- [Stockfish official download](https://stockfishchess.org/download/): rilis resmi yang terverifikasi adalah 19.
- [Stockfish.js](https://github.com/nmrugg/stockfish.js): varian lite single-threaded memiliki unduhan lebih kecil, tidak membutuhkan cross-origin isolation, dan berjalan sebagai Web Worker.
- [Stockfish FAQ](https://official-stockfish.github.io/docs/stockfish-wiki/Stockfish-FAQ.html): engine memakai CPU; MultiPV yang lebih besar berbagi anggaran komputasi; engine tidak menghasilkan label blunder/brilliant secara langsung.
- [UCI documentation](https://official-stockfish.github.io/docs/stockfish-wiki/UCI-Protocol-and-Stockfish-Commands.html): komunikasi `uci`, `isready`, `position`, `go movetime`, `stop`, score, PV, dan bestmove.
- Default aplikasi: satu thread, 64 MiB hash, 800 ms, tiga variasi. Review seluruh permainan menggunakan satu variasi dan 350 ms per posisi, dengan worker terpisah yang dihentikan ketika batal atau halaman ditutup.

## Metode review

Skor cp engine dinormalisasi ke sudut putih. Mate dipetakan ke skor terminal bertanda untuk grafik dan estimasi peluang. Untuk setiap langkah, evaluasi sebelum dan sesudah dibandingkan dari sudut pemain yang melangkah.

Kurva peluang publik yang digunakan: `100 / (1 + exp(-0.00368208 * cp))`.

Penurunan peluang dibatasi minimum nol. Akurasi langkah: `clamp(103.1668 * exp(-0.04354 * loss) - 3.1668, 0, 100)`. Akurasi pemain adalah rata-rata akurasi langkah pemain itu. Metode ini terinspirasi formula publik, tanpa menyatakan kecocokan penuh dengan algoritme platform lain. Rujukan: [Lichess accuracy](https://lichess.org/page/accuracy).

Pilihan utama engine diberi label Terbaik. Untuk langkah lain, ambang penurunan peluang dalam poin persentase: <=1 Sangat baik, <=3 Baik, <=8 Kurang tepat, <=16 Kesalahan, >16 Blunder. Evaluasi cepat merupakan estimasi dan dapat berubah ketika pencarian diperpanjang.

## Desain

[ObsidianUI Dashboard Shell](https://www.obsidianui.dev/docs/dashboard-shell) dipasang dari [registry resmi](https://www.obsidianui.dev/r/dashboard-shell.json), beserta stylesheet dan dependensi Radix/Motion. Digunakan untuk shell aplikasi, navigasi, drawer mobile, fokus keyboard, dan sidebar yang bisa diubah ukurannya.

Tema khusus: material kaca buram dengan blur dan highlight, latar biru/lilac lembut, aksen biru, serta tipografi sistem bergaya Apple. Tombol memakai gradasi, bayangan inset, dan respons tekan; papan memakai bingkai bertepi bevel dan bayangan bidak untuk sentuhan skeuomorfik ringan. Warna papan walnut dan slate tersedia. Papan, grafik, lesson runner, dan komponen khusus catur ditulis untuk aplikasi ini.

## Opening book

Book Move uses a local snapshot of [lichess-org/chess-openings](https://github.com/lichess-org/chess-openings), retrieved 2026-10-21: 3,865 named lines and 8,192 position/move pairs. Data is [CC0](licenses/lichess-openings-CC0.txt). Every prefix of a named opening is indexed, including side to move, castling rights and legal en-passant availability; counters are ignored. This supports transpositions and imported FEN positions. Unlisted moves are not classified as mistakes merely because they are outside the book. Engine accuracy is unchanged.

To regenerate `src/data/opening-book.json`, download the repository's `a.tsv` through `e.tsv` into a directory and run `node scripts/prepare-opening-book.mjs <directory>`. Runtime needs no external API.

# Opening trainer: workspace dan pengulangan (23 Oktober 2026)

- [Chessreps opening catalog](https://www.chessreps.com/openings) mengorganisasi kursus menjadi banyak jalur dan menjelaskan metode pengulangan terjadwal.
- [Chessreps About](https://www.chessreps.com/about) membedakan Learn (penjelasan/petunjuk), Practice (hafalan), dan Drill (pengujian). Implementasi Kuda memakai Belajar, Latihan, serta Review terjadwal; tanpa menyalin teks kursus atau aset Chessreps.
- [Italian Game](https://www.chessreps.com/opening/italian-game) menunjukkan instruksi langkah per langkah dan cabang dari jalur yang sama. Kuda menempatkan board permanen di kiri, penjelasan/notasi dan pemilihan variasi di sidebar kanan.
- Variasi berasal dari [lichess-org/chess-openings](https://github.com/lichess-org/chess-openings), CC0. Dataset bernama ini menjadi pohon jalur latihan, bukan statistik popularitas atau jaminan kualitas langkah. Jalur duplikat dan prefix yang sudah tercakup dalam cabang lebih panjang digabungkan saat generasi.
- Pengulangan Kuda memakai interval 1, 3, 7, 14, dan 30 hari setelah hafalan bersih. Percobaan dengan kesalahan atau petunjuk tetap perlu diulang. Belajar ulang materi yang sudah dijadwalkan tidak menghapus jadwalnya.

## Audit kurikulum opening — 25 Oktober 2026

Riset ulang mencakup seluruh 12 opening di katalog, memakai panduan resmi
Chess.com, sumber Lichess yang dipatok ke revisi tertentu, dan pemeriksaan
Stockfish 19 Full. Database nama opening juga memuat jebakan serta gambit yang
buruk; legalitas dan nama ECO saja tidak cukup untuk menjadikannya materi latihan.

Generator kini memeriksa semua langkah sisi pemain, menolak jalur di luar ambang
kualitas, melengkapi respons pemain jika sumber berakhir pada langkah lawan, dan
menggabungkan posisi akhir yang sama. Kelanjutan hasil engine dibedakan dari
langkah sumber. Detail metode, referensi untuk setiap opening, hasil audit, dan
cara reproduksi ada di [OPENING_AUDIT.md](OPENING_AUDIT.md).

Penyaringan lanjutan mempertahankan satu respons pemain per posisi (termasuk
transposisi), dengan prioritas jalur pengantar lalu line yang lebih panjang.
Cabang langkah lawan tetap diperbolehkan. Batas publikasi kini lebih ketat:
skor pemain pada setiap langkah yang diaudit tidak boleh di bawah −100 cp.
Kasus Sicilian challenge 8 lama dikonfirmasi ulang pada 3 juta node: posisi
akhir memberi +126 cp untuk Putih, sedangkan kursus dimainkan sebagai Hitam.
Rincian konflik, batas evaluasi, dan jumlah akhir tercatat di audit kurikulum.
