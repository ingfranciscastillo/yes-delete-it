# Yes, Delete It — Brief

> Extensión para Chrome y Firefox que detecta los campos de "escribe el nombre del proyecto para confirmar" y te deja rellenarlos con un clic, sin quitarte la decisión.

## El problema

GitHub, Vercel, Netlify, Supabase, Cloudflare, AWS, GCP y casi cualquier panel con un botón peligroso piden que escribas algo antes de borrar:

- el nombre exacto del recurso (`acme/landing-2024`, `prod-db-eu-west-1`…), a veces largo o con caracteres raros;
- una frase fija (`delete my project`, `permanently delete`);
- a menudo con el pegado bloqueado.

La fricción tiene sentido, porque obliga a parar y mirar qué vas a borrar. El problema es la parte mecánica: copiar a mano un identificador de 40 caracteres, equivocarte en un guion o tener que teclearlo porque la web no te deja pegar.

## La idea

**Quitar el tecleo, no la decisión.** La extensión encuentra el texto que hay que escribir, te lo enseña al lado del campo y lo escribe cuando tú pulsas el botón. Nunca pulsa "Delete" por ti.

## Para quién

Desarrolladores, DevOps y cualquiera que gestione proyectos, repos, bases de datos o cuentas en paneles web, y que borre recursos lo bastante a menudo como para que este paso le moleste.

## Cómo se usa (v1)

1. Estás en el modal de "Delete project".
2. Pulsas el icono de la extensión o el atajo (`Alt+Shift+D`, `⌥⇧D` en Mac; se puede cambiar).
3. Aparece una tecla pequeña junto a cada campo de confirmación: **Escribir `acme/landing-2024`** y un botón secundario **Copiar**.
4. Pulsas **Escribir**. El campo se rellena y la tecla cambia a "Escrito. Revisa antes de borrar."
5. Tú decides si pulsas el botón rojo de la página.

Si no hay nada que detectar: *"No hay ningún campo de confirmación en esta página."*

## Principios (no negociables)

1. **La decisión es tuya.** Nada se escribe sin un clic tuyo sobre una tecla que muestra exactamente qué se va a escribir. Nunca pulsa botones de la página ni envía formularios.
2. **Solo actúa cuando la llamas.** v1 usa `activeTab`: sin permisos de host, sin leer páginas en segundo plano, sin la advertencia de "puede leer todos tus datos en todos los sitios".
3. **Nada sale de tu navegador.** Sin red, sin analítica, sin telemetría, sin cuentas. Lo declaramos así a Firefox (`data_collection_permissions: none`) y a la Chrome Web Store.
4. **Código legible.** JavaScript sin compilar, sin dependencias en tiempo de ejecución y sin código remoto. Cualquier revisor de AMO o de la Chrome Web Store puede leerlo entero en diez minutos.
5. **Que no rompa la página.** La interfaz va en un Shadow DOM cerrado, con estilos aislados, y se puede quitar con `Esc`.

## Fuera de alcance (v1)

- Autodetección sin invocar la extensión (se plantea para v1.1, opcional y por sitio).
- Pulsar el botón de borrar, encadenar pasos o cualquier forma de "borrado automático".
- iframes de otro origen (`activeTab` no los cubre; son raros en estos modales).
- Firefox para Android (no hay atajos de teclado; se valorará después).
- Safari.

## Criterios de éxito

- Detecta y rellena correctamente el campo en los patrones típicos (nombre del recurso, frase fija, dos campos a la vez, React o Vue con el pegado bloqueado).
- Cero falsos positivos que escriban algo distinto a lo que muestra la tecla. Si hay dudas, la extensión no ofrece nada.
- Lo aprueban la Chrome Web Store y AMO a la primera, sin pedir justificaciones adicionales.
- El paquete pesa menos de 100 KB.

## Dirección visual

**Concepto: una tecla.** La extensión "teclea por ti", así que su única pieza de interfaz es una tecla física pequeña: cuerpo claro, borde inferior más grueso que simula la altura, y al pulsarla baja 1 px. Es lo único memorable; todo lo demás es silencioso.

- **No usa rojo.** El rojo pertenece al botón peligroso de la página. Nuestra tecla es neutra y fría para no competir con él ni confundirse con él.
- El texto detectado se muestra en una monoespaciada, porque es literalmente lo que se va a teclear. El resto de la interfaz usa la fuente del sistema para sentirse nativa y no pesar nada.
- Hay modo claro y oscuro (`prefers-color-scheme`), foco visible, y respeta `prefers-reduced-motion`.

| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `--key` | `#EDF0F4` | `#2A3140` | Cuerpo de la tecla |
| `--key-edge` | `#BCC4D0` | `#151A24` | Borde inferior (altura) |
| `--ink` | `#1B2230` | `#E6EAF2` | Texto |
| `--muted` | `#5B6578` | `#9AA4B6` | Texto secundario |
| `--signal` | `#2A55E0` | `#7C9BFF` | Foco y estado "escrito" |

Tipografía: `system-ui` para la interfaz y `ui-monospace` para el texto a escribir. Si en las capturas no da la talla, se cambia por **Martian Mono** (OFL, subset empaquetado); el coste se explica en el plan, §3.

```
 ┌───────────────────────────────────────┐
 │ To confirm, type "acme/landing-2024"  │   ← la página
 │ ┌───────────────────────────────────┐ │
 │ │                                   │ │   ← su input
 │ └───────────────────────────────────┘ │
 │  ╭──────────────────────────────╮ ╭──────╮
 │  │ Escribir  acme/landing-2024  │ │Copiar│   ← nuestra tecla, bajo el input
 │  ╰══════════════════════════════╯ ╰══════╯
 └───────────────────────────────────────┘
```

## Nombre y textos

- Nombre: **Yes, Delete It**, localizado al español como "Sí, bórralo".
- Descripción corta para las tiendas (máx. 132 caracteres): *"Rellena con un clic los campos de 'escribe el nombre para confirmar'. Tú sigues pulsando borrar. Sin datos, sin red."*
- Propósito único (Chrome): *"Ayudar a rellenar campos de confirmación de borrado en la página activa cuando el usuario lo solicita."*
