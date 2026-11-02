# La Esquina · App de pedidos

App de pedidos de la pollería y chifa La Esquina (La Aguada, Mala), hecha con HTML, JavaScript y Firebase.

## Archivos

| Archivo | Para qué sirve |
|---|---|
| `index.html` + `js/cliente.js` | App del cliente: carta, carrito, pedido y seguimiento en vivo |
| `panel.html` + `js/panel.js` | Panel del local: login, pedidos con sonido, carta editable, abrir/cerrar |
| `js/firebase.js` | Conexión a Firebase y funciones compartidas |
| `js/firebase-config.js` | Datos del proyecto Firebase `la-esquina-8c87c` |
| `js/carta-inicial.js` | Carta de ejemplo que se carga desde el panel |
| `firestore.rules` | Reglas de seguridad (se copian en la consola de Firebase) |
| `manifest.json`, `sw.js`, `img/` | Para que se instale como app en el celular |

## Cómo probarla en tu computadora

Los módulos de JavaScript no funcionan abriendo el archivo con doble clic. Usa la extensión **Live Server** de VS Code:

1. Abre la carpeta `la-esquina` en VS Code.
2. Instala la extensión "Live Server" (de Ritwick Dey).
3. Clic derecho en `index.html` → **Open with Live Server**.
4. El panel está en `/panel.html`.

## Primera vez

1. Publica las reglas: en la consola de Firebase, Firestore Database → Reglas → pega el contenido de `firestore.rules` → Publicar. (Ya están publicadas; repite esto solo si cambias el archivo.)
2. Entra a `panel.html` con el usuario de la caja.
3. Pestaña **Carta** → "Cargar carta de ejemplo". Luego ajusta precios.
4. Pestaña **Local** → pon el número de Yape y el costo de envío.
5. Haz un pedido de prueba desde `index.html` y míralo llegar al panel.

## Estados del pedido

0 Nuevo → 1 Preparando → 2 En camino (o Listo, si es recojo) → 3 Entregado · 9 Rechazado
