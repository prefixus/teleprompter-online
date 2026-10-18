# 🎬 Teleprompter Online

Lekki, responsywny i profesjonalny teleprompter webowy stworzony do pracy na smartfonach (iOS, Android), tabletach oraz komputerach. Idealny do nagrywania wideo, podcastów, wystąpień i rolek na YouTube / TikTok.

Działa bezpośrednio w przeglądarce bez konieczności instalowania czegokolwiek oraz bez skomplikowanego backendu.

🔗 **Adres aplikacji na GitHub Pages**: [https://prefixus.github.io/teleprompter-online/](https://prefixus.github.io/teleprompter-online/)

---

## ✨ Główne funkcje

* **🪞 Odbicie lustrzane w pionie i poziomie (Mirror Modes)**:
  * Brak odbicia (normalny tekst)
  * **Odbicie poziome (H-Flip)** – do teleprompterów ze szkłem 45°
  * Odbicie pionowe (V-Flip)
  * Odwrócenie o 180° (Poziome + Pionowe)
* **⚡ Płynny silnik przewijania**:
  * Oparty o `requestAnimationFrame` z precyzją co do piksela na sekundę (bez klatkowania na ekranach 60Hz i 120Hz ProMotion).
  * Regulacja prędkości suwakiem, przyciskami +/- oraz presetami (*Wolno, Standard, Szybko, Ekspres*).
* **📱 Blokada wygaszania ekranu (Screen Wake Lock API)**:
  * Ekran Twojego iPhone'a lub telefonu z Androidem nie zgaśnie w trakcie nagrania.
* **📂 Wgrywanie i edycja plików**:
  * Obsługa plików tekstowych `.txt` i `.md` (Markdown) przez przycisk lub przeciągnięcie i upuszczenie (Drag & Drop).
  * Wbudowany edytor z licznikiem słów, znaków i szacowanym czasem czytania (~130 słów/min).
  * Zarządzanie wieloma skryptami w lokalnej pamięci (tworzenie, duplikowanie, usuwanie, pobieranie).
* **📲 Błyskawiczny transfer na telefon kodem QR**:
  * Pisz tekst na komputerze, kliknij **Telefon / QR** i skieruj aparat telefonu na ekran – skrypt natychmiast otworzy się na smartfonie bez konieczności logowania!
* **🖤 Czerń OLED (`#000000`)**:
  * Brak jakichkolwiek rozbłysków światła na szkle telepromptera.
* **🎯 Ergonomia dla twórców**:
  * Wskaźnik linii wzroku (Eyeline guide) – pomaga utrzymać kontakt wzrokowy z obiektywem.
  * Odliczanie 3.. 2.. 1.. przed rozpoczęciem przewijania.
  * Dotknięcie ekranu w dowolnym miejscu = Start / Pauza.
  * Ręczna korekta pozycji tekstu palcem w trakcie pauzy.
  * Autoukrywanie paska narzędzi (HUD) podczas czytania.

---

## ⌨️ Skróty klawiszowe

| Klawisz | Akcja |
| :--- | :--- |
| **Spacja** / Kliknięcie | Start / Pauza przewijania |
| **↑** / **↓** | Zwiększenie / Zmniejszenie prędkości |
| **←** / **→** | Zmniejszenie / Zwiększenie czcionki |
| **R** | Reset tekstu na początek (Restart) |
| **M** | Szybkie odwrócenie lustrzane (H-Flip) |
| **F** | Tryb pełnoekranowy (Fullscreen) |
| **Esc** | Zakończenie pracy telepromptera / Zamknięcie okna |

---

## 📲 Jak dodać aplikację do ekranu telefonu (PWA / Pełny ekran)

Aplikacja posiada plik manifestu PWA, dzięki czemu możesz używać jej bez pasków przeglądarki:

### Na iPhone (iOS / Safari):
1. Otwórz stronę w Safari.
2. Kliknij ikonę **Udostępnij** (kwadrat ze strzałką w górę na dole ekranu).
3. Wybierz opcję **„Do ekranu początkowego”** (Add to Home Screen).
4. Kliknij **Dodaj**. Aplikacja otworzy się na pełnym ekranie jak natywna apka!

### Na telefonie z Androidem (Chrome):
1. Otwórz stronę w Chrome.
2. Kliknij menu z trzema kropkami w prawym górnym rogu.
3. Wybierz **„Zainstaluj aplikację”** lub **„Dodaj do ekranu głównego”**.

---

## 🚀 Uruchomienie lokalne (do testów)

Nie potrzebujesz instalować żadnych paczek `npm`. Wystarczy uruchomić prosty serwer HTTP:

```bash
# Używając Pythona 3:
python3 -m http.server 8080

# Lub npx:
npx serve .
```

Następnie otwórz w przeglądarce adres: `http://localhost:8080`.

---

## ☁️ Wdrożenie na GitHub Pages

Repozytorium jest skonfigurowane do automatycznego hostingu:
1. W ustawieniach repozytorium GitHub przejdź do: **Settings** -> **Pages**.
2. W sekcji **Build and deployment**:
   * **Source**: `Deploy from a branch`
   * **Branch**: `main`, Folder: `/ (root)`
3. Kliknij **Save**. Strona będzie aktywna pod adresem:
   `https://prefixus.github.io/teleprompter-online/`
