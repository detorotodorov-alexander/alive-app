# Alive v2: timeline + pipeline (archivado)

Snapshot de la app antes de empezar la v3. Es una copia exacta: se abre sirviendo esta carpeta (`python -m http.server`) y entrando en `index.html`.

## Qué incluye
- **Pantalla principal:** título arriba, red de recuerdos grande al centro, barra de tareas abajo (Memories | grabar | Web/Timeline).
- **Timeline:** línea vertical, puntos clave en colores por tipo (Mood, People, Plan, Work) y tres tamaños por importancia.
- **Memories:** las tarjetas en una hoja que se abre desde la barra; el lector con audio y transcripción palabra a palabra.
- **Pipeline de texto** (`pipeline.js`, ver `PIPELINE.md`): puerta de 10 s / 12 palabras, extracción solo de lo explícito con cita literal,
  verificación por código, búsqueda del pasado y enlaces con cita de las dos entradas. Sin resumen inventado.
- **Embeddings** (`api/embed.js`): búsqueda del pasado por significado (OpenAI text-embedding-3-small, 256 dimensiones).
- **Servidor** (`api/`): funciones de Vercel que guardan las claves y reenvían a OpenAI y GitHub.
- **Datos:** GitHub como base de datos (`entries/`, `audio/`) a través del servidor.

## Estado
- Las 2 últimas piezas (pipeline y embeddings) están solo en local, **no publicadas** cuando se archivó.
- `config.js` no tiene claves; `apiURL` apunta al servidor de Vercel (`https://alive-app-6e.vercel.app/api`), que es el que las guarda.

## Cómo volver a esta versión
`git checkout v2-archive -- .` desde la raíz, o copiar esta carpeta encima de la raíz.
