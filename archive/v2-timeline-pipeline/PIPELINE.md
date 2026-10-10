# Pipeline de texto de Alive

## El problema

El modelo veía la entrada nueva **y todo el historial**, con la instrucción de "encontrar patrones". Sin nada que lo frenara, ve patrones donde
no los hay y se inventa un resumen cálido. Medido con el método anterior sobre la misma entrada:

| Entrada | Lo que escribía el método anterior |
|---|---|
| "Hoy ha hecho buen tiempo, he salido a dar una vuelta, he comprado fruta… Un día normal." | "…un buen contraste con los **momentos de ansiedad y presión** que has sentido en las últimas semanas, **especialmente antes de la entrega del TFG**." (nada de eso se dijo hoy) |
| "Hoy me he sentido raro. No ha pasado nada en concreto." | "…como hace **tres días cuando hablaste con Lucía** y sentiste que solo existías entre entregas." (no hay ninguna relación explícita) |

## La regla

**El modelo solo puede señalar cosas que la persona dijo, y el código lo comprueba.** Nada de prosa libre sobre la persona.

```
transcripción ─► 1 puerta ─► 2 extraer (solo lo explícito) ─► 3 verificar ─► ¿hay algo? ─► 4 buscar pasado ─► 5 conectar ─► verificar
                  │                                                              │ no
                  └ nota corta: se guarda tal cual                               └ no se muestra nada, no se inventa nada
```

1. **Puerta** (código). Menos de 10 s o menos de 12 palabras = *nota*: se transcribe y se guarda, **no se resume** ni se analiza.
2. **Extraer** (1 llamada al modelo). Solo puede devolver cosas que la persona *dice explícitamente*: un compromiso, una emoción sobre algo
   concreto, un hecho, un problema, un logro, una decisión. Cada una con una **cita literal**. Charla y descripción neutra no cuentan.
3. **Verificar** (código, no el modelo). Toda cita tiene que aparecer en la transcripción como una tirada de palabras seguidas; el punto
   resumido no puede traer palabras que la transcripción no sustente (y tiene que estar en el mismo idioma); toda etiqueta tiene que aparecer
   en el texto. Lo que no pasa se descarta. Las "misiones" salen solo de compromisos verificados.
   Si no queda nada → **no se muestra nada** ("Nothing explicit to highlight in this one").
4. **Buscar pasado** (código). Solo las entradas que comparten una persona, un proyecto o un evento, o varias palabras significativas.
   Sin candidatas, no hay ecos. El modelo **nunca** ve todo el historial, solo hasta 6 candidatas.
5. **Conectar** (1 llamada). Un enlace necesita una **cita literal de las dos entradas** (verificada por código) y una relación:
   *repeats / follows_up / progress / contradicts*. No hay texto en medio: la pantalla muestra lo que dijiste entonces y lo que dices hoy.
   Puede añadir **una pregunta**, que tiene que citar tus palabras entre « » y acabar en «?» (verificado). La filosofía de la app
   (vivir de verdad frente a solo existir) se usa **solo como criterio para elegir de qué palabras tuyas preguntar**, nunca como afirmación.

El resumen abstracto desaparece: lo que ves son los puntos extraídos, cada uno respaldado por una cita.

## Resultados (modelo real, `gpt-4o-mini`, historial de demo de 18 entradas)

| Caso | Resultado |
|---|---|
| Nota de 6 s | No se llama al modelo. Se guarda tal cual. |
| Charla sin nada relevante | 1 llamada, **0 puntos, 0 ecos**. No se añade nada. |
| Explícito (Jordi, borrador, miedo, promesa) | 2 puntos con cita, 2 enlaces con citas de las dos entradas (8 sep y 2 sep), 1 pregunta que cita «no le guste». |
| Tema nuevo (pan con Carmen) | 3 puntos, **0 ecos** (no hay pasado que conecte). |
| Ambiguo ("me he sentido raro") | Solo lo explícito; **ningún eco inventado**. |

Pruebas repetidas: mismos resultados en 4 de 4 ejecuciones tras fijar la temperatura en 0,1. Cada enlace y cada cita se vuelve a comprobar
fuera del pipeline: 0 citas sin respaldo. Coste: 1 llamada por entrada corta, 2 por entrada con contenido; 0 para notas.

Código: `pipeline.js` (sin dependencias; funciona en el navegador y en Node). Se conecta en `analyzeEntry` de `index.html`.

## Datos antiguos, demo y personas nuevas

Para ti, en la demo, ya habrá historial real y los ecos serán reales. **Para cualquier otra persona** hay tres opciones:

- ❌ *Que el modelo "autocomplete" un pasado inventado.* Es exactamente el problema de arriba, pero disfrazado de dato real. Descartada.
- ✅ **Mundo de ejemplo, etiquetado.** Un historial ficticio y claramente marcado ("Ejemplo: Mara, 3 meses"), de solo lectura, que se puede
  explorar (red, timeline, ecos reales entre esas entradas). Lo de la persona nueva nunca se mezcla con él.
- ✅ **Onboarding que da valor desde la primera grabación**, sin inventar nada:
  1. *Primera entrada guiada* (30-60 s): "Cuéntame algo de tu día".
  2. *Valor inmediato con solo esa entrada*: los puntos con su cita, las etiquetas y el primer nodo de su red. Si no dijo nada explícito, la app
     lo dice con honestidad y le pide un poco más.
  3. *"Así se verá en un mes"*: un interruptor para ver el mundo de ejemplo al lado. Ve la utilidad sin que se invente nada sobre él.
  4. *El primer eco aparece en la segunda grabación*; se le explica: "tu red crece cuando hablas".

Recomendación: **mundo de ejemplo + onboarding guiado**. Resuelve el problema en vez de esquivarlo, y es honesto.

## Decisiones pendientes

1. **Datos de desconocidos.** Hoy todas las grabaciones van a una base de datos compartida y pública: un extraño que grabe aparece mezclado con
   tu demo y lo ve cualquiera. Propuesta: *modo invitado* (todo local, sin sincronizar) para visitantes y *modo dueño* (sincronizado) solo para ti.
2. **Umbrales.** 10 s / 12 palabras para la puerta, ¿bien? ¿Y la regla de importancia de la timeline?
3. **Idioma.** El pipeline responde en el idioma de la entrada (probado en español). ¿Hace falta algo más (catalán)?
