# Chemical Compounds Manager

Aplicación full-stack para gestión de compuestos químicos en análisis cromatográfico. Construida con Next.js 14 (App Router), Supabase, TypeScript y Tailwind CSS. Lista para deploy en Vercel.

## Características

- **Lista de Compuestos** — tabla Excel-like con edición inline, validación visual de fórmulas químicas, búsqueda por nombre o CN, paginación 50/página y borrado con confirmación.
- **Generar Tabla** — pegás una lista de nombres, el sistema hace fuzzy matching con Fuse.js contra la base, y exportás a Excel con formato Palatino Linotype 10 listo para reportes.
- Auth via Supabase email/password con SSR + middleware de protección.
- Atomic constants cacheadas en cliente (Zustand) con un único fetch al cargar la app.
- Mobile-responsive, animaciones sutiles, toasts con Sonner, dialogs con Radix.

---

## Stack

- **Next.js 14** (App Router, Server Components, Server Actions)
- **TypeScript** estricto
- **Supabase** (`@supabase/ssr` + `@supabase/supabase-js`)
- **TanStack Table** (lógica) + tablas custom para máximo control de UX
- **Tailwind CSS** + **shadcn/ui** style primitives
- **Fuse.js** para fuzzy matching
- **ExcelJS** para exportación XLSX con fuente custom
- **Sonner** para toasts
- **Zustand** para constantes atómicas

---

## Setup

### 1. Clonar e instalar

```bash
git clone <tu-repo-url>.git chemical-compounds
cd chemical-compounds
npm install
```

### 2. Variables de entorno

Crear `.env.local` en la raíz del proyecto con:

```
NEXT_PUBLIC_SUPABASE_URL=https://hajpuqkqwhadmfaluubu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<tu_anon_key>
```

> Si solo querés ver la forma del archivo sin valores, usá `.env.example`.

### 3. Setup Supabase

1. En tu proyecto Supabase, abrí el **SQL Editor**.
2. Pegá y ejecutá el contenido de `scripts/seed.sql` — crea las tablas `compounds` y `atomic_constants`, RLS policies y la columna generada `type`.
3. En **Authentication → Users**, creá tu usuario (email + password). Es un sistema de un solo usuario — no hay registro público.
4. Importá tus 300 compuestos vía **Table Editor → compounds → Insert from CSV**, con columnas:

   ```
   compound, rir, cf, c_count, h_count, o_count, mm_da
   ```

   Ejemplo:

   ```
   Ethyl ether,529,C4H10O,4,10,1,74.07
   Ethyl acetate,606,C4H8O2,4,8,2,88.05
   Hexane <n->,623,C6H14,6,14,0,86.11
   ```

   La columna `type` se calcula sola — no la incluyas en el CSV.

### 4. Correr en desarrollo

```bash
npm run dev
```

Abrí <http://localhost:3000>. Te redirige a `/login`.

---

## Deploy en Vercel

1. Pusheá el repo a GitHub.
2. En Vercel, **New Project → Import**.
3. Setear las variables de entorno (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
4. **Deploy**. Vercel detecta Next.js y arma todo solo.

Allowed Origins en Supabase: agregá la URL de Vercel (`https://tu-proyecto.vercel.app`) en **Authentication → URL Configuration**.

---

## Estructura

```
app/
  login/page.tsx              ← login con Supabase auth
  dashboard/
    layout.tsx                ← guard de auth + sidebar
    compounds/page.tsx        ← lista editable
    generate/page.tsx         ← generador con Excel export
components/
  ui/                         ← Button, Input, Card, Dialog, Toaster, Skeleton
  navbar/Sidebar.tsx          ← sidebar con logout
  providers/ConstantsProvider ← carga atomic_constants una vez
  compounds/CompoundsTable.tsx
  generate/
    GenerateTable.tsx
    CompoundSearchCell.tsx    ← autocomplete fuzzy
    ExportButton.tsx          ← ExcelJS export
lib/
  supabase/{client,server,middleware,types}.ts
  chemistry.ts                ← parseCF, calculateType, calculateMM, validateCFField
  fuzzyMatch.ts               ← Fuse.js wrapper + normalización
  store.ts                    ← Zustand atomic constants
  utils.ts                    ← cn, formatDate, debounce
middleware.ts                 ← refresh de sesión + protección de rutas
scripts/seed.sql              ← schema + RLS + atomic constants seed
```

---

## Notas técnicas

- **`type` es columna generada en Postgres** — nunca la incluyas en INSERT/UPDATE; se lee de vuelta automáticamente.
- **Fuzzy matching** se hace **client-side** con Fuse.js. Los compuestos se cargan una sola vez al entrar a la pantalla `/dashboard/generate`. Soporta variaciones comunes: angle brackets `<1,8->`, alfa/beta/gamma/delta escritos en letra, hyphens y espacios.
- **Validación visual** en `/dashboard/compounds`: si editás manualmente C/H/O/Type/MM y el valor no coincide con lo derivado del CF, la celda se pinta roja. La columna `Val2` en la pantalla de generación se pinta roja si la diferencia con el RIR siguiente es negativa.
- **ExcelJS vs SheetJS**: usamos ExcelJS porque soporta `font.name` (necesario para Palatino Linotype 10).

---

## Scripts

| Script | Qué hace |
| ------ | -------- |
| `npm run dev` | Servidor dev en puerto 3000 |
| `npm run build` | Build de producción |
| `npm run start` | Servidor de producción |
| `npm run lint` | ESLint |
| `npm run type-check` | TypeScript sin emitir |

---

## Roadmap / TODO

- [ ] Agregar undo/redo en la tabla de compuestos.
- [ ] Bulk edit (seleccionar varias filas).
- [ ] Histórico de cambios por compuesto.
