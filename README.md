# Budu Web Site

> **Uyarı:**
> Projenin [Commit](https://github.com/trs-1342/budu/commits/) geçmişini kaybettim. 

Bu proje annemin isteği üzerine geliştirilmiş olup, kişisel CV / portfolyo amacı taşımaktadır.  
Hem kullanıcı arayüzü hem de sunucu tarafı ayrı ayrı kodlanmış, modern bir yapıya sahiptir.

## Proje Detayları

- Front-End (Client): React  
- Back-End (Server): Node.js  
- Kullanıcı arayüzü (Client) tamamen React ile geliştirilmiştir.  
- Arka planda (Server) ise gelen istekleri işleyen, yöneten ve uygun yanıtları dönen Node.js kodları çalışmaktadır.  
- Projede hem kişisel CV bilgileri hem de portfolyo sayfaları (ürünler, projeler, hizmetler vb.) yer almaktadır.

## Öne Çıkan Sayfalar ve Bileşenler

- Ana Sayfa (Main.tsx): Profil fotoğrafı, durum rozeti, tanıtım metni ve butonlar içerir. Ayrıca kayan görseller (image marquee) ve istatistik kartları bulunur.
- Header (Header.tsx): Navigasyon menüsü, logo ve "هل لديك مشروع؟" butonu yer alır.
- Footer (Footer.tsx): İletişim formu, sosyal medya bağlantıları (Instagram, LinkedIn, WhatsApp, Email) ve telif hakkı bölümü içerir.
- Projects (Projects.tsx): Eğitim kursları veya projeleri listeleyen kart yapısı bulunur.
- Products (Products.tsx): Ürünler (kitap, kurs vb.) listelenir.
- Services (Services.tsx): Verilen hizmetlerin tanıtım kartları bulunur.
- Admin Paneli:
  - FirstGate.tsx: İlk admin şifresi doğrulama adımı.
  - SetupTempAccount.tsx: Geçici admin hesabı oluşturma sayfası.
  - Login.tsx: Admin girişi.
  - Layout.tsx: Admin panelinin genel şablonu (sidebar, dashboard, çıkış butonu).
  - ProtectedRoute.tsx: Yalnızca giriş yapmış adminlerin erişebileceği özel route yapısı.

## Kurulum Adımları

1. Eğer bilgisayarınızda Git yüklü değilse, önce yükleyin.
2. Depoyu klonlayın:
   git clone https://github.com/trs-1342/budu.git
3. Client klasörüne geçin ve bağımlılıkları yükleyin:
   cd budu/client
   npm i
4. Ardından server klasörüne geçin ve bağımlılıkları yükleyin:
   cd ../server
   npm i
5. Projeyi çalıştırmak için:
   - Client (React): npm run dev
   - Server (Node.js): node server.js

İsterseniz client ve server’ı ayrı terminallerde ya da aynı terminalde sırayla başlatabilirsiniz.

## Kullanılan Teknolojiler

- React: Kullanıcı arayüzü geliştirme  
- Node.js: Sunucu tarafı geliştirme  
- React Router: Sayfalar arası yönlendirme  
- CSS (Custom + Animations): Tasarım ve geçiş efektleri  
- React Icons: Sosyal medya ikonları  
- LocalStorage & State: Admin doğrulama ve geçici oturum yönetimi

## Notlar

- Admin paneli başlangıçta geçici hesap ile çalışmaktadır.  
- Production ortamında admin şifresi .env üzerinden alınmalı ve server doğrulaması yapılmalıdır.  
- Proje hem Türkçe hem Arapça içerik barındırmaktadır (ör. sayfa başlıkları, buton metinleri).  
- Tasarımda reveal animasyonları kullanılmıştır (scroll ile açılan efektler).

## İletişim

- Email: hattab1342@gmail.com

## Telif Hakkı

Tüm hakları saklıdır © Bushra 2025
