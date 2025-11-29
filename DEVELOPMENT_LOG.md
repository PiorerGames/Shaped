# Dziennik Rozwoju - Aplikacja Shaped Fitness

## Dzień 1 - 10 listopada 2025

Rozpoczęcie projektu od skonfigurowania środowiska Expo React Native i zainicjowania podstawowej struktury projektu. Utworzenie systemu nawigacji wykorzystującego Expo Router z układem zakładkowym dla głównych ekranów. Skonfigurowanie TypeScript i ESLint, aby utrzymać jakość kodu przez cały czas rozwoju aplikacji.

## Dzień 2 - 11 listopada 2025

Zintegrowanie Appwrite jako serwisu backendowego do obsługi uwierzytelniania i zarządzania bazą danych. Skonfigurowanie przepływu uwierzytelniania z logowaniem i rejestracją przy użyciu email/hasło, włączając obsługę nazw użytkowników dla łatwiejszego dostępu. Utworzenie kontekstu uwierzytelniania do zarządzania sesjami użytkowników w całej aplikacji.

## Dzień 3 - 12 listopada 2025

Zaprojektowanie i zaimplementowanie schematu bazy danych z tabelami dla profili użytkowników, pomiarów, śledzenia posiłków i danych treningowych. Skonfigurowanie kolekcji bazy danych Appwrite z odpowiednimi uprawnieniami i relacjami między tabelami. Udokumentowanie kompletnej struktury bazy danych w pliku DATABASE_SETUP.md dla przyszłych odniesień i współpracy zespołowej.

## Dzień 4 - 13 listopada 2025

Zbudowanie funkcji śledzenia pomiarów pozwalającej użytkownikom rejestrować wagę ciała, wzrost, procent tkanki tłuszczowej i masę mięśniową. Zaimplementowanie widoku historii pomiarów z filtrowaniem dat i możliwościami sortowania. Utworzenie komponentu AddMeasurementModal z walidacją formularza i obsługą konwersji jednostek.

## Dzień 5 - 14 listopada 2025

Opracowanie systemu śledzenia posiłków z integracją z API OpenFoodFacts do wyszukiwania danych odżywczych. Zaimplementowanie funkcjonalności skanowania kodów kreskowych za pomocą expo-camera, aby szybko dodawać produkty spożywcze. Utworzenie funkcji wprowadzania niestandardowych posiłków dla produktów nieznalezionych w bazie danych.

## Dzień 6 - 15 listopada 2025

Zbudowanie systemu tworzenia i zarządzania treningami z obsługą niestandardowych szablonów ćwiczeń. Zaimplementowanie przeglądarki ćwiczeń z filtrowaniem według grup mięśniowych i typów sprzętu. Utworzenie śledzenia historii treningów do rejestrowania ukończonych treningów z seriami, powtórzeniami i progresją obciążenia.

## Dzień 7 - 16 listopada 2025

Zintegrowanie API ExerciseDB, aby zapewnić kompleksową bazę danych ćwiczeń z animowanymi demonstracjami. Zaimplementowanie widoku szczegółów ćwiczeń pokazującego prawidłową formę, docelowe mięśnie i potrzebny sprzęt. Dodanie funkcjonalności wyszukiwania i filtrowania, aby pomóc użytkownikom szybko znaleźć konkretne ćwiczenia.

## Dzień 8 - 17 listopada 2025

Utworzenie ekranu wykonywania treningu z śledzeniem na żywo serii, powtórzeń i timerów odpoczynku. Zaimplementowanie funkcji rejestrowania cardio do śledzenia biegania, jazdy na rowerze i innych aktywności aerobowych. Dodanie statystyk treningowych i wizualizacji postępów, aby motywować użytkowników.

## Dzień 9 - 18 listopada 2025

Opracowanie kanału aktywności pokazującego najnowsze treningi, posiłki i pomiary użytkownika w porządku chronologicznym. Zaimplementowanie agregacji danych do obliczania dziennych sum odżywczych i tygodniowych podsumowań treningów. Utworzenie wizualnych wskaźników osiągnięć celów i kamieni milowych postępu.

## Dzień 10 - 19 listopada 2025

Zbudowanie początkowego ekranu ustawień z zarządzaniem profilem użytkownika i preferencjami aplikacji. Zaimplementowanie obsługi wyboru języka (polski i angielski) z integracją i18n. Dodanie preferencji powiadomień dla przypomnień o treningach i alertów o osiągnięciach.

## Dzień 11 - 20 listopada 2025

Zaimplementowanie systemu wizualizacji pomiarów używającego react-native-svg-charts do responsywnych wykresów. Utworzenie proporcjonalnego do czasu wykreślania danych, aby dokładnie przedstawić trendy pomiarów na przestrzeni tygodni i miesięcy. Naprawienie problemów z pozycjonowaniem etykiet, aby zapobiec obcinaniu i nakładaniu się tekstu.

## Dzień 12 - 21 listopada 2025

Zaprojektowanie i zaimplementowanie systemu motywu ciemnego używającego możliwości themingowych React Native Paper. Utworzenie kontekstu motywu do zarządzania stanem motywu w całej aplikacji. Dodanie przełącznika motywu w ustawieniach z wizualnym podglądem schematów kolorów.

## Dzień 13 - 22 listopada 2025

Rozszerzenie systemu motywów, aby obsługiwać tryb jasny, tryb wysokiego kontrastu i automatyczne przełączanie motywu oparte na systemie. Zaktualizowanie wszystkich komponentów modalnych (AddMealModal, CreateWorkoutModal, StartWorkoutModal), aby były w pełni świadome motywu. Zapewnienie odpowiednich współczynników kontrastu dla zgodności z dostępnością.

## Dzień 14 - 23 listopada 2025

Zaimplementowanie trwałości bazy danych dla preferencji motywu użytkownika poprzez dodanie kolumny theme_mode do tabeli user_settings. Utworzenie automatycznego ładowania motywu przy starcie aplikacji, aby przywrócić preferowany wygląd użytkownika. Naprawienie problemów z propagacją motywu w PaperProvider, aby zapewnić spójne stylowanie w zagnieżdżonych komponentach.

## Dzień 15 - 24 listopada 2025

Dopracowanie wszystkich komponentów TextInput w aplikacji, aby prawidłowo reagowały na zmiany motywu z poprawnymi kolorami tekstu, kolorami obramowania i stylowaniem placeholderów. Zaktualizowanie przycisków gradientowych, aby używały kolorów podstawowych motywu zamiast wartości zakodowanych na stałe. Przetestowanie przełączania motywu we wszystkich ekranach, aby zapewnić płynne przejścia.

## Dzień 16 - 25 listopada 2025

Utworzenie komponentu UserSettingsLoader do automatycznego ładowania preferencji użytkownika (motyw i jednostki) podczas logowania. Zintegrowanie preferencji systemu jednostek (metryczny vs imperialny) dla pomiarów wagi, wzrostu i odległości w całej aplikacji. Dodanie logiki konwersji do bezproblemowego przełączania między systemami jednostek.

## Dzień 17 - 26 listopada 2025

Zajęcie się problemami trwałości sesji w Expo Go poprzez zbadanie mechanizmów uwierzytelniania Appwrite. Odkrycie ograniczeń związanych z przechowywaniem sesji opartych na przeglądarce w sandboxowym środowisku Expo Go. Udokumentowanie potrzeby kompilacji deweloperskich, aby osiągnąć niezawodną trwałość sesji.

## Dzień 18 - 27 listopada 2025

Zaimplementowanie systemu znaczników sesji opartego na AsyncStorage jako obejście ograniczeń trwałości sesji w Expo Go. Dodanie sprawdzania sesji podczas inicjalizacji aplikacji, aby automatycznie przywracać stan uwierzytelniania użytkownika. Przetestowanie kompletnego przepływu uwierzytelniania, włączając logowanie, wylogowanie i scenariusze ponownego ładowania aplikacji, aby zapewnić niezawodne doświadczenie użytkownika.
