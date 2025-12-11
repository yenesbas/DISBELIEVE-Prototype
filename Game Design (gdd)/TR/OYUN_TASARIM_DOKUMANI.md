# DISBELIEVE - Oyun Tasarım Dokümanı

**Versiyon:** 1.0  
**Tarih:** Aralık 2025  
**Durum:** Unity Geliştirme (Prototipten Geçiş)  
**Tür:** 2D Hassasiyet Platformer / Bulmaca Platformer  
**Hedef Platform:** PC (Birincil), Mobil (Gelecek), Web (Olası)

---

## 📋 İçindekiler

1. [Yönetici Özeti](#yönetici-özeti)
2. [Oyun Genel Bakış](#oyun-genel-bakış)
3. [Temel Oynanış Mekanikleri](#temel-oynanış-mekanikleri)
4. [Seviye Tasarım Felsefesi](#seviye-tasarım-felsefesi)
5. [İlerleme Sistemi](#ilerleme-sistemi)
6. [Görsel Tasarım](#görsel-tasarım)
7. [Ses Tasarımı](#ses-tasarımı)
8. [Teknik Özellikler](#teknik-özellikler)
9. [Oyuncu Özelleştirmesi](#oyuncu-özelleştirmesi)
10. [Gelecek Özellikler & Yol Haritası](#gelecek-özellikler--yol-haritası)

---

## 1. Yönetici Özeti

### Oyun Konsepti
**DISBELIEVE**, algının en büyük düşman olduğu aldatıcı bir 2D hassasiyet platformer oyunudur. Oyuncular, görsel hileler, gizli platformlar ve aldatıcı engellerle dolu giderek zorlaşan seviyelerden geçerler. Temel mantra: **"Hiçbir şey göründüğü gibi değildir."**

### Benzersiz Satış Noktaları
- **Aldatmaca Tabanlı Oynanış**: Sahte platformlar, görünmez duvarlar ve görsel yanılsamalar
- **Hassasiyet Platformlama**: Coyote time ve duyarlı mekaniklerle sıkı kontroller
- **Artan Zorluk**: Bölüm başına 10 normal seviye + 1 bonus seviye sistemi
- **Minimalist Estetik**: Aldatmacayı güçlendiren temiz, odaklı görsel tasarım
- **Ceza Yok**: Anında yeniden doğuş, deneme ve öğrenmeyi teşvik eder
- **Özelleştirme Ödülleri**: Bölümleri tamamlayarak yeni renkler ve efektler kazanın

### Hedef Kitle
- **Birincil**: Hassasiyet platformer hayranları
- **İkincil**: Akıl bükücü mekanikleri seven bulmaca oyunu meraklıları
- **Yaş Aralığı**: 10+ (şiddet içeriği yok, zorlu oynanış)
- **Beceri Seviyesi**: Gündelik oyuncudan hardcore'a (zorluk bölümler boyunca artar)

---

## 2. Oyun Genel Bakış

### Ana Tema
**"Gördüğüne inanma (DISBELIEVE)"** - Oyun sürekli olarak oyuncunun gerçeklik algısına meydan okur. Katı görünen sahte olabilir, boş görünen katı olabilir ve görsel ipuçları kasıtlı olarak yanıltıcıdır.

### Hikaye/Anlatı
*Minimal anlatı yaklaşımı - oynanış hikayenin kendisidir*

Oyuncu, gerçekliğin bozulduğu bir dünyada sıkışıp kalmıştır. Her bölüm, fizik yasalarına ve görsel algıya güvenilemeyecek bir aleme daha derin bir inişi temsil eder. Çıkış yolu, her şeyi sorgulamak ve yeşil kapıya ulaşmaktır.

### Zafer Koşulu
- **Seviye Başına**: Yeşil kapı çıkışına ulaşın
- **Bölüm (Chapter) Başına**: Tüm 10 normal seviyeyi tamamlayın (bonus isteğe bağlı)
- **Genel**: Tüm bölümleri (Chapterlari) tamamlayın (şu anda 2 bölüm, genişletilebilir)

### Oyun Döngüsü
1. **Bölüm Seç** → Seviye Seç
2. **Seviyeyi Dene** → Öl ve kalıpları öğren
3. **Seviyede Ustalaş** → Minimum ölümle kapıya ulaş
4. **Yıldız Kazan** → Ölüm sayısına göre (0 ölüm = 3 yıldız, 3+ = 2 yıldız, 10+ = 1 yıldız) --> ortalamaya göre degisebilir
5. **İlerlemeyi Aç** → Yeni seviyeler, bölümler ve özelleştirme seçenekleri
6. **Tekrarla** → Giderek karmaşık zorlukları ustalaş

---

## 3. Temel Oynanış Mekanikleri

### 3.1 Oyuncu Hareketi

#### Hareket Fiziği
- **Hareket Hızı**: Saniyede 380 birim
- **Yerçekimi**: Saniyede² 3150 birim (daha hızlı oynanış için 1.5x standart)
- **Zıplama Kuvveti**: Saniyede -1050 birim (1.25x standart)
- **Coyote Time**: Platformdan ayrıldıktan sonra 100ms tolerans süresi
- **Oyuncu Boyutu**: 40×40 piksel
- **Çarpışma**: AABB (Eksen Hizalı Sınırlayıcı Kutu) --> 2D Collision

#### Gelişmiş Mekanikler
- **Zıplama Tamponlama**: *(Planlanmış)* İnişten önce 100ms boyunca zıplama girişini hatırla
- **Değişken Zıplama Yüksekliği**: *(Planlanmış)* Daha kısa zıplamalar için zıplamayı erken bırak
- **Hızlanma/Yavaşlama**: *(Planlanmış)* Yumuşak hareket geçişleri

### 3.2 Engeller & Tehlikeler

#### Platform Tipleri

**Standart Platformlar (#)**
- Katı çarpışma
- Görsel: Koyu ana hatlarla gri bloklar
- Davranış: Standart fizik çarpışması

**Sahte Bloklar (F)**
- Çarpışma YOK (oyuncu geçer)
- Görsel: Standart platformlarla özdeş
- Amaç: Oyuncuları yanlış güvenlik hissine sürüklemek

**Görünmez Platformlar (I)**
- Katı çarpışma
- Görsel: Tamamen görünmez
- Amaç: Gizli yollar ve gizli rotalar

**Yerçekimi Bölgeleri (G/g)**
- Oyuncu yerçekimini tersine çevirir veya değiştirir
- Görsel: Yön göstergeleriyle gradyan efektleri

#### Tehlikeler

**Hareketli Dikenliler**
- Tetik (Trigger): Oyuncu görünmez dikey çizgiyi geçer
- Hareket: İşaretçiye göre belli yönlere kayar
- Görsel: Sarı kesikli tetik çizgileriyle keskin üçgen engeller (Debugger mode)
- Hız: Tetiklendiğinde hızlı hareket
- Ses: Aktivasyonda "spike_move.mp3"

**Ölüm Mekanikleri**
- Diken çarpışmasında anında ölüm
- 0.2 saniyelik yanıp sönme efekti
- Doğuş noktasında (S) veya varsayılan konumda otomatik yeniden doğuş
- Ölüm sayacı artar
- Ses: "player_death.mp3"

### 3.3 Seviye Elemanları

**Doğuş Noktası (S)**
- Oyuncu için özel başlangıç konumu
- Varsayılan: 'S' işareti yoksa sol üst güvenli alan

**Kapı (D)**
- Seviye çıkışı / zafer koşulu
- Görsel: Yeşil kapı
- Çarpışma: Seviye tamamlanmasını tetikler
- Ses: "level_end_victory.mp3"

**Karo Boyutu**: 60×60 piksel (tüm elemanlar ızgaraya yaslanır)

---

## 4. Seviye Tasarım Felsefesi

### 4.1 Tasarım İlkeleri

**1. Algı vs Gerçeklik**
- Her seviye oyuncu varsayımlarına meydan okumalı
- Görsel görünüm işlevselliğe eşit olmamalı
- Oyuncular hileyi keşfettiğinde "Aha!" anları yaratın

**2. Adil Zorluk**
- Aldatmaca akıllıca hissetmeli, ucuz değil
- Oyuncular ölümlerden öğrenebilmeli
- Kalıplar keşfedildikten sonra tutarlı olmalı

**3. Aşamalı Öğretim**
- Bir seferde bir yeni konsept tanıtın
- Mekanikleri birleştirmeden önce ustalığa izin verin
- Her bölüm için öğretici seviyeler

**4. Oyuncunun Zamanına Saygı**
- Anında yeniden doğuş (uzun ölüm animasyonları yok)
- İsteğe bağlı bonus seviyeler (ilerleme için gerekli değil)

### 4.2 Bölüm Yapısı

**Standart Bölüm Formatı:**
- 10 Normal Seviye (ilerleme için gerekli)
- 1 Bonus Seviye (isteğe bağlı, ekstra zorluk)
- Her bölüm yeni mekanikler veya kombinasyonlar tanıtır

**Mevcut Bölümler:**

#### Chapter 1: "Temeller"
**Tema**: Aldatmacaya giriş  
**Mekanikler**: Sahte bloklar, görünmez platformlar, temel diken tetikleyicileri  
**Zorluk**: Kolay → Orta  
**Açılanlar**: Mor renk, Işıma iz efekti

#### Chapter 2: "Yerçekimi Kayması"
**Tema**: Fizik manipülasyonu  
**Mekanikler**: Yerçekimi bölgeleri, gelişmiş diken kalıpları, birleşik aldatmaca  
**Zorluk**: Orta → Zor   
**Açılanlar**: Mavi renk, Solma iz efekti

### 4.3 Seviye Tasarım Kalıpları

**Giriş Kalıbı** (Seviye 1)
- Güvenli ortam
- Açık görsel gösteri
- Metin ipuçlarına izin verilir
- Ucuz ölümler yok

**Öğretim Kalıbı** (Seviye 2 ila 5)
- Mekaniği izole olarak tanıtın
- Yavaş yavaş karmaşıklığı artırın
- Oyuncu güvenini oluşturun

**Kombinasyon Kalıbı** (Seviye 6 ila 9)
- Birden fazla mekaniği karıştırın
- Oyuncu ustalığı gerektirin
- Mekansal akıl yürütmeye meydan okuyun

**Doruk Noktası Kalıbı** (Seviye 10)
- Bölüm finali
- Tüm bölüm mekaniklerini birleştirir
- En yüksek zorluk
- Unutulmaz zorluk

**Bonus Kalıbı** (Seviye 11)
- İsteğe bağlı uzman zorluğu
- Yaratıcı mekanik kullanımı
- İlerleme için gerekli değil

### 4.4 Tasarım Anti-Kalıpları (Bunlardan Kaçının)

❌ **Görünmez Anında Ölüm**: Görsel veya işitsel ipuçları verin  
❌ **Hayal Kırıklığı Artışları**: Hazırlık olmadan zorluk artışlarından kaçının  
❌ **Belirsiz Hedefler**: Kapı her zaman açıkça görünür veya belirtilmiş olmalı  

---

## 5. İlerleme Sistemi

### 5.1 Seviye Kilidi Açma

**Bölüm Kilidi Açma:**
- Bölüm 1: Her zaman açık
- Bölüm N+1: Bölüm N tamamlandığında açılır (tüm 10 normal seviye)
- Bonus seviyelerin tamamlanması GEREKMİYOR

**Seviye Kilidi Açma:**
- Her bölümün ilk seviyesi: Önceki bölüm tamamlandığında açılır
- Sonraki seviyeler: Önceki seviye tamamlandığında açılır
- Bonus seviye: Bölümdeki tüm 10 normal seviye tamamlandığında açılır

### 5.2 Yıldız Derecelendirme Sistemi

**Ölüm Sayısına Göre:**
- ⭐⭐⭐ **3 Yıldız**: 0 ölüm (mükemmel koşu)
- ⭐⭐ **2 Yıldız**: 1-2 ölüm (iyi performans)
- ⭐ **1 Yıldız**: 3+ ölüm (tamamlandı)
- Sayilar ortalamaya göre degisebilir

**Amaç:**
- Tekrar oynanabilirlik teşviki
- Beceri ölçümü
- Mükemmeliyetçiler için isteğe bağlı zorluk

**Kaydedilen İlerleme:**
- Seviye başına en iyi yıldız derecesi kalıcıdır
- Toplam ölüm sayısı global olarak izlenir
- Seviye tamamlanma durumu localStorage'a kaydedilir

### 5.3 Özelleştirme Kilidi Açma

**Renkler** (bölümleri tamamlayarak aç):
- Sarı: Varsayılan (her zaman mevcut)
- Mor: Bölüm 1 tamamla
- Mavi: Bölüm 2 tamamla
- Turuncu: Bölüm 3 tamamla
- Yeşil: Bölüm 4 tamamla
- Kırmızı: Bölüm 5 tamamla
- Camgöbeği: Bölüm 6 tamamla
- Pembe: Bölüm 7 tamamla

**İz Efektleri** (bölümleri tamamlayarak aç):
- Yok: Varsayılan
- Işıma: Bölüm 1 tamamla (parlayan aura)
- Solma: Bölüm 2 tamamla (solan iz)
- Partiküller: Bölüm 3 tamamla (partikül efekti)

**Kilit Açma Bildirim Sistemi:**
- Herhangi bir bölümün 10. seviyesini tamamladıktan sonra görüntülenir
- Tüm yeni açılan öğeleri gösterir (renkler + izler)
- Kapatmak ve devam etmek için Enter veya Space'e basın
- Ses: "chapter_end.mp3"

---

## 6. Görsel Tasarım

### 6.1 Sanat Stili, Oyunun yazilacak hikayesine göre degisebilir

**Estetik**: Minimalist geometrik hassasiyet
- Temiz, keskin kenarlar
- Okunabilirlik için yüksek kontrast
- Gereksiz görsel gürültü yok
- Oynanış netliğine odaklanma

**Renk Paleti:**
- Arka Plan: `#2a2a2a` (koyu gri)
- Standart Platformlar: `#666666` (orta gri) `#555555` ana hattıyla
- Sahte Bloklar: Platformlarla özdeş (aldatmaca!)
- Görünmez Platformlar: Tamamen şeffaf
- Oyuncu: Özelleştirilebilir (varsayılan: `#ffdd44` sarı)
- Kapı: `#44ff44` (yeşil)
- Dikenler: `#ff4444` (kırmızı)
- UI Metni: `#ffffff` (beyaz), vurgu: `#8c44ff` (mor)

### 6.2 Kullanıcı Arayüzü (Degisebilir)

**Ana Menü:**
- Ortalanmış başlık "DISBELIEVE"
- Üç düğme: Oyna | Ayarlar | İlerlemeyi Sıfırla
- Temiz, okunabilir düzen
- Klavye navigasyonu (↑/↓ + Enter)

**Bölüm Seçimi:**
- Başlık ve ilerleme bilgisiyle bölüm kartları
- Tamamlanma yüzdesini gösterir
- Açılan özelleştirme ödüllerini gösterir
- Bölüm başına yıldız sayısı
- Mevcut bölümün görsel göstergesi

**Seviye Seçimi:**
- Seviye numaralarıyla ızgara düzeni
- Yıldız derecesi gösterimi
- Kilitli/açık durum görseli
- Seviye 11 için "BONUS" göstergesi
- Bölüm Seçimine Dön düğmesi

**Oyun İçi HUD:**
- Sağ üst: Ölüm sayısı
- Sol üst: Seviye adı
- Duraklat menüsü için ESC uyarısı
- Dikkat dağınıklığını önlemek için minimalist

**Duraklat Menüsü:**
- Devam Et
- Seviyeyi Yeniden Başlat
- Ayarlar (ses kontrolleri)
- Menüye Dön

**Seviye Tamamlama Ekranı:**
- Kazanılan yıldız derecesi
- Bu deneme için ölüm sayısı
- "Devam etmek için SPACE'e basın" uyarısı
- Kutlama efekti (planlanmış)

### 6.3 Görsel Efektler

**Mevcut:**
- Ölüm yanıp sönmesi (beyaz ekran yanıp sönmesi, 0.2s)
- Diken tetik çizgileri (sarı kesikli, her zaman görünür)
- Düğme hover efektleri
- Oyun durumları arasında solma geçişleri

**Planlanmış ama henüz prototipe eklenmeyenler:**
- İniş partikülleri/tozu
- Oyuncu iz efektleri (kilit açmaya göre)
- Kapı açılma animasyonu
- Ölümde ekran sarsıntısı
- Arka plan gradyanları/desenleri
- Yerçekimi bölgesi partikül efektleri

---

## 7. Ses Tasarımı

### 7.1 Ses Efektleri

**Oyuncu Aksiyonları:**
- `player_jump.mp3` - Zıplama sesi (space tuşu)
- `player_death.mp3` - Ölüm sesi (diken çarpışması) - Daha fazla ölüm sesi (Cesitlilik)

**Çevresel:**
- `spike_move.mp3` - Diken hareketi tetikleyicisi
- `level_end_victory.mp3` - Kapıya ulaşıldı
- `chapter_end.mp3` - Bölüm tamamlanması

**Planlanmış ama henüz yapilmamis:**
- İniş sesi
- Ayak sesi
- Yerçekimi çevirme sesi
- UI düğme tıklamaları

### 7.2 Müzik

**Mevcut:**
- `main_menu.mp3` - Menü arka plan müziği (döngü) - Daha farkli müzikler (Cesitlilik)

**Planlanmış:**
- Seviye arka plan müziği (bölüm temasına göre)
- Boss seviyesi müziği

### 7.3 Ses Sistemi

**Ses Kontrolleri:**
- Ana Ses: %0-100
- Müzik Sesi: %0-100 (varsayılan: %20)
- SFX Sesi: %0-100 (varsayılan: %50)

---

## 8. Teknik Özellikler

### 8.1 Platform & Motor

**Teknoloji Yığını:**
- **Motor**: Unity 2022.3 LTS veya daha yeni
- **Dil**: C#
- **Fizik**: Unity 2D Physics Engine
- **Giriş Sistemi**: Unity Input System (Yeni)
- **Kayıt Sistemi**: Unity PlayerPrefs / JSON serileştirme
- **Ses**: Unity Audio System ve AudioMixer

**Hedef Platform:**
- **Birincil**: PC (Windows/Mac/Linux)
- **İkincil**: Mobil (iOS/Android) - dokunmatik kontroller
- **Olası**: Tarayıcı oynatma için WebGL build

### 8.2 Performans Hedefleri

**Kare Hızı:** Minimum 60 FPS (VSync etkin)  
**Çözünürlük:** 1920×1080 (ölçeklenebilir UI)  
**Fizik Güncelleme Hızı:** Sabit 50 FPS (FixedUpdate)  
**Bellek:** < 200MB toplam kullanım  
**Build Boyutu:** < 100MB (PC), < 50MB (Mobil)

### 8.3 Unity Proje Yapısı

**Önerilen Klasör Yapısı:**
```
Assets/
├── Scripts/
│   ├── Core/
│   │   ├── GameManager.cs        # Ana oyun durumu yönetimi
│   │   ├── LevelManager.cs       # Seviye yükleme ve ilerleme
│   │   ├── AudioManager.cs       # Ses sistemi
│   │   └── SaveSystem.cs         # Kaydet/yükle fonksiyonları
│   ├── Player/
│   │   ├── PlayerController.cs   # Hareket ve giriş
│   │   ├── PlayerCollision.cs    # Çarpışma algılama
│   │   └── PlayerCustomization.cs # Renk/iz sistemi
│   ├── Level/
│   │   ├── Platform.cs           # Standart platform davranışı
│   │   ├── FakePlatform.cs       # Sahte blok (çarpışma yok)
│   │   ├── InvisiblePlatform.cs  # Görünmez katı platform
│   │   ├── MovingSpike.cs        # Diken hareket mantığı
│   │   ├── GravityZone.cs        # Yerçekimi manipülasyonu
│   │   └── Door.cs               # Seviye çıkışı
│   ├── UI/
│   │   ├── MenuManager.cs        # Ana menü
│   │   ├── ChapterSelectUI.cs    # Bölüm seçimi
│   │   ├── LevelSelectUI.cs      # Seviye seçimi
│   │   ├── PauseMenu.cs          # Duraklat fonksiyonu
│   │   └── SettingsMenu.cs       # Ayarlar UI
│   └── Data/
│       ├── LevelData.cs          # Seviyeler için ScriptableObject
│       └── ChapterData.cs        # Bölümler için ScriptableObject
├── Scenes/
│   ├── MainMenu.unity
│   ├── ChapterSelect.unity
│   ├── LevelSelect.unity
│   ├── GameScene.unity           # Ana oynanış sahnesi
│   └── TestLevel.unity           # Seviye tasarım testi
├── Prefabs/
│   ├── Player.prefab
│   ├── Platform.prefab
│   ├── FakeBlock.prefab
│   ├── InvisiblePlatform.prefab
│   ├── Spike.prefab
│   ├── GravityZone.prefab
│   └── Door.prefab
├── Audio/
│   ├── SFX/                      # Ses efektleri
│   └── Music/                    # Arka plan müziği
├── Materials/
│   └── 2D/                       # Sprite'lar ve materyaller
├── Data/
│   ├── Levels/                   # Seviye ScriptableObject'leri
│   └── Chapters/                 # Bölüm ScriptableObject'leri
└── Resources/
    └── Settings/                 # Oyun konfigürasyonu
```

**Temel Unity Sistemleri:**

1. **Oyun Durumu Yönetimi**
   - Singleton GameManager pattern
   - Durumlar: Menu, ChapterSelect, LevelSelect, Playing, Paused, LevelComplete, UnlockNotification
   - Unity SceneManager üzerinden sahne yönetimi

2. **Seviye Sistemi**
   - ScriptableObject olarak tanımlanan seviyeler
   - Veriden runtime seviye oluşturma veya önceden yapılmış prefab'ler
   - Bölüm tabanlı organizasyon

3. **Fizik Konfigürasyonu**
   - Oyuncu için 2D Rigidbody (Sürekli çarpışma algılama)
   - Platformlar ve oyuncu için Box Collider 2D
   - Dikenler, kapı, yerçekimi bölgeleri için Trigger Collider'lar
   - Doğru çarpışma filtreleme için fizik katmanları

**Fizik Sabitleri (Unity):**
```csharp
// PlayerController.cs sabitleri
float moveSpeed = 6.33f;              // ~380 birim/sn Unity'ye ölçeklenmiş
float gravity = 52.5f;                // Rigidbody2D üzerinde yerçekimi ölçeği
float jumpForce = 17.5f;              // Zıplama hızı
float coyoteTime = 0.1f;              // Coyote time süresi
float playerSize = 0.67f;             // Oyuncu collider boyutu (40px @ 60px/birim)
```

### 8.4 Kayıt Sistemi (Unity)

**Uygulama Seçenekleri:**

**Seçenek 1: PlayerPrefs** (Basit, yerleşik)
```csharp
// Kaydet
PlayerPrefs.SetString("CompletedLevels", JsonUtility.ToJson(levelData));
PlayerPrefs.SetInt("TotalDeaths", deaths);
PlayerPrefs.SetString("PlayerColor", colorHex);

// Yükle
string json = PlayerPrefs.GetString("CompletedLevels");
LevelData data = JsonUtility.FromJson<LevelData>(json);
```

**Seçenek 2: JSON Dosyası** (Daha esnek, önerilen)
```csharp
// SaveSystem.cs
public class SaveData
{
    public List<int> completedLevels;
    public Dictionary<int, int> levelStars;
    public string playerColor;
    public string playerTrail;
    public int totalDeaths;
}

// Kalıcı veri yoluna kaydet
string json = JsonUtility.ToJson(saveData, true);
File.WriteAllText(Application.persistentDataPath + "/save.json", json);
```

**Saklanan Veri:**
- Tamamlanan seviye indeksleri (List<int>)
- Seviye başına yıldız dereceleri (Dictionary<int, int>)
- Oyuncu özelleştirmesi (renk, iz)
- Toplam ölüm sayısı
- Ayarlar (ses seviyeleri)

**Sıfırlama Fonksiyonu:**
- Kayıt dosyasını siler veya PlayerPrefs'i temizler
- Onay diyalogu gösterir
- Varsayılan değerlere döner

### 8.5 Prototip Referansı

**JavaScript Prototip Konumu:**
```
Prototip Dosyaları (referans için):
├── play.html              # Oyun giriş noktası
├── src/
│   ├── game.js           # Tüm oyun mantığı (ana referans)
│   ├── levels.js         # Seviye veri yapısı örnekleri
│   ├── level_guide.md    # Seviye oluşturma dokümantasyonu
│   └── debug_and_design_tips.md
├── Sounds/               # Ses varlıkları (yeniden kullanılabilir)
└── dev-notes/           # Tasarım dokümantasyonu
```

**Prototip Referans Kullanımı:**
- **game.js**: Mekanik implementasyonu için ana mantık referansı
- **levels.js**: Seviye veri yapısı ve ASCII harita sistemi
- **Oyun Durumları**: Aynı state machine pattern (menu, playing, paused, vb.)
- **Fizik Değerleri**: JavaScript sabitlerini Unity uyumlu değerlere dönüştür
- **Ses Dosyaları**: Sounds/ klasöründen ses efektleri ve müziği yeniden kullan

**Önemli Dönüşüm Notları:**
- JavaScript Canvas pikselleri → Unity dünya birimleri (60px = 1 birim önerilir)
- deltaTime zaten Unity Time.deltaTime tarafından işlenir
- Canvas rendering → Unity SpriteRenderer/UI bileşenleri
- Event listener'lar → Unity Input System aksiyonları

---

## 9. Oyuncu Özelleştirmesi

### 9.1 Renk Sistemi

**Uygulama:**
- Toplam 8 renk (Sarı varsayılan + 7 açılan)
- Oyuncu kare rengini değiştirir
- Tamamen kozmetik (oynanış etkisi yok - belki ilerde olabilir?)
- Ayarlar menüsünde seçilir
- Oturumlar arası kalıcıdır

**Kilit Açma İlerlemesi:**
- Bölüm tamamlanmasına bağlıdır
- Uzun vadeli hedef oluşturur
- İlerleme için görünür ödül

### 9.2 İz Efektleri

**Tipler:**
1. **Yok** - Görsel iz yok (varsayılan)
2. **Işıma** - Oyuncu etrafında hafif parlayan aura
3. **Solma** - Oyuncuyu takip eden solan görüntüler
4. **Partiküller** - Partikül iz efekti
5. ....

**Uygulama:**
- Ek görsel katman
- Oynanış/hitbox'lara etkisi yok
- Ayarlar menüsünde seçilir
- Bölüm tamamlanmasıyla açılır

### 9.3 Gelecek Özelleştirme Fikirleri

- Zıplama partikül efektleri
- UI temaları

---

## 10. Gelecek Özellikler & Yol Haritası

### 10.1 Faz 1: Cilalama (Mevcut Öncelik)

**Yeni Mekanikler:**
- Hareketli platformlar
- Kaybolan platformlar
- Portallar/ışınlayıcılar
- Anahtarlar ve kilitler
- Tek yönlü platformlar
- Rüzgar/akım bölgeleri
- Zıplama pedleri

### 10.3 Faz 3: Gelişmiş Özellikler

**İlerleme:**
- Seviye zamanlayıcı/hız koşusu modu
- Ölüm ısı haritası görselleştirmesi - Debugger mode

**Sosyal:**
- Lider tabloları (zaman/ölümler)
- Topluluk seviye editörü

**Erişilebilirlik:**
- Renk körü modları
- Ses efektleri için görsel göstergeler

### 10.4 Faz 4: Platform Genişletmesi

**Mobil Versiyon:**
- Dokunmatik kontroller
- Duyarlı düzen
- Sanal düğmeler

---

## Ek A: Seviye Oluşturma Kılavuzu

### Yeni Seviyeler Oluşturma

1. **`src/levels.js` dosyasını açın**
2. **Uygun bölüm dizisine ekleyin:**

```javascript
{
  name: "Seviye X: Yaratıcı İsim",
  map: [
    "....#................",
    ".S..#................",  // S = doğuş
    "##..#................",  // # = platform
    "....#................",  // F = sahte blok
    "........I...1....D...",  // I = görünmez, 1 = diken
    "#######F############"   // D = kapı
  ],
  spikeTriggers: [400]  // İsteğe bağlı özel tetikleyiciler
}
```

3. **Tarayıcıda test edin**
4. **Oyun testine dayalı olarak tekrarlayın**

### Tasarım Kontrol Listesi
- [ ] Oyuncu ölümlerden öğrenebilir mi?
- [ ] En az bir açık zafer yolu var mı?
- [ ] Bir konsept öğretiyor veya pekiştiriyor mu?
- [ ] Zorluk bölüm için uygun mu?
- [ ] Seviyeyi tekrar oynamak eğlenceli mi?

---

## Ek B: Hata Ayıklama Özellikleri

**Hata Ayıklama Modunu Etkinleştir:**
```javascript
// game.js'de ayarlayın:
const ENABLE_DEBUG_FEATURES = true;
let DEBUG_MODE = false;
```

**Hata Ayıklama Tuşları - Debugger mode (etkinleştirildiğinde):**
- `T` - Hata ayıklama modunu aç/kapat
- `G` - Manuel yerçekimi çevirme (yerçekimi bölgeleri etkinse)
- `H` - Yerçekimi durumunu kilitle/kilidi aç
- `Shift + N` - Sonraki seviyeye atla
- `Shift + P` - Önceki seviye

**Hata Ayıklama Görselleştirmeleri:**
- Sarı kesikli çizgiler: Diken tetik konumları
- Izgara üst katmanı *(planlanmış)*
- Çarpışma kutuları *(planlanmış)*
- FPS sayacı *(planlanmış)*

---

## Ek C: Sözlük

- **Coyote Time**: Platformdan ayrıldıktan sonra zıplama için tolerans süresi
- **deltaTime**: Yumuşak fizik için kareler arası süre
- **localStorage**: Kayıt verileri için tarayıcı depolama

---

## Doküman Değişiklik Günlüğü

**v1.0 - Aralık 2025**
- İlk GDD oluşturma
- Mevcut prototip durumunu belgeler
- Uygulanan özellikler + yol haritası içerir
- 2 tam bölümü kapsar

---

**Doküman Sahibi**: Yusuf Enes
**Son Güncelleme**: 2 Aralık 2025