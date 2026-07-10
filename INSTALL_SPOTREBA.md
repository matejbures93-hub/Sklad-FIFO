# Inštalácia modulu Spotreba

1. V Supabase SQL editore spusti `supabase/spotreba_migration.sql`.
2. Skopíruj súbory zo ZIP balíka so zachovaním ciest.
3. Pozor: používané menu je `src/components/TopMenu.jsx`; `components/BottomNav.jsx` ostáva mimo `src` podľa aktuálnej štruktúry.
4. Spusti `npm run build`.
5. Ak build prejde:

```bash
git add src/app/App.jsx src/components/TopMenu.jsx src/modules/spotreba components/BottomNav.jsx supabase/spotreba_migration.sql
git commit -m "Pridat modul Spotreba"
git push
```
