type LocalizedText = { id: string; en: string };
type OpeningOverview = {
  moves: string;
  basics: LocalizedText;
  history: LocalizedText;
  whitePlan: LocalizedText;
  blackPlan: LocalizedText;
  branches: string[];
  caution: LocalizedText;
  chesscom: string;
  wikipedia: string;
};

// Original bilingual summaries; each entry links its strategy/history references.
// Opening names and training lines use lichess-org/chess-openings (CC0).
export const OPENING_OVERVIEWS: Record<string, OpeningOverview> = {
  italian: {
    moves: "1.e4 e5 2.Nf3 Nc6 3.Bc4",
    basics: {
      id: "Italian Game mengembangkan kuda dan gajah dengan cepat. Gajah c4 mengarah ke f7, sementara putih menyiapkan rokade dan menentukan kapan pusat dibuka dengan d4. Permainannya bisa tenang maupun taktis.",
      en: "The Italian develops a knight and bishop quickly. The c4-bishop eyes f7 while White prepares to castle and decides when to open the center with d4. Positions can be quiet or tactical.",
    },
    history: {
      id: "Opening ini dipelajari sejak abad ke-16 oleh penulis seperti Damiano dan Polerio, kemudian Greco. Giuoco Piano tetap menjadi bagian dari permainan tingkat tinggi setelah berabad-abad perkembangannya.",
      en: "Writers including Damiano and Polerio studied this opening in the 16th century, followed by Greco. Centuries of development have kept the Giuoco Piano part of high-level play.",
    },
    whitePlan: {
      id: "Kembangkan buah, rokade, lalu gunakan c3 untuk mendukung d4. Dengan d3, putih dapat memperbaiki posisi buah sebelum membuka pusat.",
      en: "Develop, castle, and use c3 to support d4. With d3, White can improve the pieces before opening the center.",
    },
    blackPlan: {
      id: "Jawab perkembangan dengan ...Bc5 atau ...Nf6. Siapkan ...d5 pada saat yang tepat dan perhatikan taktik di sekitar f7.",
      en: "Develop with ...Bc5 or ...Nf6. Prepare a timely ...d5 break and watch tactical threats around f7.",
    },
    branches: [
      "Giuoco Piano",
      "Giuoco Pianissimo",
      "Two Knights Defense",
      "Evans Gambit",
    ],
    caution: {
      id: "Serangan ke f7 perlu perhitungan konkret. Menggerakkan gajah atau menteri berulang kali dapat menghambat perkembangan.",
      en: "Attacking f7 requires concrete calculation. Repeated bishop or queen moves can leave development behind.",
    },
    chesscom: "Italian-Game",
    wikipedia: "Italian_Game",
  },
  sicilian: {
    moves: "1.e4 c5",
    basics: {
      id: "Sicilian melawan pusat putih dari sayap dengan ...c5. Pada Open Sicilian, pertukaran ...cxd4 memberi hitam lajur c setengah terbuka, sementara putih memperoleh ruang dan perkembangan aktif.",
      en: "The Sicilian challenges White's center from the flank with ...c5. In the Open Sicilian, ...cxd4 gives Black a semi-open c-file while White gains space and active development.",
    },
    history: {
      id: "Polerio mencatatnya pada 1594. Pertandingan La Bourdonnais–McDonnell pada 1834 membantu memperkenalkannya, dan Fischer serta Kasparov kemudian memperkuat reputasinya sebagai pilihan bertarung melawan 1.e4.",
      en: "Polerio recorded it in 1594. The 1834 La Bourdonnais–McDonnell matches helped publicize it, and Fischer and Kasparov later strengthened its reputation as a fighting answer to 1.e4.",
    },
    whitePlan: {
      id: "Gunakan keunggulan perkembangan untuk menekan pusat. Serangan sayap raja bergantung pada struktur dan letak kedua raja.",
      en: "Use the development lead to pressure the center. Kingside attacks depend on the structure and both kings' locations.",
    },
    blackPlan: {
      id: "Aktifkan buah di lajur c dan cari terobosan ...d5 atau ...b5 sesuai variasinya. Jangan mengabaikan keselamatan raja.",
      en: "Activate pieces on the c-file and seek ...d5 or ...b5 as the variation allows. Keep the king safe.",
    },
    branches: [
      "Najdorf",
      "Dragon",
      "Classical",
      "Sveshnikov",
      "Alapin",
      "Closed Sicilian",
    ],
    caution: {
      id: "Urutan langkah antarcabang tidak selalu dapat ditukar. Hafalkan alasan di balik terobosan pion sebelum melakukan serangan sayap.",
      en: "Move orders from different branches are not interchangeable. Understand the pawn breaks before launching flank attacks.",
    },
    chesscom: "Sicilian-Defense",
    wikipedia: "Sicilian_Defence",
  },
  "queens-gambit": {
    moves: "1.d4 d5 2.c4",
    basics: {
      id: "Putih menawarkan pion c4 untuk menantang pion pusat d5. Jika diterima, putih biasanya bisa merebut kembali pion sambil berkembang; prioritasnya kontrol pusat, bukan sekadar menang material.",
      en: "White offers the c4-pawn to challenge d5. If Black accepts, White can usually regain the pawn while developing; central control matters more than immediately recovering material.",
    },
    history: {
      id: "Queen’s Gambit sudah dikenal selama berabad-abad dan semakin penting bersama berkembangnya catur posisional pada akhir abad ke-19. Duel kejuaraan dunia Alekhine–Capablanca tahun 1927 banyak menampilkan opening ini.",
      en: "Known for centuries, the Queen's Gambit gained importance with positional chess in the late 19th century. It featured heavily in the 1927 Alekhine–Capablanca world championship match.",
    },
    whitePlan: {
      id: "Tambah tekanan pada d5, kembangkan buah, lalu pilih antara e4, pertukaran di d5, atau permainan sayap sesuai struktur.",
      en: "Pressure d5, develop, and choose between e4, exchanging on d5, or flank play according to the structure.",
    },
    blackPlan: {
      id: "Pertahankan d5 dengan ...e6 atau ...c6, atau terima dengan ...dxc4. Siapkan serangan balik pusat, sering melalui ...c5.",
      en: "Support d5 with ...e6 or ...c6, or accept with ...dxc4. Prepare central counterplay, often through ...c5.",
    },
    branches: [
      "Queen’s Gambit Declined",
      "Queen’s Gambit Accepted",
      "Slav Defense",
      "Albin Countergambit",
    ],
    caution: {
      id: "Struktur yang berbeda membutuhkan rencana berbeda. Jangan memaksakan serangan minoritas atau e4 di setiap posisi.",
      en: "Different structures need different plans. Neither a minority attack nor an e4 break fits every position.",
    },
    chesscom: "Queens-Gambit",
    wikipedia: "Queen%27s_Gambit",
  },
  london: {
    moves: "1.d4 d5 2.Nf3 Nf6 3.Bf4",
    basics: {
      id: "London adalah sistem perkembangan dengan d4 dan Bf4 sebelum e3. Struktur c3–d4–e3 sering menopang pusat, tetapi urutan langkah perlu disesuaikan dengan respons hitam.",
      en: "The London is a development system using d4 and Bf4 before e3. A c3–d4–e3 structure often supports the center, but the move order must respond to Black's play.",
    },
    history: {
      id: "Ide Bf4 sudah lama dikenal. Nama dan popularitas sistem ini berkaitan dengan turnamen London 1922; pemakai modern seperti Kamsky dan Carlsen juga memperlihatkan potensi serangannya.",
      en: "The Bf4 idea has a long history. The system's name and popularity are linked to London 1922; modern practitioners such as Kamsky and Carlsen have also demonstrated its attacking potential.",
    },
    whitePlan: {
      id: "Kembangkan kuda, amankan raja, lalu pertimbangkan Ne5 atau e4 jika persiapannya cukup. Gajah dapat mundur ke g3 saat diserang.",
      en: "Develop the knights, secure the king, and consider Ne5 or a prepared e4. The bishop can retreat to g3 when attacked.",
    },
    blackPlan: {
      id: "Tantang d4 dengan ...c5 dan cari tekanan pada b2. Dengan fianchetto ...g6, perebutan petak tengah bisa berbeda.",
      en: "Challenge d4 with ...c5 and look for pressure on b2. A ...g6 fianchetto changes the central battle.",
    },
    branches: [
      "Classical London",
      "Accelerated London",
      "Jobava London",
      "Indian setup (...g6)",
    ],
    caution: {
      id: "Jangan memainkan susunan otomatis. Ancaman ...Qb6 dan perubahan pusat dapat menuntut respons sebelum menyelesaikan setup.",
      en: "Avoid an automatic setup. Threats such as ...Qb6 and changes in the center may demand an immediate response.",
    },
    chesscom: "London-System",
    wikipedia: "London_System",
  },
  "ruy-lopez": {
    moves: "1.e4 e5 2.Nf3 Nc6 3.Bb5",
    basics: {
      id: "Ruy López memberi tekanan pada kuda c6, penjaga pion e5. Putih menyiapkan rokade dan perebutan pusat jangka panjang; pertukaran di c6 tidak selalu diikuti kemenangan pion e5.",
      en: "The Ruy López pressures the c6-knight that defends e5. White prepares to castle and contest the center over time; exchanging on c6 does not automatically win the e5-pawn.",
    },
    history: {
      id: "Namanya menghormati Ruy López de Segura, yang menganalisisnya dalam buku tahun 1561. Opening Spanyol ini menjadi pilar teori dan pertandingan tingkat tinggi sejak abad ke-19.",
      en: "It honors Ruy López de Segura, who analyzed it in his 1561 book. The Spanish Opening has been a pillar of theory and high-level competition since the 19th century.",
    },
    whitePlan: {
      id: "Pertahankan gajah bila sesuai, perkuat e4 dengan Re1, lalu siapkan c3 dan d4. Pada struktur tertutup, manuver kuda sama pentingnya.",
      en: "Preserve the bishop when useful, support e4 with Re1, and prepare c3 and d4. Knight maneuvers also matter in closed structures.",
    },
    blackPlan: {
      id: "Kembangkan buah dan cari ...d5 atau tekanan pada e4. ...a6 dan ...b5 memberi ruang tetapi juga menciptakan sasaran pion.",
      en: "Develop and seek ...d5 or pressure on e4. ...a6 and ...b5 gain space but also create pawn targets.",
    },
    branches: [
      "Closed Spanish",
      "Berlin Defense",
      "Exchange Variation",
      "Open Spanish",
      "Marshall Attack",
    ],
    caution: {
      id: "Periksa taktik terhadap e4 sebelum mengambil e5. Perubahan struktur setelah Bxc6 perlu dinilai, bukan dilakukan otomatis.",
      en: "Check tactics against e4 before taking e5. Evaluate the structural consequences of Bxc6 instead of exchanging automatically.",
    },
    chesscom: "Ruy-Lopez-Opening",
    wikipedia: "Ruy_Lopez",
  },
  "caro-kann": {
    moves: "1.e4 c6 2.d4 d5",
    basics: {
      id: "Caro–Kann menyiapkan ...d5 dengan pion c6. Hitam mendapat struktur kokoh dan sering mengembangkan gajah c8 sebelum ...e6, dengan konsekuensi ruang yang lebih sempit.",
      en: "The Caro–Kann prepares ...d5 with c6. Black obtains a sturdy structure and can often develop the c8-bishop before ...e6, at the cost of less space.",
    },
    history: {
      id: "Namanya berasal dari Horatio Caro dan Marcus Kann, yang menganalisisnya pada abad ke-19. Capablanca, Botvinnik, dan Karpov kemudian menjadi bagian penting dari sejarah perkembangannya.",
      en: "It is named after Horatio Caro and Marcus Kann, who analyzed it in the 19th century. Capablanca, Botvinnik, and Karpov later played important roles in its development.",
    },
    whitePlan: {
      id: "Pilih antara mempertahankan ruang dengan e5, menukar di d5, atau mengembangkan kuda. Gunakan ruang untuk mengaktifkan buah.",
      en: "Choose between gaining space with e5, exchanging on d5, or developing a knight. Use the extra room to activate the pieces.",
    },
    blackPlan: {
      id: "Aktifkan gajah c8 bila memungkinkan dan serang pusat melalui ...c5 atau ...e5 sesuai struktur, bukan hanya bertahan.",
      en: "Activate the c8-bishop when possible and challenge the center with ...c5 or ...e5 as the structure allows.",
    },
    branches: [
      "Advance",
      "Classical",
      "Exchange",
      "Panov–Botvinnik Attack",
      "Fantasy",
    ],
    caution: {
      id: "Solid tidak berarti pasif. Periksa serangan terhadap gajah yang keluar dan jangan terlambat melakukan terobosan pusat.",
      en: "Solid does not mean passive. Watch attacks on the developed bishop and avoid delaying central counterplay too long.",
    },
    chesscom: "Caro-Kann-Defense",
    wikipedia: "Caro%E2%80%93Kann_Defence",
  },
  french: {
    moves: "1.e4 e6 2.d4 d5",
    basics: {
      id: "French Defense menantang pusat dengan ...e6 dan ...d5. Setelah e5, rantai pion sering mengarahkan putih ke sayap raja dan hitam ke tekanan terhadap d4.",
      en: "The French challenges the center with ...e6 and ...d5. After e5, the pawn chains often point White toward the kingside and Black toward pressure against d4.",
    },
    history: {
      id: "Nama French berasal dari permainan korespondensi klub London melawan Paris pada 1834. Pemain seperti Nimzowitsch, Botvinnik, Korchnoi, dan Uhlmann mengembangkan banyak ide dalam pertahanan ini.",
      en: "Its name comes from an 1834 correspondence game between the London and Paris clubs. Nimzowitsch, Botvinnik, Korchnoi, and Uhlmann developed many of its ideas.",
    },
    whitePlan: {
      id: "Gunakan ruang untuk perkembangan dan serangan, sambil menjaga basis rantai pion d4. Pilihan Nc3 dan Nd2 menimbulkan struktur berbeda.",
      en: "Use space to develop and attack while protecting the pawn chain's base on d4. Nc3 and Nd2 lead to different structures.",
    },
    blackPlan: {
      id: "Serang d4 dengan ...c5, lalu pertimbangkan ...f6 untuk menantang e5. Carilah jalur aktif bagi gajah c8.",
      en: "Attack d4 with ...c5 and consider ...f6 to challenge e5. Find an active route for the c8-bishop.",
    },
    branches: ["Advance", "Exchange", "Winawer", "Tarrasch", "Classical"],
    caution: {
      id: "Jangan membiarkan gajah c8 dan buah lain pasif terlalu lama. Terobosan pion harus didukung perkembangan dan keamanan raja.",
      en: "Do not leave the c8-bishop and other pieces passive indefinitely. Support pawn breaks with development and king safety.",
    },
    chesscom: "French-Defense",
    wikipedia: "French_Defence",
  },
  "kings-indian": {
    moves: "1.d4 Nf6 2.c4 g6 3.Nc3 Bg7 4.e4 d6",
    basics: {
      id: "King’s Indian menggunakan pendekatan hipermodern: hitam membiarkan pusat pion putih terbentuk, lalu menantangnya dengan buah dan terobosan pion. Gajah fianchetto di g7 menjadi ciri utamanya.",
      en: "The King's Indian takes a hypermodern approach: Black allows White a pawn center and then challenges it with pieces and pawn breaks. A fianchettoed bishop on g7 is a defining feature.",
    },
    history: {
      id: "Pertahanan ini mendapatkan pengakuan seiring berkembangnya gagasan hipermodern. Keberhasilan Bronstein membantu mengukuhkan reputasinya, dan Fischer serta Kasparov menjadi pemakai terkenal berikutnya.",
      en: "The defense gained acceptance alongside hypermodern ideas. Bronstein's successes helped establish its reputation, and Fischer and Kasparov became prominent later practitioners.",
    },
    whitePlan: {
      id: "Manfaatkan ruang untuk berkembang. Setelah pusat tertutup, putih sering mencari permainan sayap menteri, tetapi harus mengawasi serangan ke rajanya.",
      en: "Use the extra space to develop. With a closed center, White often seeks queenside play while monitoring attacks on the king.",
    },
    blackPlan: {
      id: "Amankan raja, lalu tentukan antara ...e5 dan ...c5. Dorongan ...f5 lazim pada struktur pusat tertutup, bukan untuk setiap posisi.",
      en: "Secure the king and choose between ...e5 and ...c5. ...f5 is thematic in closed-center structures, not in every position.",
    },
    branches: [
      "Classical",
      "Sämisch",
      "Fianchetto",
      "Four Pawns Attack",
      "Averbakh",
    ],
    caution: {
      id: "Ruang putih tidak akan runtuh sendiri. Serangan sayap tanpa terobosan dan koordinasi buah dapat membiarkan hitam terjepit.",
      en: "White's center will not collapse by itself. Flank attacks without coordinated pieces and timely breaks can leave Black cramped.",
    },
    chesscom: "Kings-Indian-Defense",
    wikipedia: "King%27s_Indian_Defence",
  },
  scandinavian: {
    moves: "1.e4 d5",
    basics: {
      id: "Scandinavian langsung menantang pion e4. Setelah exd5, hitam memilih mengambil dengan menteri atau menyiapkan perebutan kembali melalui ...Nf6; persoalan utamanya adalah tempo perkembangan.",
      en: "The Scandinavian challenges e4 immediately. After exd5, Black can recapture with the queen or prepare to regain the pawn with ...Nf6; development tempi are a central concern.",
    },
    history: {
      id: "Pertahanan ini termasuk opening tertua yang tercatat, dahulu juga disebut Center Counter. Pada 1995, Anand menggunakannya melawan Kasparov dalam pertandingan kejuaraan dunia.",
      en: "Among the oldest recorded openings, it was also known as the Center Counter. Anand used it against Kasparov in their 1995 world championship match.",
    },
    whitePlan: {
      id: "Ambil di d5 dan kembangkan buah dengan tempo terhadap menteri bila memungkinkan. Gunakan pusat dan keunggulan perkembangan secara konkret.",
      en: "Capture on d5 and develop with tempo against the queen when possible. Make concrete use of central space and development.",
    },
    blackPlan: {
      id: "Pilih posisi aman bagi menteri, keluarkan gajah, lalu susun pertahanan pusat. Pada jalur ...Nf6, utamakan perkembangan sebelum merebut pion.",
      en: "Find a safe queen square, develop the bishops, and organize the center. In ...Nf6 lines, prioritize development before recovering the pawn.",
    },
    branches: ["3...Qa5", "3...Qd6", "3...Qd8", "2...Nf6"],
    caution: {
      id: "Terlalu banyak langkah menteri memberi putih perkembangan gratis. Periksa ancaman pada menteri sebelum menjalankan rencana pion.",
      en: "Too many queen moves hand White free development. Check threats against the queen before starting a pawn plan.",
    },
    chesscom: "Scandinavian-Defense",
    wikipedia: "Scandinavian_Defence",
  },
  scotch: {
    moves: "1.e4 e5 2.Nf3 Nc6 3.d4",
    basics: {
      id: "Scotch membuka pusat lebih awal melalui d4. Setelah ...exd4 dan Nxd4, putih mempunyai ruang, tetapi kuda d4 dan pion e4 dapat menjadi sasaran perkembangan hitam.",
      en: "The Scotch opens the center early with d4. After ...exd4 and Nxd4, White has space, but the d4-knight and e4-pawn can become targets for Black's development.",
    },
    history: {
      id: "Ercole del Rio membahasnya pada 1750. Namanya terkait pertandingan korespondensi Edinburgh–London yang dimulai pada 1824. Kasparov membangkitkan kembali minat terhadapnya dalam duel kejuaraan dunia mulai 1990.",
      en: "Ercole del Rio discussed it in 1750. Its name comes from the Edinburgh–London correspondence match begun in 1824. Kasparov renewed interest through world championship matches starting in 1990.",
    },
    whitePlan: {
      id: "Pertahankan pusat sambil mengembangkan buah dan mengamankan raja. Pertukaran di c6 dapat mengubah struktur serta membuka diagonal gajah.",
      en: "Maintain the center while developing and securing the king. Exchanges on c6 can change the structure and open bishop diagonals.",
    },
    blackPlan: {
      id: "Gunakan ...Bc5 atau ...Nf6 untuk berkembang sambil menekan pusat. Cari kesempatan ...d5 jika persiapannya mencukupi.",
      en: "Use ...Bc5 or ...Nf6 to develop with central pressure. Look for ...d5 when adequately prepared.",
    },
    branches: [
      "Classical (...Bc5)",
      "Schmidt (...Nf6)",
      "Mieses Variation",
      "Scotch Gambit",
      "Göring Gambit",
    ],
    caution: {
      id: "Pusat terbuka menuntut perkembangan cepat. Jangan mengorbankan tempo hanya untuk mempertahankan setiap pion atau memindahkan kuda tanpa tujuan.",
      en: "An open center demands rapid development. Avoid wasting tempi to defend every pawn or move a knight without a purpose.",
    },
    chesscom: "Scotch-Game",
    wikipedia: "Scotch_Game",
  },
  petrov: {
    moves: "1.e4 e5 2.Nf3 Nf6",
    basics: {
      id: "Petrov menjawab serangan ke e5 dengan serangan kuda ke e4. Strukturnya sering simetris, tetapi taktik urutan langkah dan kecepatan perkembangan tetap menentukan.",
      en: "The Petrov answers the attack on e5 by attacking e4 with a knight. Structures are often symmetrical, but move-order tactics and development still matter.",
    },
    history: {
      id: "Namanya menghormati master Rusia Alexander Petrov dari abad ke-19, meskipun gagasannya lebih tua. Kramnik dan Caruana termasuk pemain modern yang menggunakannya dalam persaingan elite.",
      en: "It honors the 19th-century Russian master Alexander Petrov, though the idea is older. Kramnik and Caruana are among its modern elite practitioners.",
    },
    whitePlan: {
      id: "Setelah Nxe5, kembalikan kuda saat diusir dan bangun pusat dengan d4. Pilihan Nc3 dapat menukar struktur demi perkembangan cepat.",
      en: "After Nxe5, retreat when challenged and build the center with d4. Nc3 lines can trade structural concessions for fast development.",
    },
    blackPlan: {
      id: "Pada jalur utama 3.Nxe5, mainkan ...d6 sebelum merebut e4. Kembangkan buah dan seimbangkan tekanan pusat.",
      en: "In the main 3.Nxe5 line, play ...d6 before taking e4. Develop and balance the central pressure.",
    },
    branches: [
      "Classical Attack",
      "Nimzowitsch Attack",
      "3.d4",
      "Stafford Gambit",
    ],
    caution: {
      id: "Meniru langkah putih tidak selalu aman. Khusus setelah 3.Nxe5, ...Nxe4 langsung memiliki masalah taktis; gambit sampingan juga membutuhkan pengetahuan tersendiri.",
      en: "Copying White is not always safe. After 3.Nxe5, an immediate ...Nxe4 has tactical problems; sideline gambits also require separate preparation.",
    },
    chesscom: "Petrovs-Defense",
    wikipedia: "Petrov%27s_Defence",
  },
  english: {
    moves: "1.c4",
    basics: {
      id: "English mengontrol d5 dari sayap tanpa langsung menetapkan pion d dan e. Opening ini fleksibel dan sering berpindah ke struktur opening lain melalui urutan langkah berbeda.",
      en: "The English controls d5 from the flank without immediately committing the d- and e-pawns. It is flexible and often reaches other opening structures through different move orders.",
    },
    history: {
      id: "Namanya berkaitan dengan Howard Staunton, yang memainkan 1.c4 pada abad ke-19. Botvinnik membantu mengembangkannya pada 1930-an, dan Kasparov menjadi salah satu pemakai elite berikutnya.",
      en: "Its name is linked to Howard Staunton's use of 1.c4 in the 19th century. Botvinnik developed it in the 1930s, and Kasparov became a prominent later practitioner.",
    },
    whitePlan: {
      id: "Kembangkan buah dan tentukan pusat setelah melihat respons hitam. Fianchetto Bg2 sering menambah tekanan di diagonal panjang.",
      en: "Develop and choose the central structure after seeing Black's response. A Bg2 fianchetto often adds pressure along the long diagonal.",
    },
    blackPlan: {
      id: "Pilih pusat melalui ...e5 atau susunan simetris ...c5. Tantang ruang putih dengan perkembangan dan terobosan yang sesuai.",
      en: "Choose a center with ...e5 or a symmetrical ...c5 setup. Challenge White's space through development and suitable breaks.",
    },
    branches: [
      "Reversed Sicilian (...e5)",
      "Symmetrical English (...c5)",
      "Four Knights",
      "Botvinnik System",
      "Hedgehog",
    ],
    caution: {
      id: "Fleksibel bukan berarti tanpa rencana. Kenali transposisi agar langkah d4 atau e4 tidak menghasilkan struktur yang belum dipahami.",
      en: "Flexibility still needs a plan. Recognize transpositions so d4 or e4 does not lead to an unfamiliar structure.",
    },
    chesscom: "English-Opening",
    wikipedia: "English_Opening",
  },
};
