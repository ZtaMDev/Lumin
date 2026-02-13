# LuminJS MVP

## 1. Objetivo del MVP

Construir un compilador en Rust que, dado un archivo de entrada `.lumin`, produzca un archivo de salida JavaScript listo para ser usado en un entorno Bundler/SSR (por ejemplo, con Bun + Vite en el futuro), con:

- **Subset mínimo de sintaxis Lumin** (markup + script + imports de componentes).
- **Reactividad basada en signals** muy simple (`signal()` + lectura/escritura).
- **Generación de un módulo JS** con:
  - Una función `renderToString()` para SSG.
  - Una función `hydrate(root: HTMLElement)` para rehidratar en el cliente.
- **CLI sencilla** en Rust (`luminc`) que compile un archivo `.lumin` a `.js`.
- Integración básica con **Bun** como runtime/package manager (scripts de build).

Este MVP NO incluye todavía:

- Routing.
- CSS scoped o compilado.
- Code splitting.
- Islands avanzadas (se asume que todo el componente raíz es una "isla").

---

## 2. Sintaxis Lumin soportada en el MVP

### 2.1. Estructura general del archivo

Extensión: `.lumin`.

Orden y secciones permitidas:

1. **(Opcional)** bloque de imports de componentes al inicio del archivo:

   ```lumin
   ---
   import Header from "./Header.lumin"
   import { Card } from "./Card.lumin"
   ---
   ```

   Reglas del MVP:

   - Solo se permite **un bloque** `--- ... ---`.
   - Debe estar **en la parte superior** del archivo (antes de cualquier otra cosa).
   - Solo se permiten imports de componentes `.lumin`.
   - Si se intenta importar cualquier otra cosa (p.ej. `"date-fns"`), el compilador genera **error**.

2. **(Opcional)** un único bloque `<script>` de nivel superior:

   ```lumin
   <script>
   import { format } from "date-fns"

   const count = signal(0)

   function inc() {
     count(count() + 1)
   }
   </script>
   ```

   Reglas del MVP:

   - Solo se permite **un `<script>` de nivel superior**.
   - Todo el código dentro del `<script>` se trata como **JS de módulo opaco** (no se parsea internamente aún, solo se mantiene como string y se inyecta en el output).
   - Dentro del `<script>` SÍ se permiten imports de librerías JS (`import { x } from "lib"`).
   - Si se importa un archivo `.lumin` dentro de `<script>`, el compilador genera **error**.

3. **Markup principal** (template):

   - Todo el contenido fuera de `--- ---` y `<script>...</script>` se considera **template raíz**.
   - Ejemplo completo soportado por el MVP:

     ```lumin
     ---
     import { Card } from "./Card.lumin"
     ---

     <script>
     const count = signal(0)

     function inc() {
       count(count() + 1)
     }
     </script>

     <Card>
       <h1>{count()}</h1>

       <button onClick={inc}>
         Increment
       </button>
     </Card>
     ```

### 2.2. Reglas de markup

El MVP soporta:

- **Elementos HTML básicos**: `<div>`, `<span>`, `<button>`, `<h1>`, etc.
- **Componentes**: etiquetas cuyo nombre comienza con mayúscula, p.ej. `<Card>`, `<Header />`.
- **Texto plano**: `Hola mundo`.
- **Expresiones embebidas**: `{expr}` dentro de nodos de texto.
- **Atributos estáticos**: `class="btn"`, `id="main"`.
- **Atributos dinámicos tipo JS**: `prop={expr}`.
- **Handlers de eventos**: `onClick={expr}`, donde `expr` suele ser un identificador a una función.

Restricciones del MVP:

- Las expresiones admitidas en `{ ... }` y en `{expr}` de atributos serán, para el MVP:
  - Identificadores (`count`, `inc`).
  - Llamadas simples (`count()`).
  - Expresiones binarias muy básicas (`a + 1`).
  - Literales (`1`, `"texto"`, `true`, `false`).
- No se soportan aún:
  - Destructuraciones, `await`, `yield`, etc. dentro del template.
  - Directivas como `if`, `for` (no hay estructuras de control en markup aún). Por ahora, todo es estático excepto interpolaciones.

### 2.3. Semántica de signals en el template

- `const count = signal(0)` se declara en `<script>`.
- En el template:
  - `{count()}` es una **lectura reactiva**.
  - `onClick={inc}` puede llamar internamente a `count(count() + 1)`.
  - `count.value` es una **lectura NO reactiva** (para el MVP, tratada igual pero documentada como no rastreada para futuros efectos).

En el MVP, la reactividad será simple:

- Cuando una signal cambia, se vuelve a renderizar el nodo (o subárbol) asociado en el DOM.
- Se puede implementar inicialmente de forma naive (re-render completo del template raíz) para simplificar, y optimizar luego a fine-grained.

---

## 3. Diseño del compilador en Rust

### 3.1. Pipeline general

El compilador Rust (`luminc` core) seguirá este pipeline:

1. **Lectura de archivo**
   - Input: ruta a `entry.lumin`.
   - Output: string con el contenido.

2. **Lexer (tokenizer) simplificado**
   - Tokens principales:
     - `ImportBlockStart` / `ImportBlockEnd` para `---`.
     - `ScriptStart` / `ScriptEnd` para `<script>` y `</script>`.
     - `TagOpen`, `TagClose`, `TagSelfClose`.
     - `Identifier`, `StringLiteral`, `NumberLiteral`.
     - `LBrace`, `RBrace` (para `{` y `}` en expresiones).
     - `Text` (trozos de texto plano en el template).
   - No hace parsing profundo de JS; el contenido de `<script>` se trata como **blob** hasta `</script>`.

3. **Parser**

   Árbol de alto nivel:

   ```rust
   struct ComponentFile {
       imports: Vec<ComponentImport>,
       script: Option<ScriptBlock>,
       template: Vec<TemplateNode>,
   }

   struct ComponentImport {
       // Ej: import { Card } from "./Card.lumin"
       specifiers: Vec<ImportSpecifier>,
       source: String, // "./Card.lumin"
   }

   enum ImportSpecifier {
       Default(String),      // Header
       Named(String),        // Card
       NamedAlias {          // Card as MyCard
           local: String,
           imported: String,
       },
   }

   struct ScriptBlock {
       code: String, // JS crudo
   }

   enum TemplateNode {
       Element(ElementNode),
       Text(String),
       Expr(ExprNode), // para {expr} directo
   }

   struct ElementNode {
       tag_name: String, // "div", "Card", etc.
       attributes: Vec<AttributeNode>,
       children: Vec<TemplateNode>,
       self_closing: bool,
   }

   enum AttributeNode {
       Static { name: String, value: String },
       Dynamic { name: String, expr: ExprNode },
       EventHandler { name: String, expr: ExprNode }, // onClick={...}
   }

   // ExprNode en el MVP puede ser muy simple
   enum ExprNode {
       Identifier(String),        // count, inc
       Call {                     // count()
           callee: Box<ExprNode>,
           args: Vec<ExprNode>,
       },
       Binary {
           left: Box<ExprNode>,
           op: BinaryOp,
           right: Box<ExprNode>,
       },
       Literal(Literal),
       Member {
           object: Box<ExprNode>, // count
           property: String,      // value
       },
   }
   ```

4. **Validación semántica mínima**

   - Verificar que:
     - El bloque `--- ---` si existe, está al principio.
     - Solo hay un `<script>`.
     - Los imports de componentes (en import block) terminan en `.lumin`.
     - En `<script>`, si se detecta `".lumin"` en un import, reportar error.
   - No se hace resolución de símbolos completa en el MVP (no comprobar si `Card` está realmente exportado por `./Card.lumin`).

5. **Transformación a una representación intermedia (IR)**

   - Opcional para el MVP, pero recomendable definir una IR donde:
     - Se marque qué tags son **componentes** (mayúscula inicial) vs **nativos** (minúscula).
     - Se normalicen atributos de eventos (`onClick` → `click`).

6. **Codegen a JS**

   Output: módulo ES (Esm) con esta estructura general:

   ```js
   import { createSignal, createEffect, renderTemplate } from "@luminjs/runtime";
   // [1] Inyección del script del usuario
   // [2] Definición de la función de render/hydrate
   export function renderToString(props) {
     // Devuelve un string HTML estático
   }

   export function hydrate(root, props) {
     // Adjunta listeners y reactividad sobre el DOM existente
   }
   ```

   Para el MVP se puede simplificar:

   - `renderToString` genera HTML concatenando strings a partir del AST.
   - `hydrate` busca nodos por posición/estructura y asigna listeners (`addEventListener`).

---

## 4. Runtime mínimo en JS (no implementado en Rust, solo dependencia)

El compilador asumirá que existe un runtime (prototipo) `@luminjs/runtime` con:

```ts
export function signal(initialValue) {
  let value = initialValue;
  const subscribers = new Set();

  function readWrite(next) {
    if (arguments.length === 0) {
      // lectura
      return value;
    } else {
      // escritura
      value = next;
      subscribers.forEach(fn => fn(value));
      return value;
    }
  }

  Object.defineProperty(readWrite, "value", {
    get() {
      return value; // lectura no reactiva
    },
  });

  readWrite._subscribe = (fn) => {
    subscribers.add(fn);
    return () => subscribers.delete(fn);
  };

  return readWrite;
}

export function effect(fn) {
  fn();
}

export function renderTemplate(root, templateFn) {
  // MVP: re-render completo (limpiar y volver a pintar)
  while (root.firstChild) root.removeChild(root.firstChild);
  root.appendChild(templateFn());
}
```

> Nota: Este runtime se define en JS separado del compilador Rust. El compilador solo genera imports hacia él.

---

## 5. Estrategia de `renderToString` y `hydrate`

### 5.1. `renderToString`

- Entrada: `props` (para el componente raíz, opcional en el MVP).
- Proceso:
  - Recorrer el AST de `template`.
  - Para cada `ElementNode`:
    - Generar `<tag ...attrs>children</tag>`.
  - Para cada `Text`: escapar HTML.
  - Para cada `Expr`:
    - Generar `${exprJS}` donde `exprJS` es el código JS equivalente.
- MVP simplificado:
  - Se puede generar una función como:

    ```js
    export function renderToString(props) {
      return `<div>${count()}</div>`; // generado
    }
    ```

  - El runtime JS se encarga de evaluar `count()` cuando se llame `renderToString`.

### 5.2. `hydrate(root, props)`

- Asume que `root.innerHTML` ya contiene el HTML generado por `renderToString`.
- El compilador genera código que:
  - Selecciona los nodos relevantes (por índice o por `data-lumin-id`).
  - Ata listeners de eventos:

    ```js
    button.addEventListener("click", inc);
    ```

  - Crea efectos rudimentarios que reaccionen cuando cambian signals y actualicen el DOM correspondiente.

En el MVP, se puede inicialmente:

- No rehidratar texto de manera granular; simplemente **re-renderizar todo el contenido** del root cuando cambie cualquier signal, usando `renderTemplate`.

---

## 6. CLI en Rust (`luminc`)

### 6.1. Comportamiento del comando principal

Binario: `luminc`.

Uso mínimo del MVP:

```bash
luminc build <entry.lumin> --out <out-dir>
```

Comportamiento:

1. Lee `entry.lumin`.
2. Ejecuta el pipeline: Lexer → Parser → Validación → Codegen.
3. Escribe un archivo `.js` en el directorio de salida:

   - Nombre: mismo basename que la entrada.
   - Ejemplo:
     - Input: `src/App.lumin`.
     - Output: `dist/App.js`.

4. Opcionalmente, soportar `--watch` más adelante (no en el MVP inicial).

### 6.2. Ejemplo de salida JS (forma simplificada)

Entrada:

```lumin
---
import { Card } from "./Card.lumin"
---

<script>
const count = signal(0)

function inc() {
  count(count() + 1)
}
</script>

<Card>
  <h1>{count()}</h1>

  <button onClick={inc}>
    Increment
  </button>
</Card>
```

Salida JS (conceptual, simplificada):

```js
import { signal, effect, renderTemplate } from "@luminjs/runtime";

const count = signal(0);

function inc() {
  count(count() + 1);
}

function AppComponent() {
  const root = document.createElement("div");

  const h1 = document.createElement("h1");
  h1.textContent = String(count());
  root.appendChild(h1);

  const button = document.createElement("button");
  button.textContent = "Increment";
  button.addEventListener("click", inc);
  root.appendChild(button);

  // Re-render naive cuando cambie count
  count._subscribe(() => {
    h1.textContent = String(count());
  });

  return root;
}

export function renderToString(props) {
  // MVP: usar DOM en memoria (JSDOM u otro) o limitar a cliente.
  // Como MVP, se puede dejar sin implementación real y documentado.
  return "";
}

export function hydrate(root, props) {
  const app = AppComponent();
  while (root.firstChild) root.removeChild(root.firstChild);
  root.appendChild(app);
}
```

> Nota: El MVP puede centrarse primero en `hydrate` (cliente) y dejar `renderToString` como placeholder documentado, o implementar un render estático más adelante.

---

## 7. Integración mínima con Bun

El proyecto usará **Bun** como runtime JS y package manager para el entorno de desarrollo.

Para el MVP del compilador Rust:

1. Se publica el binario `luminc` (compilado en Rust).
2. Se crea un paquete npm (compatible con Bun) `@luminjs/cli` que:
   - En `postinstall` descarga el binario adecuado para la plataforma desde GitHub Releases.
   - Expone un binario `luminc` en `node_modules/.bin`.

Ejemplo de `package.json` (o `bunfig.toml`) de un proyecto usuario:

```json
{
  "name": "my-lumin-app",
  "scripts": {
    "build": "luminc build src/App.lumin --out dist"
  },
  "devDependencies": {
    "@luminjs/cli": "^0.0.1"
  },
  "dependencies": {
    "@luminjs/runtime": "^0.0.1"
  }
}
```

Uso con Bun:

```bash
bun install
bun run build
```

Más adelante, se podrá integrar `luminc` como plugin de Vite/Bun, pero eso queda fuera del MVP.

---

## 8. Roadmap inmediato tras el MVP

Una vez que este MVP esté funcionando (parseo → AST → JS simple + CLI), los siguientes pasos naturales serían:

- **Soportar condicionales y loops en el template** (`@if`, `@each`, etc. o similar).
- **Mejorar la reactividad** hacia un modelo realmente fine-grained (inspirado en SolidJS).
- **Implementar `renderToString` real** para SSG/SSR.
- **Soportar islands** (marcar qué componentes se hidratan en cliente y cuáles son solo estáticos).
- **Integración con bundlers** (plugin para Vite/Bun).
