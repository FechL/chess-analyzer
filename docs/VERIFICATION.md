# Pemeriksaan versi lokal

Tanggal: 20 Oktober 2026.

## Otomatis

- `npm test`: **41 tes lulus** dalam dua berkas.
- `npm run build`: pemeriksaan TypeScript dan build produksi berhasil.
- Test aturan/format: PGN round-trip, FEN dengan giliran hitam, langkah ilegal, en passant, promosi, normalisasi skor UCI, variasi SAN, dan klasifikasi dua warna.
- Test konten: seluruh 12 jalur opening, sembilan pelajaran, dan enam puzzle dapat dimainkan secara legal; posisi latihan Morphy cocok dengan permainan historis.
- Test lifecycle engine: handshake, beberapa PV, antrean pencarian, stop, penghentian worker, loading timeout, dan posisi terminal.

## Browser

Diuji pada browser Chromium di localhost, lebar desktop 1280 dan ponsel 390 piksel.

| Alur | Hasil |
|---|---|
| Muat engine lokal dan buka tab Engine | Evaluasi, depth, dan variasi Stockfish tampil |
| Review Opera Game | Seluruh 33 ply selesai; kedua akurasi, kategori langkah, grafik, dan momen penting terisi |
| Latih ulang kesalahan Nf6 | Langkah alternatif Qd7 dari hasil engine diterima |
| Italian Game | Langkah putih diterima; hitam membalas otomatis; rokade kedua sisi dan status selesai bekerja |
| Tutorial rokade | Raja e1–g1 dan benteng dipindahkan; progres naik dan muncul di sidebar |
| Puzzle baris belakang | Re8# diterima dan progres tantangan bertambah |
| Lawan bot | e4 dibalas engine dengan langkah legal; petunjuk dapat diminta |
| Simpan dan buka koleksi | Opera Game tersimpan; dapat dibuka kembali dengan ulasan terakhir |
| PGN ilegal | Ditolak dengan pesan validasi |
| FEN dan underpromotion | Posisi pion a7 diimpor, a8=N dipilih, remis material dikenali |
| Ponsel | Drawer navigasi, papan, panel analisis, dan kontrol mengikuti lebar layar |
| Build produksi di port 4173 | Engine menghasilkan evaluasi dan variasi; tidak ada error/warning browser pada pemeriksaan |

Nilai evaluasi dan akurasi dapat berubah sesuai waktu pencarian, perangkat, dan hasil pencarian engine. Tidak digunakan sebagai snapshot numerik yang harus persis sama.
