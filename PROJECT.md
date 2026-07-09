# PROJECT.md -- Sklad FIFO / FEFO

## O projekte

Interný skladový systém zameraný na správu zásob podľa princípov
FEFO/FIFO. Projekt je určený na každodenné používanie vo firme a je
navrhnutý ako PWA aplikácia.

------------------------------------------------------------------------

# Technológie

## Frontend

-   React
-   Vite
-   Tailwind CSS

## Backend

-   Supabase

------------------------------------------------------------------------

# Hlavé moduly

-   Dashboard
-   Predaj
-   Sklad
-   Naskladnenie
-   Produkty
-   Zákazníci
-   História

------------------------------------------------------------------------

# Databáza (hlavné tabuľky)

-   produkty
-   zasoby
-   sklady
-   zakaznici
-   predajky
-   predajky_polozky
-   predajky_drafty
-   predajky_draft_polozky

------------------------------------------------------------------------

# Architektúra

src/ - app/ - components/ - pages/ - services/ - utils/

Komponenty sa postupne refaktorujú tak, aby každá stránka mala vlastný
priečinok s menšími komponentmi.

------------------------------------------------------------------------

# Pravidlá projektu

-   Nové funkcie zapisovať do ROADMAP.md
-   Väčšie zmeny dokumentovať v PROJECT.md
-   Pri dokončení významnej funkcie zvýšiť verziu projektu
-   Pred každým refactoringom overiť `npm run build`

------------------------------------------------------------------------

# Aktuálny cieľ

Dokončiť refactoring všetkých hlavných modulov a následne pokračovať vo
vývoji verzie 1.1 podľa ROADMAP.md.
