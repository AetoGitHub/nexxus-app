# Ajustes pendientes en n8n: webhook `nexxus-voz` (dictado de tareas por voz)

**Para:** quien mantiene los workflows de n8n (webhook `https://n8n.srv1137762.hstgr.cloud/webhook/nexxus-voz`)
**De:** Guillermo Franco Borjón (frontend `nexxus-app`)
**Fecha:** 12 oct 2026
**Tarea relacionada en el ERP:** «Ajustar el sistema de voz»

## 1. Qué se reportó

Al crear una tarea dictando por voz:

1. No encuentra bien a los usuarios cuando los nombras.
2. No pone clara la fecha de vencimiento.
3. No puede decirle que la tarea sea recurrente / repetitiva.
4. No cambia el grupo.
5. No cambia el esfuerzo.

Ejemplo que debe funcionar:

> «Crea una tarea para el usuario Guillermo Franco Borjón, para el día 13 de octubre del 2026. Esta tarea debe ser repetitiva con un esfuerzo normal (o alto).»

Resultado esperado en el formulario: asignada a Guillermo Franco Borjón, fecha límite 2026-10-13, tipo Repetitiva, grupo = el grupo del usuario asignado, esfuerzo seleccionado.

## 1.1 Prueba real del 12 oct 2026 contra el webhook de producción

Se grabó con micrófono real el audio: «Crea una tarea para el usuario Guillermo Franco Borjón, para el día 13 de octubre del 2026. Esta tarea debe ser repetitiva, con un esfuerzo alto.» Respuesta del webhook (HTTP 200, 5.3 s, audio de 270 KB):

```json
{
  "name": "Crear tarea repetitiva",
  "description": "",
  "task_type": "manual",
  "project_id": null,
  "due_date": "2026-10-13",
  "assignee_ids": [28],
  "urgent": false,
  "effort": "compleja",
  "subtasks": [],
  "in_backlog": false,
  "transcript": "Crea una tarea para el usuario Guillermo Franco Borjón para el día 13 de octubre del 2026. Esta tarea debe ser repetitiva, con un esfuerzo alto.",
  "needs_review": true,
  "ambiguities": ["La tarea debe ser repetitiva, con un esfuerzo alto."]
}
```

Lo que **ya funciona** en n8n con este audio: transcripción exacta, `assignee_ids` (id 28 = Guillermo Franco Borjón), `due_date` en `YYYY-MM-DD` y `effort` («alto» → `compleja`).

Lo que **falla** y es lo que hay que arreglar:

1. **`task_type` sale `manual`** aunque dijo «repetitiva». No existe un campo `repeat_config` en la respuesta. → debe devolver `task_type: "repeat"` y `repeat_config` (sección 4).
2. **`ambiguities` copia la instrucción dictada** («La tarea debe ser repetitiva, con un esfuerzo alto.») en lugar de una duda real; con eso `needs_review` queda en `true` sin motivo. Las instrucciones sobre tipo/esfuerzo deben interpretarse, no pasarse como ambigüedad. Una duda real sería, por ejemplo, «No dijo con qué frecuencia se repite».
3. **`name` sale «Crear tarea repetitiva»**: el título tomó la instrucción («crea una tarea… repetitiva») y no el contenido de la tarea. Aquí el audio no decía qué hacer, así que lo correcto era `needs_review: true` con la duda «No se dijo qué hay que hacer», no inventar un título a partir de la instrucción.
4. **`effort` llega como `compleja`** (acepta el frontend). Para unificar con el resto, usar `quick` | `normal` | `complex`; `rapida` | `normal` | `compleja` sigue funcionando.
5. **`users` / `projects`:** esta prueba ya recibió el catálogo con `username`, `first_name`, `last_name` y `aliases`. Si el workflow de n8n arma el prompt con esos campos, usarlos también para resolver nombres sueltos («Héctor», «Franco»).

Resultado en el formulario de la app con esa respuesta real: asignado Guillermo Franco Borjón, fecha 13 oct 2026, esfuerzo Alto, grupo DEVS, y el tipo **Repetitiva** (que el frontend dedujo del `transcript`; sin esa red de seguridad habría quedado Manual), con frecuencia semanal por defecto marcada «revisa la repetición».

## 2. Qué ya resolvió el frontend (no hace falta duplicarlo)

El frontend se defendió de las respuestas incompletas, pero **lo correcto es que n8n devuelva los datos bien**; el frontend solo es una red de seguridad.

- **Grupo:** no hay que mandarlo. El formulario lo toma del grupo del usuario asignado. Si `assignee_ids` llega mal, el grupo también queda mal.
- **Catálogo de usuarios completo:** antes solo se mandaba la primera página del dropdown; ahora se mandan todos, con nombre, apellido, username y alias (ver sección 3).
- **Respaldo por transcripción:** si `assignee_ids` viene vacío, el frontend busca en `transcript` a quien se nombró (por nombre y apellido; un nombre suelto solo cuenta si lo tiene un único usuario).
- **Respaldo de fecha:** si `due_date` falta o ya pasó, el frontend intenta leerla del `transcript` cuando es explícita («13 de octubre del 2026», `13/10/2026`). **No** resuelve fechas relativas («el viernes», «mañana»): eso es de n8n.
- **Respaldo de esfuerzo:** si en el `transcript` dice «esfuerzo alto/normal/rápido», eso manda sobre el campo `effort`.
- **Respaldo de repetición:** si el `transcript` dice «repetitiva», «recurrente», «cada 2 semanas», «todos los lunes», el tipo pasa a Repetitiva con una configuración deducida; si no se dijo la frecuencia, se deja semanal por defecto y se avisa a la persona que la revise.
- Tolera alias de campos y envolturas (`[ {...} ]`, `{ data: ... }`, `{ output: ... }`), pero conviene mandar el formato de la sección 4.

## 3. Lo que ENVÍA el frontend (multipart/form-data)

| Campo | Contenido |
|---|---|
| `audio` | Archivo `voz.webm` / `voz.m4a` / `voz.ogg` (`audio/webm;codecs=opus` en Chrome). |
| `user_id` | Id de quien dicta. |
| `now` | Fecha y hora actuales en México **con desfase**, p. ej. `2026-10-12T13:36:30-06:00`. |
| `timezone` | `America/Mexico_City`. |
| `users` | JSON, **todos** los usuarios de la empresa (novedad: antes solo `id` y `name`). |
| `projects` | JSON `[{ "id": 29, "name": "NEXXUS TASK" }]`. |
| `default_project_id` | Opcional: proyecto ya elegido en el formulario. |

Ejemplo de `users` (novedad: `username`, `first_name`, `last_name`, `aliases`):

```json
[
  {
    "id": 5,
    "name": "Guillermo Franco Borjón",
    "username": "MEMO.NEXXUS",
    "first_name": "Guillermo",
    "last_name": "Franco Borjón",
    "aliases": ["Guillermo", "Franco", "Guillermo Franco"]
  },
  {
    "id": 30,
    "name": "ANDRES.NEXXUS",
    "username": "ANDRES.NEXXUS",
    "first_name": "ANDRES.NEXXUS",
    "last_name": "",
    "aliases": ["ANDRES.NEXXUS"]
  }
]
```

Notas: los ids de los ejemplos de este documento son ilustrativos (siempre usar los que lleguen en `users`). Hay usuarios que aún no tienen nombre y apellido capturados; en ese caso `name` es el username.

## 4. Lo que DEBE DEVOLVER n8n (JSON)

```json
{
  "name": "Revisar inventario",
  "description": "",
  "transcript": "Crea una tarea para el usuario Guillermo Franco Borjón, para el día 13 de octubre del 2026. Esta tarea debe ser repetitiva con esfuerzo alto.",
  "assignee_ids": [5],
  "due_date": "2026-10-13",
  "task_type": "repeat",
  "repeat_config": { "frequency": "weekly", "every": 1, "weekday": 2, "week_of_month": null, "on_month": null },
  "effort": "complex",
  "urgent": false,
  "in_backlog": false,
  "project_id": null,
  "subtasks": [],
  "needs_review": false,
  "ambiguities": []
}
```

### Reglas por campo

| Campo | Qué debe hacer n8n |
|---|---|
| `assignee_ids` | Ids **numéricos tomados de `users`**: el usuario **nombrado** en el audio, no quien dicta. Resolver por nombre completo, solo nombre, solo apellido, username o alias («Guillermo», «Franco»). Si dos usuarios coinciden igual, **no adivinar**: dejar `[]` y agregar una `ambiguities` («¿Guillermo Franco o Guillermo Borjón?») con `needs_review: true`. Si no dicen a nadie, `[]` (el formulario asigna a quien dicta). |
| `due_date` | `YYYY-MM-DD` **ya resuelto** contra `now` y `timezone`. «13 de octubre del 2026» → `2026-10-13`. «El viernes» → el próximo viernes a partir de `now` (si hoy es viernes, hoy salvo que digan «el próximo»). «Mañana», «en dos semanas», «fin de mes» también. Sin año → la próxima ocurrencia de esa fecha. Si no mencionan fecha: `null` (no inventar hoy). |
| `task_type` | `manual` (por defecto), `repeat`, `volume` o `multiple_close`. «Repetitiva», «recurrente», «periódica», «cada…», «todos los…» → **`repeat`**. |
| `repeat_config` | Obligatorio si `task_type` es `repeat`. Ver tabla siguiente. Si no dicen la frecuencia, mandar `null` (el frontend deja semanal por defecto y avisa que se revise) y agregar la duda en `ambiguities`. |
| `effort` | `quick` \| `normal` \| `complex` (también acepta `rapida`/`compleja`). «Esfuerzo normal» → `normal`; «alto» / «compleja» → `complex`; «rápida» → `quick`. **Si no lo mencionan, mandar `""` o `null`. No mandar `normal` por defecto** (hoy se interpreta como dicho y pisa lo que haya en el formulario). **No marcar `urgent` por decir «esfuerzo alto»**: son cosas distintas. |
| `urgent` | `true` solo si dicen «urgente» / «para ya». |
| `in_backlog` | `true` solo si dicen «backlog» / «pendiente sin fecha». |
| `project_id` | Id de `projects` si lo nombran; si no, `null`. |
| `name` | Título corto y accionable. |
| `description` | Contexto adicional dictado; `""` si no hay. |
| `subtasks` | `string[]` u objetos con `name`. |
| `transcript` | Texto literal transcrito (el frontend lo usa como respaldo). |
| `needs_review` / `ambiguities` | `true` y la lista de dudas cuando algo no quedó claro. |

### `repeat_config`

| Campo | Valores |
|---|---|
| `frequency` | `daily`, `weekly`, `monthly`, `yearly` |
| `every` | Entero ≥ 1 («cada 2 semanas» → `weekly` + `every: 2`) |
| `weekday` | ISO `1`=lunes … `7`=domingo (solo `weekly` / `monthly` por día de la semana). Si no lo dicen, usar el día de `due_date`. |
| `week_of_month` | `1`–`4` o `-1` (última); solo `monthly` por semana («el segundo martes» → `2` + `weekday: 2`). Si no aplica, `null`. |
| `on_month` | `1`–`12`; solo `yearly`. Si no aplica, `null`. |

Ejemplos:

- «Todos los lunes» → `{ "frequency": "weekly", "every": 1, "weekday": 1, "week_of_month": null, "on_month": null }`
- «Cada dos semanas» → `{ "frequency": "weekly", "every": 2, "weekday": <día de due_date>, "week_of_month": null, "on_month": null }`
- «El último viernes de cada mes» → `{ "frequency": "monthly", "every": 1, "weekday": 5, "week_of_month": -1, "on_month": null }`

## 5. Criterios de aceptación (probar con audio real)

1. **«Crea una tarea para Guillermo Franco Borjón para el 13 de octubre del 2026, repetitiva, esfuerzo alto»** → `assignee_ids: [5]`, `due_date: "2026-10-13"`, `task_type: "repeat"`, `effort: "complex"`.
2. **«Tarea para Héctor, esfuerzo normal»** (solo nombre de pila) → resuelve a Héctor Morales Ventura; `effort: "normal"`.
3. **«Tarea para Yesi para el viernes»** (otro grupo, sin esfuerzo) → asigna a Yesi (el formulario cambia el grupo a AETOMANAGMENT), `due_date` = próximo viernes, **`effort` vacío**.
4. **«Tarea recurrente cada dos semanas»** → `task_type: "repeat"`, `repeat_config` con `every: 2`.
5. **«Tarea para Guillermo»** si hubiera dos Guillermo → `assignee_ids: []`, `needs_review: true`, duda en `ambiguities`.
6. Una tarea **sin** esfuerzo mencionado nunca devuelve `effort: "normal"`.
7. Una tarea con «esfuerzo alto» **no** devuelve `urgent: true`.

## 6. Cómo ver lo que está devolviendo hoy el webhook

En Chrome (con la app abierta), en la consola:

```js
const f = window.fetch;
window.fetch = async (...a) => {
  const r = await f(...a);
  if ((a[0].url ?? a[0]).includes('nexxus-voz')) console.log('nexxus-voz →', await r.clone().text());
  return r;
};
```

Luego dictar una tarea; la respuesta cruda queda en la consola.

## 7. Dónde está el contrato en el código

`app/features/tasks/utils/form/voice-task.util.ts` (comentario «Contrato del webhook de voz» y `normalizeVoiceTask`) y `app/features/tasks/types/voice-task.types.ts`.
