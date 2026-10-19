# 🏆 GrandMaster — Professional Shaxmat va Shashka Veb-Platformasi

Professional darajada ishlab chiqilgan, xalqaro FIDE va rus shashkasi qoidalariga to'liq mos keluvchi, kuchli sun'iy intellekt (AI) va zamonaviy foydalanuvchi interfeysiga (UI/UX) ega veb-sayt.

---

## 🚀 Ishga Tushirish

Hech qanday qo'shimcha dastur o'rnatish shart emas!

1. Papkadagi **`index.html`** faylini yoki **`start_game.bat`** faylini sichqoncha bilan ikki marta bosing.
2. O'yin avtomatik tarzda sizning sevimli brauzeringizda (Google Chrome, Microsoft Edge, Mozilla Firefox, Opera, Safari) ochiladi.

---

## 🌟 Asosiy Imkoniyatlar

### ♟️ 1. Shaxmat (Chess)
* **To'liq xalqaro FIDE qoidalari**:
  - Oddiy yurishlar va toshlarni urish;
  - Shohga hujum (*Shax*), yengish (*Mot*), harakatsiz holat (*Pat*);
  - **Rokirovka** (Uzun va qisqa rokirovka, barcha himoya va xavfsizlik tekshiruvlari bilan);
  - **Yo'l-yo'lakay tosh olish** (*En Passant*);
  - **Piyodani almashtirish** (*Pawn Promotion*): Farzin, To'ra, Fil yoki Otni tanlash oynasi bilan;
  - 50 ta yurish qoidasi va yetarli tosh qolmaganda durrangni avtomatik aniqlash.
* **Pozitsiyani baholash shkalasi (Evaluation Bar)**: real vaqt rejimida qaysi taraf ustunlikka egaligini ko'rsatib turadi.
* **SAN / Algebraik yurishlar yozuvi** (masalan: `1. e4 e5 2. Nf3 Nc6`).

### ⚪ 2. Shashka (Checkers / Ruscha shashka)
* 8x8 qora kataklarda 12 tadan tosh bilan o'ynaladi;
* Oddiy toshlar oldinga yuradi, lekin **orqaga ham, oldinga ham uradi**;
* **Urish majburiy** (*Mandatory Capture*): agar urish imkoni bo'lsa, o'yinchi urishga majbur;
* **Ketma-ket urish zanjirlari** (*Multi-jump*): bitta yurishda bir nechta toshni birdaniga urib olish imkoniyati;
* **Uchuvchi Damka (Flying King)**: oxirgi qatorga yetib borgan tosh Damkaga aylanadi va butun diagonal bo'ylab uchib yuradi hamda uzoq masofadan tosh uradi.

---

## 🎮 O'yin Rejimlari va Sozlamalar

1. **🤖 Kompyuterga qarshi (AI)**:
   - **Oson (Boshlovchi)**: yangi o'rganuvchilar uchun;
   - **O'rta (Havaskor)**: o'rtacha kuchga ega;
   - **Qiyin (Usta)**: Minimax va Alpha-Beta qirqish algoritmlari asosida hisoblangan chuqur taktik fikrlovchi kuchli bot.
2. **👥 Do'st bilan (2 kishi bitta qurilmada / Stol ustida)**:
   - **📱 Planshet va Telefon Rejimi (180° burish)**: 2 kishi telefon yoki planshetni stol ustiga qo'yib o'ynaganda, qarama-qarshi o'tirgan o'yinchining toshlari va ma'lumotlari unga to'g'ri ko'rinishi uchun avtomatik ravishda uning tarafiga teskari (180°) qilib buriladi!
   - Doskani 180° aylantirish (*Flip board*) imkoniyati.
3. **⚙️ Alohida Sozlamalar Bo'limi**:
   - Asosiy ekrandagi "⚙️ Sozlamalar" tugmasi orqali rejim, vaqt, qiyinlik, rang, tema va ovozlarni bir joydan oson boshqarish.
4. **⏱️ Vaqt nazorati (Shaxmat soati)**:
   - 1 daqiqa (*Bullet*), 3 daqiqa (*Blitz*), 5 daqiqa (*Blitz*), 10 daqiqa (*Rapid*) va Cheksiz (*Unlimited*).
   - Vaqt 20 soniyadan kam qolganda ogohlantiruvchi qizil pulsatsiya.
5. **🎨 Katta va Qulay Doska**:
   - Ekran bo'yiga moslashuvchan, kattalashtirilgan o'lcham (84vh / 760px gacha).
   - 4 xil doska dizayni: Klassik yog'och, Qora eman, Turnir yashil, Zamonaviy qorong'i.
6. **🔊 Realistik Ovozlar (Web Audio API)**:
   - Doska taqillashi, tosh urish zarbasi, shax ogohlantirishi, rokirovka, damka bo'lish va g'alaba akkordlari.
   - Internetga bog'lanmagan, 100% oflayn ishlaydi.
7. **📱 Boshqaruv**:
   - Sichqoncha bilan tortib olib borib qo'yish (*Drag & Drop*)
   - Katakni bosish (*Click-to-move*)
   - Sensorli ekranlar (Telefon va Planshet) uchun to'liq moslashtirilgan.

---

## 📁 Fayllar Strukturasi

```
shaxmat game/
├── index.html            # Asosiy veb-sahifa interfeysi
├── start_game.bat        # Bitta bosish bilan brauzerda ochish dasturi
├── README.md             # Loyiha haqida batafsil ma'lumot
├── css/
│   ├── style.css         # Asosiy uslublar, dark glassmorphism, modallar va moslashuvchanlik
│   └── board.css         # 8x8 doska kataklari, toshlar, animatsiyalar, temalar
└── js/
    ├── audio.js          # Web Audio API sintizatori (oflayn tovushlar)
    ├── chess-engine.js   # FIDE qoidalariga mos shaxmat dvigateli
    ├── chess-ai.js       # Minimax + Alpha-Beta pruning shaxmat sun'iy intellekti
    ├── checkers-engine.js# Rus va xalqaro shashka qoidalari dvigateli
    ├── checkers-ai.js    # Shashka sun'iy intellekti
    ├── timer.js          # Ikkala o'yinchi uchun raqamli shaxmat soatlari
    ├── ui.js             # SVG vektor toshlar, Drag&Drop, animatsiya va vizualizatsiya
    └── app.js            # Asosiy boshqaruvchi (o'yinlararo o'tish, hodisalar)
```
