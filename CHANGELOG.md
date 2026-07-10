# CHANGELOG

Všetky významné zmeny projektu sa zapisujú sem.

Formát vychádza z princípu *Keep a Changelog*.

------------------------------------------------------------------------
## v0.9.0

### 🚀 Veľký refactoring modulu Predaj

- Predaj rozdelený na komponenty
- Zavedené React Hooks
- Zavedené Service Layer
- Zavedené Utils
- Rezervácie presunuté do samostatnej služby
- Drafty presunuté do samostatnej služby
- Skladová logika oddelená
- Predaj oddelený do salesService
- Predaj.jsx zmenšený z ~1000 na ~140 riadkov


## [v1.0.4] - 2026-07-09

### Changed
- Refactoring PWA aktualizácií.
- Pridané manuálne tlačidlo na kontrolu aktualizácie.

## \[v1.0.3\] - 2026-07-09

### Added

-   Refactoring modulu Predaj na komponenty.
-   `predajUtils.js`.
-   Dokumentácia projektu (`ROADMAP.md`, `PROJECT.md`).

### Changed

-   Zlepšená štruktúra kódu modulu Predaj.

------------------------------------------------------------------------

## \[v1.0.2\] - 2026-07-09

### Added

-   Rozpracované predajky.
-   Ukladanie draftov do databázy.
-   Načítanie a mazanie rozpracovaných predajok.

------------------------------------------------------------------------

## \[v1.0.1\] - 2026-07-09

### Added

-   Ručný výber šarže.
-   Predaj expirovaných produktov iba zákazníkom s oprávnením.

### Changed

-   Vylepšená FEFO logika.
-   Automatický výber preferuje jednu neexpirovanú šaržu.

------------------------------------------------------------------------

## \[v1.0.0\]

### Initial release

-   Prihlásenie
-   Produkty
-   Naskladnenie
-   Sklad
-   História
-   Predaj
-   Dashboard
-   PWA
