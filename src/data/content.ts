import { DEFAULT_POSITION } from "chess.js";
export type Opening = {
  id: string;
  name: string;
  eco: string;
  side: "w" | "b";
  level: string;
  category: string;
  description: string;
  moves: string[];
  ideas: string[];
  tip: string;
};
export const OPENINGS: Opening[] = [
  {
    id: "italian",
    name: "Italian Game",
    eco: "C50",
    side: "w",
    level: "Pemula",
    category: "Terbuka",
    description:
      "Perkembangan alami, pusat yang kuat, dan tekanan ke f7. Titik awal yang nyaman untuk memahami opening.",
    moves: [
      "e4",
      "e5",
      "Nf3",
      "Nc6",
      "Bc4",
      "Bc5",
      "c3",
      "Nf6",
      "d3",
      "d6",
      "O-O",
      "O-O",
    ],
    ideas: [
      "Kuasai pusat dengan e4 dan siapkan d4.",
      "Kembangkan kuda sebelum menggerakkan menteri.",
      "Gajah di c4 mengincar petak f7.",
      "Amankan raja dengan rokade pendek.",
    ],
    tip: "Jangan buru-buru menyerang f7. Selesaikan perkembangan dan perkuat pusat dahulu.",
  },
  {
    id: "sicilian",
    name: "Sicilian Defense",
    eco: "B20",
    side: "b",
    level: "Menengah",
    category: "Semi-terbuka",
    description:
      "Jawaban asimetris terhadap 1.e4. Hitam menukar pion sayap untuk mendapatkan permainan aktif di pusat.",
    moves: ["e4", "c5", "Nf3", "d6", "d4", "cxd4", "Nxd4", "Nf6", "Nc3", "a6"],
    ideas: [
      "c5 mengontrol d4 dari sisi sayap.",
      "Tukar pion c untuk membuka lajur c.",
      "Kembangkan kuda ke f6 untuk menekan e4.",
      "a6 pada Najdorf membatasi lompatan ke b5.",
    ],
    tip: "Dalam posisi tajam, perhatikan keselamatan raja sebelum memulai serangan sayap.",
  },
  {
    id: "queens-gambit",
    name: "Queen’s Gambit",
    eco: "D30",
    side: "w",
    level: "Pemula",
    category: "Tertutup",
    description:
      "Tawarkan pion c untuk menantang pusat hitam dan membangun keunggulan ruang.",
    moves: [
      "d4",
      "d5",
      "c4",
      "e6",
      "Nc3",
      "Nf6",
      "Bg5",
      "Be7",
      "e3",
      "O-O",
      "Nf3",
      "Nbd7",
    ],
    ideas: [
      "Bangun pusat dengan d4.",
      "c4 menantang pion d5.",
      "Pertahankan tekanan sambil mengembangkan buah.",
      "e3 membuka jalur bagi gajah f1.",
    ],
    tip: "Utamakan perkembangan. Tidak perlu mempertahankan setiap pion dengan mengorbankan tempo.",
  },
  {
    id: "london",
    name: "London System",
    eco: "D02",
    side: "w",
    level: "Pemula",
    category: "Tertutup",
    description:
      "Sistem yang mudah dipelajari dengan gajah aktif di f4 dan struktur pion yang kokoh.",
    moves: [
      "d4",
      "d5",
      "Nf3",
      "Nf6",
      "Bf4",
      "e6",
      "e3",
      "Bd6",
      "Bg3",
      "O-O",
      "Bd3",
      "c5",
    ],
    ideas: [
      "Keluarkan gajah c1 sebelum memainkan e3.",
      "Pertahankan struktur pion d4–e3.",
      "Kembangkan kuda ke f3 dan d2.",
      "Perhatikan tekanan hitam melalui c5.",
    ],
    tip: "London tetap membutuhkan respons terhadap lawan. Hindari memainkan urutan hafalan tanpa memeriksa ancaman.",
  },
  {
    id: "ruy-lopez",
    name: "Ruy López",
    eco: "C60",
    side: "w",
    level: "Menengah",
    category: "Terbuka",
    description:
      "Opening klasik yang menekan pertahanan pion e5 dan mengarah ke pertarungan strategis.",
    moves: [
      "e4",
      "e5",
      "Nf3",
      "Nc6",
      "Bb5",
      "a6",
      "Ba4",
      "Nf6",
      "O-O",
      "Be7",
      "Re1",
      "b5",
      "Bb3",
      "d6",
    ],
    ideas: [
      "Bb5 memberi tekanan pada kuda penjaga e5.",
      "Jaga gajah dengan mundur ke a4 dan b3.",
      "Rokade sebelum membuka pusat.",
      "Re1 memperkuat e4 dan menyiapkan permainan pusat.",
    ],
    tip: "Mengambil e5 terlalu awal bisa dibalas oleh taktik terhadap pion e4.",
  },
  {
    id: "caro-kann",
    name: "Caro–Kann Defense",
    eco: "B12",
    side: "b",
    level: "Pemula",
    category: "Semi-terbuka",
    description:
      "Pertahanan solid dengan c6 dan d5. Pelajari cara mengembangkan gajah sebelum menutup strukturnya.",
    moves: ["e4", "c6", "d4", "d5", "e5", "Bf5", "Nf3", "e6", "Be2", "c5"],
    ideas: [
      "c6 mendukung dorongan d5.",
      "Tantang pusat putih pada langkah kedua.",
      "Kembangkan gajah ke f5 sebelum e6.",
      "Gunakan c5 untuk menyerang basis rantai pion.",
    ],
    tip: "Ruang hitam lebih sempit, sehingga pertukaran buah yang tepat dapat membantu.",
  },
  {
    id: "french",
    name: "French Defense",
    eco: "C02",
    side: "b",
    level: "Menengah",
    category: "Semi-terbuka",
    description:
      "Rantai pion yang kuat, serangan balik di sayap menteri, dan pertarungan atas pusat putih.",
    moves: ["e4", "e6", "d4", "d5", "e5", "c5", "c3", "Nc6", "Nf3", "Qb6"],
    ideas: [
      "e6 menyiapkan d5.",
      "c5 menyerang basis rantai pion d4.",
      "Kuda c6 menambah tekanan ke d4.",
      "Qb6 menekan b2 dan d4.",
    ],
    tip: "Cari cara mengaktifkan gajah c8; jangan membiarkannya terkurung sepanjang permainan.",
  },
  {
    id: "kings-indian",
    name: "King’s Indian Defense",
    eco: "E60",
    side: "b",
    level: "Lanjutan",
    category: "Indian",
    description:
      "Biarkan putih membangun pusat lalu tantang dengan buah aktif dan terobosan pion.",
    moves: [
      "d4",
      "Nf6",
      "c4",
      "g6",
      "Nc3",
      "Bg7",
      "e4",
      "d6",
      "Nf3",
      "O-O",
      "Be2",
      "e5",
    ],
    ideas: [
      "Nf6 mengontrol e4.",
      "Fianchetto gajah ke g7.",
      "Rokade untuk mengamankan raja.",
      "e5 menantang pusat putih.",
    ],
    tip: "Pusat besar putih bukan kelemahan dengan sendirinya. Pilih momen terobosan dengan cermat.",
  },
  {
    id: "scandinavian",
    name: "Scandinavian Defense",
    eco: "B01",
    side: "b",
    level: "Pemula",
    category: "Semi-terbuka",
    description:
      "Langsung tantang e4 dengan d5 dan pelajari keseimbangan antara aktivitas menteri dan tempo.",
    moves: ["e4", "d5", "exd5", "Qxd5", "Nc3", "Qa5", "d4", "Nf6", "Nf3", "c6"],
    ideas: [
      "d5 langsung menantang pusat.",
      "Menteri mengambil kembali pion d5.",
      "Hindari kehilangan terlalu banyak tempo dengan menteri.",
      "Kembangkan buah kecil sesegera mungkin.",
    ],
    tip: "Setelah Qa5, amati serangan terhadap menteri dan diagonal a5–e1.",
  },
  {
    id: "scotch",
    name: "Scotch Game",
    eco: "C45",
    side: "w",
    level: "Pemula",
    category: "Terbuka",
    description:
      "Buka pusat lebih awal dan bangun permainan aktif dengan perkembangan cepat.",
    moves: [
      "e4",
      "e5",
      "Nf3",
      "Nc6",
      "d4",
      "exd4",
      "Nxd4",
      "Bc5",
      "Be3",
      "Qf6",
    ],
    ideas: [
      "d4 membuka pusat saat kedua raja masih di tengah.",
      "Ambil kembali dengan kuda.",
      "Kembangkan buah dengan ancaman.",
      "Pertimbangkan keselamatan raja ketika lajur terbuka.",
    ],
    tip: "Dalam pusat terbuka, satu tempo perkembangan sering lebih berharga daripada langkah pion tambahan.",
  },
  {
    id: "petrov",
    name: "Petrov Defense",
    eco: "C42",
    side: "b",
    level: "Menengah",
    category: "Terbuka",
    description:
      "Pertahanan simetris yang mengajarkan permainan pusat dan ketelitian taktis.",
    moves: ["e4", "e5", "Nf3", "Nf6", "Nxe5", "d6", "Nf3", "Nxe4", "d4", "d5"],
    ideas: [
      "Lawan serangan ke e5 dengan tekanan ke e4.",
      "Usir kuda putih dengan d6 sebelum mengambil e4.",
      "Kembangkan buah sambil mempertahankan pusat.",
      "Periksa taktik pada lajur e.",
    ],
    tip: "Urutan langkah penting: mengambil e4 terlalu cepat dapat mengundang taktik.",
  },
  {
    id: "english",
    name: "English Opening",
    eco: "A20",
    side: "w",
    level: "Menengah",
    category: "Sayap",
    description:
      "Kontrol d5 dari sayap dan pertahankan fleksibilitas struktur pusat.",
    moves: ["c4", "e5", "Nc3", "Nf6", "g3", "d5", "cxd5", "Nxd5", "Bg2", "Nb6"],
    ideas: [
      "c4 menekan d5 tanpa langsung memainkan pion d.",
      "Nc3 memperkuat kontrol pusat.",
      "Fianchetto ke g2 mengaktifkan diagonal panjang.",
      "Pilih struktur pusat sesuai langkah hitam.",
    ],
    tip: "Opening ini fleksibel dan dapat bertransposisi. Pahami struktur, bukan sekadar urutan.",
  },
];

export type Exercise = {
  id: string;
  title: string;
  category: string;
  level: string;
  minutes: number;
  description: string;
  fen: string;
  solution: string[];
  hint: string;
  explanation: string;
  theory: string[];
};
export const LESSONS: Exercise[] = [
  {
    id: "center",
    title: "Ambil kendali pusat",
    category: "Dasar",
    level: "Pemula",
    minutes: 3,
    description: "Empat petak kecil, pengaruh yang besar.",
    fen: DEFAULT_POSITION,
    solution: ["e4", "e5", "Nf3", "Nc6", "d4"],
    hint: "Mulai dengan pion raja dua petak, lalu kembangkan kuda raja.",
    explanation:
      "e4 dan d4 merebut ruang pusat. Kuda f3 berkembang dengan tempo karena menyerang e5.",
    theory: [
      "Petak e4, d4, e5, dan d5 adalah pusat papan.",
      "Buah yang menguasai pusat memiliki lebih banyak pilihan.",
      "Latih urutan e4, Nf3, lalu d4. Hitam menjawab otomatis.",
    ],
  },
  {
    id: "development",
    title: "Kembangkan buahmu",
    category: "Dasar",
    level: "Pemula",
    minutes: 4,
    description: "Bawa kuda dan gajah ke permainan.",
    fen: DEFAULT_POSITION,
    solution: ["e4", "e5", "Nf3", "Nc6", "Bc4"],
    hint: "Mainkan e4, kuda ke f3, lalu gajah ke c4.",
    explanation:
      "Perkembangan aktif menghubungkan buah dengan pusat dan menyiapkan raja untuk rokade.",
    theory: [
      "Gerakkan buah kecil di opening: kuda dan gajah.",
      "Hindari menggerakkan buah yang sama berulang kali tanpa alasan.",
      "Setelah e4 dan Nf3, aktifkan gajah ke c4.",
    ],
  },
  {
    id: "castling",
    title: "Raja yang aman",
    category: "Dasar",
    level: "Pemula",
    minutes: 3,
    description: "Pelajari kapan dan bagaimana melakukan rokade.",
    fen: "r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4",
    solution: ["O-O"],
    hint: "Klik raja e1, lalu petak g1.",
    explanation:
      "Rokade memindahkan raja ke g1 dan benteng ke f1 dalam satu langkah. Raja tidak boleh melewati petak yang diserang.",
    theory: [
      "Raja dan benteng belum pernah bergerak.",
      "Tidak ada buah di antara keduanya.",
      "Raja tidak sedang skak dan tidak melewati atau mendarat di petak yang diserang.",
    ],
  },
  {
    id: "fork",
    title: "Satu kuda, dua ancaman",
    category: "Taktik",
    level: "Pemula",
    minutes: 4,
    description: "Gunakan fork untuk mendapatkan material.",
    fen: "r3k3/8/8/1N6/8/8/8/4K3 w - - 0 1",
    solution: ["Nc7+"],
    hint: "Kuda b5 dapat memberi skak sekaligus menyerang benteng a8.",
    explanation:
      "Nc7+ menyerang raja e8 dan benteng a8 sekaligus. Hitam harus menjawab skak terlebih dahulu.",
    theory: [
      "Fork adalah satu buah yang menyerang dua atau lebih sasaran.",
      "Fork dengan skak sangat kuat karena raja harus segera diselamatkan.",
      "Cari petak yang menjangkau raja dan buah bernilai tinggi.",
    ],
  },
  {
    id: "pin",
    title: "Kekuatan pin",
    category: "Taktik",
    level: "Pemula",
    minutes: 4,
    description: "Batasi gerakan buah yang menjaga rajanya.",
    fen: "4k3/4n3/8/8/8/8/8/4R1K1 w - - 0 1",
    solution: ["Re2"],
    hint: "Benteng e1 tetap di lajur e. Majukan satu petak.",
    explanation:
      "Kuda e7 terikat pada raja e8. Kuda tidak boleh bergerak meninggalkan lajur e karena akan membuka skak.",
    theory: [
      "Absolute pin mengikat buah pada raja.",
      "Buah yang terikat mutlak tidak boleh bergerak jika rajanya menjadi skak.",
      "Tambahkan tekanan pada buah terikat dengan aman.",
    ],
  },
  {
    id: "backrank",
    title: "Skakmat baris belakang",
    category: "Skakmat",
    level: "Pemula",
    minutes: 3,
    description: "Kenali raja yang terkurung pionnya sendiri.",
    fen: "6k1/5ppp/8/8/8/8/8/4R1K1 w - - 0 1",
    solution: ["Re8#"],
    hint: "Benteng e1 dapat naik langsung ke baris kedelapan.",
    explanation:
      "Re8# memberi skak pada raja g8. Pion f7, g7, dan h7 menutup semua petak pelariannya.",
    theory: [
      "Raja di baris belakang sering terkurung pionnya sendiri.",
      "Benteng dan menteri bisa memanfaatkan lajur terbuka.",
      "Berikan petak pelarian kepada raja bila pertahanan membutuhkannya.",
    ],
  },
  {
    id: "promotion",
    title: "Pion menjadi pahlawan",
    category: "Endgame",
    level: "Pemula",
    minutes: 3,
    description: "Promosikan pion menjadi buah pilihanmu.",
    fen: "7k/P7/8/8/8/8/8/4K3 w - - 0 1",
    solution: ["a8=Q+"],
    hint: "Dorong pion a7 ke a8 dan pilih menteri.",
    explanation:
      "Pion yang mencapai baris terakhir wajib dipromosikan menjadi menteri, benteng, gajah, atau kuda.",
    theory: [
      "Pion putih berpromosi di baris 8; pion hitam di baris 1.",
      "Menteri biasanya pilihan paling kuat.",
      "Kadang promosi kuda atau benteng diperlukan untuk taktik atau menghindari stalemate.",
    ],
  },
  {
    id: "en-passant",
    title: "Tangkap sambil lewat",
    category: "Aturan khusus",
    level: "Menengah",
    minutes: 4,
    description: "Pahami aturan en passant dengan praktik.",
    fen: "4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 2",
    solution: ["exd6"],
    hint: "Pion e5 dapat mengambil pion d5 dengan melangkah ke d6.",
    explanation:
      "En passant hanya tersedia tepat setelah pion lawan maju dua petak dan mendarat di samping pionmu.",
    theory: [
      "Kesempatan en passant harus diambil pada giliran berikutnya.",
      "Pionmu bergerak diagonal ke petak yang dilewati pion lawan.",
      "Aturan ini tidak berlaku untuk buah selain pion.",
    ],
  },
  {
    id: "opera",
    title: "Seni pengorbanan Morphy",
    category: "Taktik",
    level: "Lanjutan",
    minutes: 6,
    description: "Temukan kombinasi penutup Opera Game.",
    fen: "4kb1r/p2n1ppp/4q3/4p1B1/4P3/1Q6/PPP2PPP/2KR4 w k - 0 16",
    solution: ["Qb8+", "Nxb8", "Rd8#"],
    hint: "Korbankan menteri di b8 agar kuda meninggalkan d7.",
    explanation:
      "Qb8+ memaksa Nxb8, lalu Rd8#. Semua buah aktif putih bekerja bersama untuk menutup petak raja.",
    theory: [
      "Kombinasi memaksa dimulai dengan skak, tangkapan, atau ancaman langsung.",
      "Pengorbanan bernilai bila menghasilkan skakmat paksa.",
      "Perhatikan koordinasi gajah g5 dan benteng d1.",
    ],
  },
];
export const PUZZLES: Exercise[] = [
  {
    ...LESSONS[5],
    id: "p-backrank",
    title: "Jalan terakhir",
    category: "Skakmat 1 langkah",
    level: "Mudah",
  },
  {
    ...LESSONS[3],
    id: "p-fork",
    title: "Dua sasaran sekaligus",
    category: "Fork kuda",
    level: "Mudah",
  },
  {
    ...LESSONS[8],
    id: "p-opera",
    title: "Menteri yang rela pergi",
    category: "Skakmat 2 langkah",
    level: "Sulit",
  },
  {
    id: "p-queenmate",
    title: "Raja tanpa jalan pulang",
    category: "Skakmat 1 langkah",
    level: "Mudah",
    minutes: 2,
    description: "Putih melangkah. Temukan skakmat.",
    fen: "7k/5K2/6Q1/8/8/8/8/8 w - - 0 1",
    solution: ["Qg7#"],
    hint: "Menteri menuju g7, dilindungi raja f7.",
    explanation:
      "Menteri g7 memberi skak, menguasai semua petak pelarian, dan dilindungi raja f7.",
    theory: ["Gunakan kerja sama raja dan menteri untuk menutup semua petak."],
  },
  {
    id: "p-blackmate",
    title: "Giliran hitam bersinar",
    category: "Skakmat 1 langkah",
    level: "Mudah",
    minutes: 2,
    description: "Hitam melangkah. Manfaatkan baris pertama.",
    fen: "4r1k1/8/8/8/8/8/5PPP/6K1 b - - 0 1",
    solution: ["Re1#"],
    hint: "Benteng e8 turun ke baris pertama.",
    explanation:
      "Re1# memanfaatkan raja putih yang terkurung pion f2, g2, dan h2.",
    theory: ["Pola baris belakang berlaku untuk kedua warna."],
  },
  {
    id: "p-smother",
    title: "Raja yang terhimpit",
    category: "Smothered mate",
    level: "Menengah",
    minutes: 3,
    description:
      "Kuda adalah satu-satunya buah yang dapat melompati pertahanan.",
    fen: "6rk/6pp/8/6N1/8/8/8/4K3 w - - 0 1",
    solution: ["Nf7#"],
    hint: "Kuda g5 dapat melompat ke f7 dan menyerang h8.",
    explanation:
      "Kuda memberi skak pada raja yang semua petak sekitarnya dipenuhi buah sendiri.",
    theory: [
      "Smothered mate terjadi saat raja terkurung buah sendiri dan diskak kuda.",
    ],
  },
];
