# Lumen

Taller para crear regalos (universo en el cielo, pedir cita). Los documentos, fotos y audios viven en Supabase.

```bash
npm install
cp .env.example .env
npm run dev
```

Se abre en `http://localhost:5180`.

- `.env` lleva `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
- `supabase/schema.sql` hay que pegarlo en el editor SQL del proyecto.
- `/p/:id` es el borrador. `/u/:enlace` es el regalo publicado.

## GitHub Pages

Cada push a `main` publica en:

https://diego-avz.github.io/Lumen/

El build de Pages lee `.env.production` (URL y clave anónima de Supabase; esa clave es pública a propósito).

Settings → Pages → Source: **GitHub Actions**.

## Google y Supabase (para que el login funcione en ese enlace)

Google Cloud → APIs y servicios → Credenciales → tu cliente OAuth:

- **Orígenes de JavaScript autorizados**
  - `http://localhost:5180`
  - `https://diego-avz.github.io`
- **URIs de redirección autorizados** (sigue siendo el callback de Supabase, no GitHub)
  - `https://lylyitfvuohrdzhqfnyv.supabase.co/auth/v1/callback`

Supabase → Authentication → URL Configuration:

- **Site URL:** `https://diego-avz.github.io/Lumen`
- **Redirect URLs** (además de localhost):
  - `http://localhost:5180/**`
  - `https://diego-avz.github.io/Lumen/**`

Nada más hace falta en Storage: el bucket `fotos` ya es público; el origen nuevo solo afecta a Auth/OAuth.
