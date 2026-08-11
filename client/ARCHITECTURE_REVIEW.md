# 🏗️ Loyihaning Arxitektura va Xavfsizlik Tahlili (Architecture & Security Review)

Ushbu hujjat loyihaning mavjud kod bazasini (React/Vite) chuqur tahlil qilish natijasida tayyorlandi. Loyiha dastlab dasturchi tomonidan yozilgan bo'lib, unda bir qator jiddiy xavfsizlik (Security), arxitektura (Architecture), kod sifati (Clean Code) va unumdorlik (Performance) muammolari aniqlandi. 

Quyida ushbu kamchiliklarning to'liq ro'yxati, ularning xavflilik darajasi, sabablari va ularni to'g'rilash bo'yicha **katta dasturchi (Senior Developer)** ko'rsatmalari keltierdigan.

---

## 🗺️ Arxitektura va Ma'lumotlar Oqimi (Mermaid Diagramma)

Mavjud arxitekturadagi muammoli va to'g'rilangan holat o'rtasidagi farq:

```mermaid
graph TD
    subgraph Muammoli (Dasturchi Arxitektura)
        UI[Pages & Components] -- "Har bir faylda fetch()" --> API[Backend API]
        UI -- "JWT va Rolni o'qish" --> LS[localStorage]
        UI -- "VITE_ API keylarni ochiq yuborish" --> Ext[Uchinchi tomon API: TomTom, Weather]
        WS[Socket.IO Client] -- "Autentsiz ulanish" --> WSS[Socket Server]
    end

    subgraph To'g'rilangan (Senior tavsiya etgan)
        NewUI[Pages & Components] --> Client[Centralized API Client / Axios]
        Client --> Cookie[HttpOnly Cookie / Session]
        Client --> Proxy[Backend Proxy]
        Proxy --> API_Sec[Backend API Secure]
        Proxy --> ExtSec[Uchinchi tomon API Secure]
        WSSec[Socket.IO Client with Auth] --> WSS_Sec[Socket Server Secure]
    end
```

---

## 🔴 1. Xavfsizlik Muammolari (Security Issues) - O'ta Muhim

> [!CAUTION]
> Ushbu bo'limdagi kamchiliklar tizimni buzib kirish yoki maxfiy ma'lumotlarni o'g'irlash uchun to'g'ridan-to'g'ri yo'l ochadi. Zudlik bilan tuzatilishi shart!

### 1.1 JWT Tokenning localStorage'da Saqlanishi (XSS zaifligi)
* **Fayl:** `src/context/AuthContext.jsx:11,38`
* **Dasturchi yondashuvi:** Foydalanuvchi tizimga kirganda JWT tokenni va uning rolini `localStorage` ga yozib qo'yadi va sahifa yuklanganda u yerdan o'qiydi.
* **Xavf darajasi:** **O'TA YUQORI (Critical)**
* **Muammo nimada:** Agar ilovada biror bir XSS (Cross-Site Scripting) zaifligi yuzaga kelsa (masalan, inputlar tozalanmasa), tajovuzkor JS orqali `localStorage.getItem('mchs_user')` ni chaqirib, JWT tokenni o'g'irlay oladi. Shuningdek, foydalanuvchi rolining brauzerda saqlanishi uning osongina o'zgartirilishiga (Client-Side Role Spoofing) olib keladi.
* **Qanday tuzatish kerak:** 
  1. JWT tokenni brauzer xotirasida (localStorage/sessionStorage) saqlamang. Tizimga kirganda backend server token yozilgan **HttpOnly** cookieni qaytarishi kerak.
  2. Rolni faqat client-side himoya sifatida ishlating. Server har bir so'rovda tokenni tekshirib, foydalanuvchining roliga muvofiqligini (Authorization) tekshirishi shart.

### 1.2 Socket.IO Ulanishining Autentsizligi (Unauthorized Data Leak)
* **Fayllar:** 
  * [App.jsx](file:///C:/Users/S.Farruhbek/WebstormProjects/secret/client/src/App.jsx#L104) (`const socket = io(SOCKET_URL);`)
  * [HazardsMap.jsx](file:///C:/Users/S.Farruhbek/WebstormProjects/secret/client/src/pages/HazardsMap.jsx#L104)
  * [OperatorDashboard.jsx](file:///C:/Users/S.Farruhbek/WebstormProjects/secret/client/src/pages/OperatorDashboard.jsx#L85)
* **Dasturchi yondashuvi:** Socket.IO ulanishini hech qanday token yubormasdan to'g'ridan-to'g'ri o'rnatadi.
* **Xavf darajasi:** **YUQORI (High)**
* **Muammo nimada:** Istalgan odam (hatto tizimda ro'yxatdan o'tmagan bo'lsa ham) Socket portiga ulanib, real vaqt rejimidagi favqulodda vaziyatlar, datchiklar koordinatalari (`sensor-update`), signallar (`sensor-alarm`) va kameralar ma'lumotlarini tinglab tura oladi.
* **Qanday tuzatish kerak:** Ulanish jarayonida tokenni middleware orqali yuboring:
  ```js
  const socket = io(SOCKET_URL, {
      auth: { token: user?.token }
  });
  ```
  Server-side esa ushbu tokenni tekshirib, keyin ulanishga ruxsat berishi kerak.

### 1.3 `innerHTML` va Dinamik Ma'lumotlardan XSS Xavfi (Stored XSS)
* **Fayllar:** 
  * [useMapInit.js](file:///C:/Users/S.Farruhbek/WebstormProjects/secret/client/src/hooks/useMapInit.js#L254-L264)
  * [HazardsMap.jsx](file:///C:/Users/S.Farruhbek/WebstormProjects/secret/client/src/pages/HazardsMap.jsx#L136)
* **Dasturchi yondashuvi:** Markerlar ustiga bosilganda chiqadigan popup oynalarni yaratishda socket orqali kelgan sensor ma'lumotlarini (`data.temp`, `data.gas_levels`) to'g'ridan-to'g'ri `el.innerHTML` ga string template yordamida birlashtiradi.
* **Xavf darajasi:** **YUQORI (High)**
* **Muammo nimada:** Datchiklar orqali keladigan ma'lumotlar (masalan, qurilma nomi yoki sensor xabari) ichiga zararli `<script>` kodlari joylashtirilsa, ushbu popup ochilganda kod operator brauzerida ishga tushib ketadi (Stored XSS).
* **Qanday tuzatish kerak:** 
  1. HTML yaratishda `innerHTML` ishlatmang. Buning o'rniga xavfsizroq `textContent` yoki `document.createElement()` orqali elementlarni alohida qo'shib chiqing.
  2. Yoki DOMPurify kabi sanitizator kutubxonalardan foydalaning:
     ```js
     import DOMPurify from 'dompurify';
     el.innerHTML = DOMPurify.sanitize(unsafeHTMLString);
     ```

### 1.4 API Kalitlarining Front-end Kodda Ochiq Qolishi (Key Exposure)
* **Fayllar:** 
  * [useMapInit.js](file:///C:/Users/S.Farruhbek/WebstormProjects/secret/client/src/hooks/useMapInit.js#L8-L13)
  * [Dashboard.jsx](file:///C:/Users/S.Farruhbek/WebstormProjects/secret/client/src/pages/Dashboard.jsx#L67) (Weather API query parameter)
* **Dasturchi yondashuvi:** Uchinchi tomon xizmatlarining (MapTiler, TomTom, OpenWeatherMap) API kalitlarini `import.meta.env` orqali o'qib, request URL ichiga joylashtiradi.
* **Xavf darajasi:** **YUQORI (High)**
* **Muammo nimada:** Vite dasturni build qilganda `VITE_` bilan boshlanadigan barcha muhit o'zgaruvchilari (environment variables) JS fayllar ichiga joylanadi. Har qanday foydalanuvchi "Network" oynasi yoki JS bundle orqali bu kalitlarni ko'ra oladi va sizning nomingizdan ishlatib, hisobingizga ortiqcha xarajat keltirishi mumkin.
* **Qanday tuzatish kerak:** Kalitlarni client-side da saqlamang va uchinchi tomon so'rovlarini to'g'ridan-to'g'ri brauzerdan yubormang. Ular uchun o'zingizning backend tizimingizda **Proxy Route** yarating (masalan, `/api/weather` yoki `/api/routing`). Brauzer so'rovni sizning backend'ingizga yuboradi, backend o'zida kalitni qo'shib uchinchi tomonga yuboradi va javobni qaytaradi.

### 1.5 Soxta (Fake) Havfsizlik Sozlamalari (Misleading Security UX)
* **Fayl:** [SettingsPage.jsx](file:///C:/Users/S.Farruhbek/WebstormProjects/secret/client/src/pages/SettingsPage.jsx)
* **Dasturchi yondashuvi:** "Ikki faktorli autentifikatsiya" (2FA) holatini `"ВКЛЮЧЕНО"`, IP manzilni esa `"192.168.1.1"` deb qattiq kodlab (hardcode) yozib qo'ygan. Shuningdek, "Saqlash" tugmasi shunchaki toast chiqaradi, lekin API'ga hech narsa yubormaydi.
* **Xavf darajasi:** **O'RTA (Medium)**
* **Muammo nimada:** Tizim operatori o'zini xavfsiz his qiladi (2FA yoqilgan deb o'ylaydi), lekin aslida bu shunchaki vizual maket.
* **Qanday tuzatish kerak:** Ishlamaydigan havfsizlik sozlamalarini olib tashlang yoki ularni haqiqiy API bilan bog'lang. Soxta ma'lumotlar o'rniga foydalanuvchining haqiqiy sessiya ma'lumotlarini ko'rsating.

### 1.6 Zaif Token Generatsiyasi (Weak Device Token Generation)
* **Fayl:** [DevicesPage.jsx](file:///C:/Users/S.Farruhbek/WebstormProjects/secret/client/src/pages/DevicesPage.jsx#L132)
* **Dasturchi yondashuvi:** Datchiklar uchun token generatsiya qilishda `Math.random().toString(36).substr(2, 8)` dan foydalangan.
* **Xavf darajasi:** **O'RTA (Medium)**
* **Muammo nimada:** `Math.random()` kriptografik jihatdan xavfsiz emas (CSPRNG emas). Uning natijalarini taxmin qilish oson.
* **Qanday tuzatish kerak:** Tokenlarni yoki backend'da generatsiya qiling yoki brauzerda `window.crypto.getRandomValues()` funksiyasidan foydalaning.

---

## 🟠 2. Arxitektura Muammolari (Architecture Debt)

> [!IMPORTANT]
> Loyihada kodning qayta ishlatilishi va modullilik darajasi juda past. Kodni kengaytirish va testlash va texnik qo'llab-quvvatlash juda qiyin.

### 2.1 "getAuthHeader()" Funksiyasining 8 Joyda Takrorlanishi (DRY buzilishi)
* **Muammo nimada:** JWT tokenni `localStorage` dan o'qib olib headerga qo'shadigan funksiya 8 dan ortiq faylda aynan bir xil qilib ko'chirib yozilgan (Copy-Paste). Ba'zi joylarda `try-catch` bor, ba'zilarida yo'q (masalan, `OperatorsPage.jsx:20` va `OrganizationsPage.jsx:21`). Agar localStorage buzilsa yoki JSON struktura noto'g'ri bo'lsa, butun sahifa crash bo'ladi.
* **Qanday tuzatish kerak:** Yagona `api.js` yoki `httpClient.js` yarating va barcha so'rovlarni u orqali yuboring. Headerlarni o'sha yerda bir marta sozlang.

### 2.2 Markazlashtirilgan API Client ning Yo'qligi
* **Muammo nimada:** Loyihaning deyarli har bir sahifasida (`Dashboard.jsx`, `DevicesPage.jsx`, `IncidentsPage.jsx` va h.k.) to'g'ridan-to'g'ri `fetch("${API_URL}/...")` yozilgan. Tizimda xatoliklarni global qayta ishlash (interceptor), token eskirganda uni yangilash (Token Refresh) yoki tarmoq xatolarini ushlash imkoniyati yo'q.
* **Qanday tuzatish kerak:** Axios yoki fetch wrapper yordamida markaziy API client yarating.

### 2.3 "God Components" va "God Hooks" (Ulkan fayllar)
* **Muammoli fayllar:**
  1. [useMapInit.js](file:///C:/Users/S.Farruhbek/WebstormProjects/secret/client/src/hooks/useMapInit.js) (574 qator) - Xarita sozlamalari, datchiklar, binolar, socketlar, 3D binolar, tirbandliklar hammasi bir joyda.
  2. [HazardsMap.jsx](file:///C:/Users/S.Farruhbek/WebstormProjects/secret/client/src/pages/HazardsMap.jsx) (531 qator) - Xarita renderi, socketlar, CRUD va ichidagi 126 qatorlik inline `<style>`.
* **Muammo nimada:** SRP (Single Responsibility Principle) buzilgan. Bunday katta fayllarni o'qish, ulardagi xatolarni tuzatish va yangi funksional qo'shish juda ko'p vaqt oladi.
* **Qanday tuzatish kerak:** Har bir funksiyani alohida kichik hook yoki komponentlarga ajrating. Masalan, `useMapInit` ni:
  * `useMapMarkers` (markerlarni boshqarish)
  * `useMapLayers` (3D va tirbandlik qatlamlari)
  * `useSensorSockets` (socketlarni tinglash) kabi qismlarga bo'ling.

### 2.4 Error Boundary (Xatolik chegaralari) Mavjud Emasligi
* **Muammo nimada:** Loyihada birorta ham `ErrorBoundary` yo'q. Masalan, MapLibre xaritasi yuklanayotganda kutilmagan JS xatoligi bo'lsa, foydalanuvchi butunlay oppoq sahifani ko'radi (butun React app qulab tushadi).
* **Qanday tuzatish kerak:** Muhim sahifalar va xaritalarni `<ErrorBoundary>` bilan o'rab chiqing, shunda xatolik bo'lsa, tizim butunlay o'chib qolmaydi, balki "Xarita yuklanmadi, qayta urinib ko'ring" degan chiroyli xabar chiqadi.

---

## 🟡 3. Unumdorlik va Kod Sifati (Performance & Code Quality)

### 3.1 Har Sekundda Dashboardning To'liq Re-render Bo'lishi (CPU yuklanishi)
* **Fayl:** [Dashboard.jsx](file:///C:/Users/S.Farruhbek/WebstormProjects/secret/client/src/pages/Dashboard.jsx)
* **Dasturchi yondashuvi:** Soatni ko'rsatish uchun har 1 soniyada `setInterval` orqali state'ni yangilaydi.
* **Muammo nimada:** Soat yangilanganda butun `Dashboard` komponenti boshidan render bo'ladi. Uning ichidagi barcha chartlar, jadvallar va kartalar (agar memoization qilinmagan bo'lsa) har sekundda qayta hisoblanadi. Bu foydalanuvchi kompyuteri va telefonini sekinlashtiradi, batareyani tez tugatadi.
* **Qanday tuzatish kerak:** Soatni alohida kichik `<ClockWidget />` komponentiga chiqaring. Shunda faqat soatning o'zi re-render bo'ladi, butun dashboard emas.

### 3.2 Markerlarning Har Safar O'chirib Qayta Yaratilishi (Lagging Map)
* **Fayl:** [useMapIncidents.js](file:///C:/Users/S.Farruhbek/WebstormProjects/secret/client/src/hooks/useMapIncidents.js#L134-L138)
* **Dasturchi yondashuvi:** Incident'lar massivi o'zgarganda xaritadagi barcha markerlarni `marker.remove()` qilib tashlab, keyin boshidan `incidents.forEach(addIncidentMarker)` qilib yaratadi.
* **Muammo nimada:** Agar xaritada 100 ta incident bo'lsa va yana 1 tasi qo'shilsa, tizim mavjud 100 ta markerni o'chirib, 101 tasini noldan chizadi. DOM operatsiyalari juda qimmat bo'lgani sabab xarita qotib qoladi (lag bo'ladi).
* **Qanday tuzatish kerak:** Markerlarni solishtiradigan (diff) algoritmdan foydalaning (xuddi `useMapInit.js:223` dagi binolar kabi). Faqat yangi qo'shilganini chizib, o'chirilganini o'chirish kerak.

### 3.3 Derived State Anti-pattern (Keraksiz State)
* **Fayl:** [ReportsPage.jsx](file:///C:/Users/S.Farruhbek/WebstormProjects/secret/client/src/pages/ReportsPage.jsx#L73-L92)
* * Dasturchi yondashuvi:** Filtrlangan ma'lumotlarni saqlash uchun alohida `filteredData` degan state yaratgan va har safar filtr o'zgarganda `useEffect` yordamida state'ni yangilaydi.
* **Muammo nimada:** Bu React dasturlashda eng ko'p uchraydigan xatolardan biridir. Filtr o'zgaradi -> render bo'ladi -> useEffect ishga tushadi -> state o'zgaradi -> yana render bo'ladi. Ya'ni bitta operatsiya uchun 2 marta to'liq render aylanishi sodir bo'ladi.
* **Qanday tuzatish kerak:** `useState` + `useEffect` o'rniga `useMemo` ishlating:
  ```js
  const filteredData = useMemo(() => {
      return data.filter(item => ...);
  }, [data, filter]);
  ```

---

## 🛠️ Dasturchi Uchun Bosqichma-bosqich Tuzatish Yo'riqnomasi (Step-by-Step Refactoring Plan)

Dasturchi loyihani to'g'ri va xavfsiz holatga keltirishi uchun quyidagi qadamlarni bajarishi kerak:

### 1-qadam: API Client va Markaziy Auth yaratish
1. `src/utils/api.js` faylini yarating.
2. Unda JWT tokenni cookie'dan (yoki vaqtinchalik xavfsiz xotiradan) oladigan va fetch so'rovlarini bajaradigan yagona wrapper yarating.
3. Barcha sahifalardagi `getAuthHeader` takrorlanishlarini o'chirib, ushbu markaziy client'ga o'ting.

### 2-qadam: API Kalitlarini yashirish
1. Backend jamoasi bilan bog'laning va TomTom hamda Weather API uchun backend'da proxy route yozishlarini so'rang (masalan: `/api/v1/weather`).
2. Client-side koddan barcha uchinchi tomon API kalitlarini (MapTiler keyidan tashqari, chunki u faqat vector layer renderi uchun kerak) o'chiring.

### 3-qadam: Socket Autentifikatsiyasi
1. Socket ulanish jarayonida token yuborishni yo'lga qo'ying.
2. Socket ulanishlarni `useEffect` ichida keraksiz renderlar o'zgarganda o'chib-yonmaydigan qilib to'g'rilang.

### 4-qadam: Soat va Kichik Widgetlarni ajratish
1. Dashboard ichidagi `setInterval` soatini o'chiring.
2. `src/components/widgets/Clock.jsx` yarating, soat statini faqat shu yerda saqlang va Dashboard'ga import qiling.

### 5-qadam: Xavfsiz HTML (XSS oldini olish)
1. `innerHTML` yozilgan qatorlarni topib, ularni o'rniga `DOMPurify` ishlating yoki elementlarni qo'lda DOM API yordamida (`document.createElement`) xavfsiz yarating.

---

> [!NOTE]
> Ushbu o'zgarishlar loyihani nafaqat xavfsiz qiladi, balki kodning kelajakda oson kengayishi va tez ishlashini (performance) ta'minlaydi.
