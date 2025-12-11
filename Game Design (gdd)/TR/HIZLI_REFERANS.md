# DISBELIEVE - Hızlı Referans Kılavuzu

**Tür:** 2D Hassasiyet Platformer / Bulmaca Platformer  
**Platform:** Unity (PC/Mobil/Web)  
**Ana Konsept:** "Gördüğüne inanma" - Aldatmaca tabanlı platformlama

---

## 🎮 Oyun Özeti

**DISBELIEVE** oyuncuların algısına görsel hileler ve gizli mekaniklerle meydan okur. Katı görünen platformlar sahte olabilir, boş alan katı olabilir ve her seviye bir güven ve keşif bulmacasıdır.

**Hedef Kitle:** Celeste, Super Meat Boy, VVVVVV hayranları (10+, gündelik-hardcore)

---

## 🎯 Temel Mekanikler

### Oyuncu Hareketi
- **Hız:** Saniyede 380 birim (Unity'de 6.33f)
- **Zıplama:** Saniyede -1050 birim (Unity'de 17.5f)
- **Coyote Time:** Platformdan ayrıldıktan sonra 100ms tolerans
- **Kontroller:** Ok tuşları/WASD + Space/W zıplama, R yeniden başlat, ESC duraklat

### Aldatmaca Elemanları
- **Sahte Bloklar (F):** Katı görünür, çarpışma yok
- **Görünmez Platformlar (I):** Katı ama görünmez
- **Hareketli Dikenler:** Oyuncu görünmez çizgiyi geçince tetiklenir
- **Yerçekimi Bölgeleri:** Yerçekimini tersine çevirir veya değiştirir

### Seviye Hedefi
Dikenleri önlerken ve aldatıcı platformlardan geçerken yeşil kapıya ulaş.

---

## 📊 İlerleme Sistemi

### Bölüm Yapısı
- **10 Normal Seviye** (ilerleme için gerekli)
- **1 Bonus Seviye** (isteğe bağlı, ekstra zorluk)
- 10 seviyeyi tamamla → sonraki bölümü aç

### Yıldız Sistemi (Ölüm Sayısı)
- ⭐⭐⭐ **3 Yıldız:** 0 ölüm
- ⭐⭐ **2 Yıldız:** 1-2 ölüm  
- ⭐ **1 Yıldız:** 3+ ölüm

### Açılabilir Öğeler
**Renkler:** Sarı (varsayılan) → Mor → Mavi → Turuncu → Yeşil → Kırmızı → Camgöbeği → Pembe  
**İzler:** Yok → Işıma → Solma → Partiküller

---

## 🏗️ Unity Proje Yapısı

```
Assets/
├── Scripts/
│   ├── Core/              # GameManager, LevelManager, AudioManager, SaveSystem
│   ├── Player/            # PlayerController, PlayerCollision, PlayerCustomization
│   ├── Level/             # Platform, FakePlatform, InvisiblePlatform, MovingSpike, GravityZone, Door
│   └── UI/                # Menü sistemleri, HUD
├── Scenes/                # MainMenu, ChapterSelect, LevelSelect, GameScene
├── Prefabs/               # Yeniden kullanılabilir nesneler
├── Audio/                 # SFX ve Müzik
└── Data/                  # Seviye ve bölümler için ScriptableObject'ler
```

---

## 🎨 Görsel Tasarım

**Estetik:** Minimalist geometrik hassasiyet  
**Palet:** Koyu gri arka plan, orta gri platformlar, özelleştirilebilir oyuncu (varsayılan sarı)  
**UI:** Temiz, klavye ile gezinilebilir menüler ve ilerleme takibi

---

## 🔊 Ses

**SFX:** player_jump.mp3, player_death.mp3, spike_move.mp3, level_end_victory.mp3, chapter_end.mp3  
**Müzik:** main_menu.mp3 (döngü), bölüm başına seviye müziği (planlanmış)  
**Varsayılan:** Müzik %20, SFX %50

---

## 📝 Seviye Tasarım Felsefesi

### Tasarım İlkeleri
1. **Algı vs Gerçeklik** - Varsayımlara meydan oku, "Aha!" anları yarat
2. **Adil Zorluk** - Oyuncular ölümlerden öğrenir, kalıplar tutarlıdır
3. **Aşamalı Öğretim** - Bir seferde bir mekanik, kademeli karmaşıklık
4. **Oyuncuya Saygı** - Anında yeniden doğuş, isteğe bağlı bonus seviyeler

### Seviye Şablonu (Bölüm Başına)
- **Seviye 1-2:** Giriş (güvenli, açık gösterim)
- **Seviye 3-5:** Öğretim (izole mekanikler, güven oluşturma)
- **Seviye 6-9:** Kombinasyon (mekanikleri karıştır, ustalık gerektir)
- **Seviye 10:** Doruk (tüm bölüm mekaniklerini birleştirir)
- **Seviye 11:** Bonus (isteğe bağlı uzman zorluğu)

---

## 🔧 Teknik Hızlı Referans

### Unity Kurulumu
- **Motor:** Unity 2022.3 LTS+
- **Fizik:** 2D Rigidbody (Continuous), Box Collider 2D
- **Giriş:** Yeni Input System
- **Kayıt:** JSON → persistentDataPath (önerilen) veya PlayerPrefs

### Performans Hedefleri
- **60 FPS** minimum (VSync)
- **1920×1080** çözünürlük (ölçeklenebilir)
- **<100MB** PC build, **<50MB** mobil

### Fizik Sabitleri
```csharp
float moveSpeed = 6.33f;
float gravity = 52.5f;        // Rigidbody2D gravity scale
float jumpForce = 17.5f;
float coyoteTime = 0.1f;
float playerSize = 0.67f;     // 40px @ 60px/birim
```

---

## 🎭 Mevcut İçerik

**Bölüm 1: "Temeller"** - Sahte bloklar, görünmez platformlar, temel dikenler (Kolay→Orta)  
**Bölüm 2: "Yerçekimi Kayması"** - Yerçekimi bölgeleri, gelişmiş kalıplar (Orta→Zor)

---

## 🚀 Geliştirme Öncelikleri

1. **Yeni Mekanikler:** Hareketli platformlar, kaybolan platformlar, portallar, anahtarlar/kilitler, tek yönlü platformlar
2. **Özellikler:** Seviye zamanlayıcı, ölüm ısı haritası (debug), topluluk seviye editörü
3. **Platformlar:** Mobil dokunmatik kontroller, WebGL build

---

## 📚 Prototip Referansı

**Konum:** `/play.html` ve `/src/` klasörü  
**Ana Dosyalar:**
- `game.js` - Tüm mekanik mantığı (Unity implementasyonu için referans)
- `levels.js` - Seviye veri yapısı ve ASCII harita sistemi
- `Sounds/` - Yeniden kullanılabilir ses varlıkları

**Dönüşüm:** 60 Canvas pikseli = 1 Unity birimi

---

**Tam Dokümantasyon:** Detaylar için `OYUN_TASARIM_DOKUMANI.md` dosyasına bakın  
**Sahip:** Yusuf Enes | **Güncelleme:** Aralık 2025
