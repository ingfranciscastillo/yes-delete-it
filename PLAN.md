# Yes, Delete It — Plan técnico

Investigado con Context7 (documentación de MDN WebExtensions, Chrome for Developers y Firefox Extension Workshop), noviembre de 2026. Las fuentes de cada decisión están al final.

---

## 1. Decisiones clave

| Decisión | Elección | Por qué |
|---|---|---|
| Plataforma | **Manifest V3, un único `manifest.json`** para Chrome y Firefox | Chrome ≥121 ignora `background.scripts` y Firefox ≥121 ignora `background.service_worker`, así que se declaran ambos. |
| Permisos | `activeTab` + `scripting` + `storage`. **Sin `host_permissions`.** | `activeTab` da acceso solo a la pestaña activa y solo tras una acción del usuario (clic en el icono, atajo, menú contextual). No genera advertencia de "leer todos tus datos". |
| Disparador | Clic en el icono **o** atajo `_execute_action` (`Alt+Shift+D`) | Un solo punto de entrada. Sin popup, así que el clic llega a `action.onClicked`. |
| Código | JavaScript vanilla, ES modules, **sin bundler ni minificado** | AMO exige el código fuente si hay minificado o transpilado. Así no hay nada que justificar. |
| Dependencias en runtime | **Ninguna** | Menos superficie de ataque y nada que auditar. |
| Datos | **Cero recogida y cero red** | `data_collection_permissions.required: ["none"]` en Firefox. En Chrome, "no recoge datos" en la pestaña de privacidad. |
| UI en la página | Elemento propio con **Shadow DOM cerrado** y solo `textContent` | Aísla los estilos y la página no puede leer ni manipular la UI. Nunca se usa `innerHTML` con datos de la página. |
| Rellenado | `execCommand('insertText')` y, como respaldo, el setter nativo + `InputEvent` | Funciona con React, Vue y Svelte, y con campos que bloquean el pegado. |
| Idiomas | `_locales/en` (por defecto) + `_locales/es` | `default_locale` es obligatorio si existe `_locales`. |
| Navegadores mínimos | Chrome **121**, Firefox **140** | 121: manifest de fondo compatible. 140: consentimiento de datos integrado de Firefox, obligatorio para extensiones nuevas en AMO desde el 3 de noviembre de 2025. |

---

## 2. Estructura del proyecto

```
yes-delete-it/
├── manifest.json
├── src/
│   ├── background.js          # action.onClicked → scripting.executeScript
│   ├── content/
│   │   ├── main.js            # punto de entrada inyectado (IIFE, idempotente)
│   │   ├── detect.js          # encuentra inputs y extrae el texto esperado
│   │   ├── fill.js            # escribe el valor de forma compatible con frameworks
│   │   └── ui.js              # la "tecla" en Shadow DOM cerrado
│   ├── options/
│   │   ├── options.html
│   │   ├── options.css
│   │   └── options.js         # ajustes: modo de rellenado, mostrar "Copiar"
│   └── shared/
│       ├── api.js             # const ext = globalThis.browser ?? globalThis.chrome
│       └── patterns.js        # frases de confirmación por idioma
├── assets/
│   ├── icons/                 # icon-16/32/48/128.png (PNG; Chrome no admite SVG)
│   └── fonts/martian-mono-latin.woff2   # + OFL.txt
├── _locales/{en,es}/messages.json
├── tests/
│   ├── fixtures/              # páginas HTML sintéticas (sin marcas reales)
│   ├── unit/                  # detect / fill con happy-dom
│   └── e2e/                   # Playwright con la extensión cargada en Chromium
├── store/                     # textos, capturas 1280×800, promo 440×280
├── PRIVACY.md
├── README.md
└── package.json               # solo devDependencies: web-ext, vitest, playwright
```

> `content/*.js` se inyecta con `files: [...]` en orden. Para no necesitar bundler, cada archivo cuelga sus funciones de un único namespace (`globalThis.__ydi`) dentro del isolated world, que la página no puede ver.

---

## 3. Manifest (borrador)

```json
{
  "manifest_version": 3,
  "name": "__MSG_extName__",
  "short_name": "Yes, Delete It",
  "description": "__MSG_extDescription__",
  "version": "1.0.0",
  "default_locale": "en",
  "minimum_chrome_version": "121",

  "icons": { "16": "assets/icons/icon-16.png", "32": "assets/icons/icon-32.png",
             "48": "assets/icons/icon-48.png", "128": "assets/icons/icon-128.png" },

  "action": {
    "default_title": "__MSG_actionTitle__",
    "default_icon": { "16": "assets/icons/icon-16.png", "32": "assets/icons/icon-32.png" }
  },

  "background": {
    "service_worker": "src/background.js",
    "scripts": ["src/background.js"],
    "type": "module"
  },

  "permissions": ["activeTab", "scripting", "storage"],

  "commands": {
    "_execute_action": {
      "suggested_key": { "default": "Alt+Shift+D", "mac": "Alt+Shift+D" }
    }
  },

  "options_ui": { "page": "src/options/options.html", "open_in_tab": false },

  "web_accessible_resources": [{
    "resources": ["assets/fonts/martian-mono-latin.woff2"],
    "matches": ["<all_urls>"]
  }],

  "browser_specific_settings": {
    "gecko": {
      "id": "yes-delete-it@<tu-dominio-o-alias>",
      "strict_min_version": "140.0",
      "data_collection_permissions": { "required": ["none"] }
    }
  }
}
```

Notas:
- No se declara `content_security_policy`. La de por defecto en MV3 (`script-src 'self'; object-src 'self'`) ya es la más estricta y no se puede relajar.
- `web_accessible_resources` solo expone la fuente, porque la tecla vive en la página y necesita cargarla. Contrapartida conocida: una web podría detectar que la extensión está instalada comprobando esa URL. Alternativa si se quiere evitar: usar la monoespaciada del sistema (`ui-monospace`) y no exponer nada. **Recomendación: empezar con `ui-monospace` y añadir Martian Mono solo si la diferencia visual lo justifica.**
- Chrome mostrará un aviso inocuo por `browser_specific_settings`, y Firefox otro por `minimum_chrome_version`. Si molestan, un script `build` genera dos manifest a partir de uno base.
- El ID de Gecko no debe ser tu email real. Usa un alias tipo `yes-delete-it@<alias>.dev`.

---

## 4. Flujo en tiempo de ejecución

```
usuario ─ clic / Alt+Shift+D ─▶ background.js
                                   │  action.onClicked(tab)
                                   │  scripting.executeScript({ target:{tabId, allFrames:true},
                                   │                            files:[api, patterns, detect, fill, ui, main] })
                                   ▼
                       content (isolated world, pestaña activa)
                       detect() → [{ input, expected, confidence }]
                         ├─ 0 resultados → toast "No hay ningún campo de confirmación en esta página."
                         └─ N resultados → una tecla bajo cada input
                                              └─ clic del usuario (isTrusted) → fill() → estado "Escrito"
```

- **Páginas no permitidas** (`chrome://`, `about:`, Chrome Web Store, AMO, visor de PDF): `executeScript` falla. Hay que capturarlo y mostrar en el icono el badge `–` con el título "Esta página no permite extensiones" durante 3 s.
- **Idempotencia:** si se vuelve a invocar, `main.js` desmonta la UI anterior antes de volver a detectar.
- **Modales que aparecen tarde:** tras inyectar, un `MutationObserver` de corta vida (10 s, con debounce de 150 ms) vuelve a detectar si el usuario pulsó el atajo justo antes de que el modal terminara de abrirse. Después se desconecta: **no hay vigilancia persistente**.
- **Sin mensajería de la página a la extensión.** El content script no escucha `postMessage` ni eventos de la página, y no envía datos de la página al background. El background solo inyecta.

---

## 5. Detección (`detect.js`)

Lo diseño conservador: **si hay dudas, no ofrezco nada**.

### 5.1 Candidatos
1. `input` (`type` vacío, `text` o `search`) y `textarea`, visibles, habilitados y no `readonly`. **Nunca** `type=password`, `email`, `tel`, `number` ni campos con `autocomplete` de credenciales o tarjeta (`current-password`, `cc-*`, `one-time-code`…).
2. Recorrer el documento y los **shadow roots abiertos** (los cerrados son inaccesibles, y está bien así).
3. Prioridad: el input con foco primero, luego los que están dentro de `dialog[open]`, `[role=dialog]`, `[role=alertdialog]` o `[aria-modal=true]`, y después el resto.

### 5.2 Contexto de cada input
- Texto de `<label>`, `aria-labelledby`, `aria-describedby`, `placeholder`, `title` y atributo `pattern`.
- Texto anterior dentro del contenedor más cercano, subiendo como máximo 4 ancestros y leyendo como máximo 600 caracteres.

### 5.3 ¿Es un campo de confirmación?
Frases en `patterns.js` (en, es, pt, fr, de, it), sin distinguir mayúsculas ni acentos. Ejemplos:
`type … to confirm`, `enter … to confirm`, `please type`, `confirm by typing`, `to continue, type`, `escribe … para confirmar`, `introduce … para continuar`, `digite … para confirmar`, `tapez … pour confirmer`, `geben Sie … ein`.
Refuerzo extra si cerca hay un botón con *delete / remove / destroy / eliminar / borrar / supprimer / löschen*.

### 5.4 Extraer el texto esperado (por orden de fiabilidad)
1. Atributo `pattern` literal del input (si es un literal escapado, sin metacaracteres).
2. `<code>`, `<kbd>`, `<samp>`, `<strong>` o `<b>` dentro de la frase de confirmación.
3. Texto entre comillas `"…" '…' “…” ‘…’ «…»` dentro de la frase.
4. `placeholder` cuando coincide exactamente con el texto destacado o la frase lo menciona ("type the name shown").

Validación: de 1 a 200 caracteres, sin saltos de línea, con espacios exteriores recortados (**los interiores no se tocan**). Si salen dos candidatos distintos para el mismo input, **no se ofrece nada** para ese input.

### 5.5 Varios campos
Vercel y otros piden el nombre **y** una frase fija en dos inputs. Cada input se empareja con la frase que tenga más cerca en el DOM, y cada uno lleva su propia tecla.

---

## 6. Rellenado (`fill.js`)

```js
function fill(input, value) {
  input.focus({ preventScroll: true });
  input.select();
  // 1) Vía preferida: produce beforeinput/input "reales"; React, Vue y Svelte lo ven,
  //    y no depende del portapapeles (sirve aunque bloqueen el pegado).
  const ok = document.execCommand('insertText', false, value);
  if (ok && input.value === value) return true;

  // 2) Respaldo: setter nativo del prototipo, para saltarse el tracker de valor de React.
  const proto = input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(input, value);
  input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: value }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  return input.value === value;
}
```

- Se verifica `input.value === value` tras rellenar. Si no coincide, la tecla muestra *"No se pudo escribir. Usa Copiar."*
- **Nunca** se dispara `submit`, `click` ni `Enter` sobre la página.
- **Copiar:** `navigator.clipboard.writeText(value)` dentro del manejador del clic en nuestra tecla, que es una activación de usuario en un contexto seguro. No hace falta el permiso `clipboardWrite`. Tras copiar, la etiqueta cambia a "Copiado".

---

## 7. Interfaz

### 7.1 La tecla (en la página)
- Elemento personalizado `<ydi-key>` con `attachShadow({ mode: 'closed' })`. Todo el CSS va dentro, y hay un reset con `all: initial` en el host para que la página no lo afecte.
- Se posiciona con `position: absolute`, anclada bajo el input, y se recalcula con `ResizeObserver` y en `scroll`/`resize` con `requestAnimationFrame`. Lleva un `z-index` alto pero razonable (2147483000).
- Accesible: es un `<button>` real con `aria-label` *"Escribir acme/landing-2024 en el campo de confirmación"*, foco visible con un anillo de `--signal` de 2 px, y cierra con `Esc`.
- El clic solo cuenta si `event.isTrusted`. Una página no puede hacer clic por ti.
- Movimiento: al pulsarla, `translateY(1px)` y el borde inferior baja de 3 a 2 px, en 80 ms. Con `prefers-reduced-motion` no hay transición. Es la única animación de toda la extensión.
- Texto largo: se trunca por el centro (`acme/lan…ng-2024`) y el valor completo va en `title`.
- **Sin nombre ni logo** en la tecla. El texto ("Escribir") ya explica qué hace.

### 7.2 Página de opciones
Pequeña y nativa (usa `options_ui`, que Chrome y Firefox enmarcan en su propia UI):
- **Modo:** "Mostrar tecla (recomendado)" / "Escribir directamente al invocar". El segundo trae un aviso: *"Se escribirá sin confirmación adicional. Tú sigues pulsando el botón de borrar."*
- **Mostrar botón Copiar:** sí/no.
- **Atajo:** enlace a `chrome://extensions/shortcuts` o a `about:addons`, porque no se puede cambiar desde código.
- Se guarda en `storage.sync`. Solo son preferencias: ningún dato de páginas.

### 7.3 Iconos
Una tecla vista en tres cuartos, con un cursor de texto dentro. Se exporta a PNG en 16, 32, 48 y 128, y se revisa a 16 px que se lea. La versión de 128 lleva 16 px de margen transparente (el lienzo útil es de 96 px), como recomienda la Chrome Web Store.

---

## 8. Seguridad y privacidad (lista de comprobación)

- [ ] Sin `host_permissions` ni `<all_urls>` en `permissions`. Solo `activeTab`, `scripting` y `storage`.
- [ ] Sin `fetch`, `XMLHttpRequest`, `WebSocket`, `sendBeacon` ni imágenes remotas. Un test en CI hace `grep` y falla si aparecen.
- [ ] Sin `eval`, `new Function`, `innerHTML`, `outerHTML`, `insertAdjacentHTML` ni `document.write`. Lo comprueba una regla de ESLint (`no-restricted-properties`).
- [ ] Sin código remoto: todo va dentro del paquete (es política de MV3).
- [ ] La UI usa Shadow DOM cerrado y solo `textContent`.
- [ ] Solo se aceptan clics con `isTrusted`, y no se escucha nada que venga de la página.
- [ ] Nunca se tocan campos de contraseña, tarjeta ni OTP.
- [ ] El valor detectado no se guarda en ningún sitio, ni siquiera en `storage`, y se olvida al cerrar la tecla.
- [ ] Firefox: `data_collection_permissions.required = ["none"]`.
- [ ] Chrome: en la pestaña de prácticas de privacidad, se marca que no recoge ningún tipo de dato y se certifican las políticas de uso limitado.
- [ ] `PRIVACY.md` publicado (en GitHub Pages o el repo) con una sola frase: *"Yes, Delete It no recoge, guarda ni transmite ningún dato."*
- [ ] `web-ext lint` sin errores y `pnpm audit` limpio (solo hay devDependencies).

---

## 9. Pruebas

**Fixtures sintéticas** en `tests/fixtures/`, que imitan los *patrones* sin copiar la marca ni el HTML de ningún sitio real:

| Fixture | Qué prueba |
|---|---|
| `name-in-code.html` | "Type `acme/web` to confirm" |
| `quoted.html` | Nombre entre comillas tipográficas |
| `two-inputs.html` | Nombre + frase fija "delete my project" |
| `react-controlled.html` | Input controlado con React (servido localmente) |
| `paste-blocked.html` | `onpaste` con `preventDefault` |
| `late-modal.html` | Modal que aparece 500 ms después de invocar |
| `shadow-open.html` | Input dentro de un web component |
| `ambiguous.html` | Dos candidatos → **no se ofrece nada** |
| `password-near.html` | Campo de contraseña cerca → **se ignora** |
| `spanish.html` | "Escribe «mi-proyecto» para confirmar" |

- **Unitarias** (Vitest + happy-dom): `detect` y `fill`.
- **E2E** (Playwright + Chromium con `--load-extension`): invocar → aparece la tecla → clic → el valor coincide → el botón de la página se habilita → **la extensión no lo ha pulsado**.
- **Firefox:** `web-ext run` contra las mismas fixtures, con una lista de comprobación manual antes de cada versión.
- **Prueba en sitios reales** con cuentas de prueba (repo vacío, proyecto vacío). Solo se valida que la tecla aparece y rellena; **no se borra nada real**.

---

## 10. Fases

1. **Esqueleto.** Manifest, background, inyección y toast de "nada encontrado". Carga en Chrome (`Load unpacked`) y en Firefox (`web-ext run`).
2. **Detección.** `patterns.js` y `detect.js`, con las fixtures y los tests unitarios en verde.
3. **Rellenado.** `fill.js`, probado con React y con el pegado bloqueado.
4. **Interfaz.** La tecla con modo claro y oscuro, accesibilidad, `Esc`, posición y truncado. Se revisa con capturas.
5. **Opciones e i18n.** Página de opciones e idiomas en y es.
6. **Endurecimiento.** Reglas de ESLint, `grep` de red en CI, `web-ext lint`, E2E, y revisión manual en 5–6 paneles reales.
7. **Recursos de tienda.** Iconos, 3–5 capturas a 1280×800, promo a 440×280, textos, `PRIVACY.md` y justificación de cada permiso.
8. **Publicación.**
   - Chrome Web Store: cuenta de desarrollador (5 USD, pago único, con verificación en dos pasos), ZIP con el contenido de la carpeta, propósito único y justificaciones (`activeTab`: "leer la página activa solo cuando el usuario pulsa el icono o el atajo"; `scripting`: "insertar el detector en esa pestaña"; `storage`: "guardar dos preferencias").
   - AMO: `web-ext build` y luego `web-ext sign --channel=listed`, o subida manual. No hace falta enviar el código fuente aparte, porque no hay minificado.

### v1.1 (opcional, después)
**Autodetección por sitio, opt-in.** Lista de dominios conocidos en `optional_host_permissions`, un interruptor por sitio en las opciones que llama a `permissions.request()` dentro del clic, y registro con `scripting.registerContentScripts` solo para los dominios concedidos. Así, quien no lo active sigue sin ningún permiso de host.

---

## 11. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Rellenar el texto equivocado | La tecla muestra el valor exacto antes de escribir. Si hay ambigüedad, no se ofrece nada, y se verifica el valor después de escribir. |
| Que parezca que "quita la protección" | Por defecto requiere clic, nunca pulsa borrar, y lo decimos en el texto de la tienda. |
| `execCommand` está marcado como obsoleto | Sigue funcionando en todos los navegadores y hay un respaldo con el setter nativo. Se vigila en cada versión. |
| La web cambia su HTML | La detección se basa en frases y semántica, no en selectores de sitios concretos. |
| Conflicto de atajo | `Alt+Shift+D` es una sugerencia y el usuario puede cambiarla. Hay que verificar al implementar que no choca con atajos de Chrome o Firefox en Linux, Windows y macOS. |
| iframes de otro origen | Limitación documentada. Se reevaluaría en v1.1 con permisos opcionales. |

---

## Fuentes (vía Context7)

- MDN, `manifest.json/background`: fondo compatible entre navegadores en MV3.
- MDN, `manifest.json/browser_specific_settings`: `gecko.id` obligatorio en MV3 y `data_collection_permissions` obligatorio en AMO desde el 3 de noviembre de 2025.
- MDN, `manifest.json/permissions` (activeTab) y `API/scripting/executeScript`.
- MDN, `manifest.json/commands`: `_execute_action`.
- MDN, `optional_host_permissions` y `permissions.request()` (para v1.1).
- Chrome for Developers: CSP de MV3, iconos en PNG 16–128, `default_locale`, máximo de cuatro atajos sugeridos, *Stay secure* (evitar `innerHTML`, tratar la página como hostil) y prohibición de código remoto.
- Firefox Extension Workshop: políticas de AMO (código fuente si hay minificado, prohibido ofuscar), consentimiento de datos integrado (Firefox 140+) y `web-ext lint/run/build/sign`.
