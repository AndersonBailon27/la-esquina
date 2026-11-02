// App del cliente: carta en vivo, carrito, envío del pedido y seguimiento en tiempo real
import { db, collection, doc, onSnapshot, addDoc, serverTimestamp, CATEGORIAS, ESTADOS, soles, esc } from "./firebase.js";

const ICO = {
  pollos: '<svg viewBox="0 0 40 40"><path d="M8 27c0-7 4-12 9-12 2 0 2-2 2-4 0-2 2-4 4-4s3 2 3 3l3 1-3 2c0 3-1 4-2 5 1 2 2 5 1 7-1 4-5 7-9 7s-8-2-8-5z" fill="#FFC72C"/></svg>',
  chifa: '<svg viewBox="0 0 40 40"><path d="M6 20h28c0 8-6 13-14 13S6 28 6 20z" fill="#FFC72C"/><rect x="5" y="18" width="30" height="3" rx="1.5" fill="#FFC72C"/><path d="M24 6l8 12M28 5l6 12" stroke="#FFC72C" stroke-width="2" stroke-linecap="round"/></svg>',
  combos: '<svg viewBox="0 0 40 40"><rect x="6" y="12" width="20" height="18" rx="3" fill="#FFC72C"/><path d="M28 14h6l-2 18h-4z" fill="#FFC72C"/><path d="M10 12l3-5h6l3 5" stroke="#FFC72C" stroke-width="2" fill="none"/></svg>',
  bebidas: '<svg viewBox="0 0 40 40"><path d="M12 10h16l-2 24H14z" fill="#FFC72C"/><path d="M22 10l4-6" stroke="#FFC72C" stroke-width="2" stroke-linecap="round"/></svg>',
};

const $ = s => document.querySelector(s);
let productos = [];          // desde Firestore
let config = { abierto: true, envio: 3, yape: "", horario: "" };
let carrito = {};             // idProducto -> cantidad
let tabActiva = "pollos";
let modo = "delivery", pago = "yape";
let enviando = false;
let pedidoActual = null, cancelarSeguimiento = null;

const leer = k => { try { return localStorage.getItem(k); } catch { return null; } };
const guardar = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} };

// ---------- Datos en vivo ----------
onSnapshot(collection(db, "productos"), snap => {
  productos = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
  // quitar del carrito lo que ya no existe o se agotó
  for (const id of Object.keys(carrito)) { const p = productos.find(x => x.id === id); if (!p || p.disponible === false) delete carrito[id]; }
  pintarTabs(); pintarCarta(); pintarBarra();
}, err => { $("#carta").innerHTML = `<p class="error">No se pudo cargar la carta. Revisa tu conexión.</p>`; console.error(err); });

onSnapshot(doc(db, "config", "local"), snap => {
  if (snap.exists()) config = { ...config, ...snap.data() };
  const ab = config.abierto !== false;
  $("#estadoLocal").innerHTML = `<span class="punto ${ab ? "" : "cerrado"}"></span> ${ab ? "Abierto" : "Cerrado"} · Delivery 30–45 min · Envío ${soles(config.envio)}`;
  $("#avisoCerrado").hidden = ab;
  pintarBarra();
});

// ---------- Carta ----------
function pintarTabs() {
  $("#tabs").innerHTML = CATEGORIAS.filter(c => productos.some(p => p.categoria === c.id))
    .map(c => `<button class="tab" role="tab" aria-selected="${c.id === tabActiva}" data-tab="${c.id}">${c.corto}</button>`).join("");
}
function pintarCarta() {
  const cat = CATEGORIAS.find(c => c.id === tabActiva);
  const items = productos.filter(p => p.categoria === tabActiva);
  if (!productos.length) { $("#carta").innerHTML = `<div class="vacio" style="margin-top:16px">La carta aún no está cargada.</div>`; return; }
  $("#carta").innerHTML = `<h2 class="sec">${cat.nombre}</h2><p class="sec-sub">${cat.sub}</p>
  <div class="lista">${items.map(i => {
    const q = carrito[i.id] || 0, agot = i.disponible === false;
    const img = i.foto ? `<img src="${esc(i.foto)}" alt="" loading="lazy">` : ICO[i.categoria];
    return `<div class="plato ${agot ? "agotado" : ""}"><div class="ico">${img}</div>
      <div class="info"><h3>${esc(i.nombre)}${i.tag ? `<span class="tag">${esc(i.tag)}</span>` : ""}</h3>${i.desc ? `<p>${esc(i.desc)}</p>` : ""}<div class="precio">${agot ? "Agotado" : soles(i.precio)}</div></div>
      <div class="ctrl">${q ? `<button class="menos" data-menos="${i.id}" aria-label="Quitar ${esc(i.nombre)}">−</button><span class="cant">${q}</span>` : ""}<button class="mas" data-mas="${i.id}" aria-label="Agregar ${esc(i.nombre)}" ${agot ? "disabled" : ""}>+</button></div></div>`;
  }).join("")}</div>`;
}
function totales() {
  let sub = 0, n = 0;
  for (const [id, q] of Object.entries(carrito)) { const p = productos.find(x => x.id === id); if (p) { sub += p.precio * q; n += q; } }
  const envio = modo === "delivery" && n ? Number(config.envio || 0) : 0;
  return { sub, n, envio, total: sub + envio };
}
function pintarBarra() {
  const t = totales();
  $("#barra").hidden = !t.n;
  $("#nItems").textContent = t.n;
  $("#tBarra").textContent = soles(t.sub);
}
function cambiar(id, d) {
  carrito[id] = (carrito[id] || 0) + d; if (carrito[id] <= 0) delete carrito[id];
  pintarCarta(); pintarBarra();
}

// ---------- Hojas ----------
const abrir = html => { $("#hoja").innerHTML = html; $("#velo").hidden = false; };
const cerrar = () => { $("#velo").hidden = true; };
const val = id => document.getElementById(id)?.value ?? "";

function hojaCarrito(error = "") {
  const t = totales();
  const prev = { n: val("fNombre") || leer("le_nombre") || "", c: val("fCel") || leer("le_cel") || "", d: val("fDir") || leer("le_dir") || "", v: val("fVuelto"), o: val("fOper") };
  const filas = Object.entries(carrito).map(([id, q]) => { const p = productos.find(x => x.id === id); return `<div class="fila"><span>${q} × ${esc(p.nombre)}</span><span>${soles(p.precio * q)}</span></div>`; }).join("");
  const ab = config.abierto !== false;
  abrir(`<button class="cerrar" data-cerrar aria-label="Cerrar">×</button><h2>Tu pedido</h2>${filas}
    ${modo === "delivery" ? `<div class="fila"><span>Envío</span><span>${soles(t.envio)}</span></div>` : ""}
    <div class="fila total"><span>Total</span><span>${soles(t.total)}</span></div>
    <label>¿Cómo lo quieres?</label>
    <div class="opciones">
      <button class="op" data-modo="delivery" aria-pressed="${modo === "delivery"}">Delivery<small>30–45 min · ${soles(config.envio)}</small></button>
      <button class="op" data-modo="recojo" aria-pressed="${modo === "recojo"}">Recojo en local<small>Listo en 20 min</small></button>
    </div>
    <label for="fNombre">Nombre</label><input id="fNombre" autocomplete="name" maxlength="60" placeholder="Ej. Rosa Quispe" value="${esc(prev.n)}">
    <label for="fCel">Celular</label><input id="fCel" inputmode="tel" maxlength="15" placeholder="9 dígitos" value="${esc(prev.c)}">
    ${modo === "delivery" ? `<label for="fDir">Dirección y referencia</label><textarea id="fDir" rows="2" maxlength="200" placeholder="Ej. Calle 28 de Julio Mz. I, al lado de la comunidad">${esc(prev.d)}</textarea>` : ""}
    <label>Pago</label>
    <div class="opciones">
      <button class="op" data-pago="yape" aria-pressed="${pago === "yape"}">Yape / Plin<small>Al número del local</small></button>
      <button class="op" data-pago="efectivo" aria-pressed="${pago === "efectivo"}">Efectivo<small>Paga al recibir</small></button>
    </div>
    ${pago === "yape" ? `<div class="yape"><b>Paga primero:</b><br>1. Yapea <b>${soles(t.total)}</b> al <b>${esc(config.yape || "número del local")}</b> (La Esquina).<br>2. Copia el <b>número de operación</b> que te muestra Yape y escríbelo aquí abajo.<br>Tu pedido pasa a cocina cuando el local confirme el pago.</div>
      <label for="fOper">Número de operación de Yape / Plin</label><input id="fOper" inputmode="numeric" maxlength="20" placeholder="Ej. 12345678" value="${esc(prev.o)}">`
      : `<label for="fVuelto">¿Con cuánto pagas? (para el vuelto)</label><input id="fVuelto" inputmode="decimal" maxlength="6" placeholder="Ej. 50" value="${esc(prev.v)}">`}
    ${error ? `<div class="error">${error}</div>` : ""}
    <button class="btn-pri" id="confirmar" ${ab && !enviando ? "" : "disabled"}>${enviando ? "Enviando…" : !ab ? "El local está cerrado" : pago === "yape" ? `Ya pagué · enviar pedido` : `Confirmar pedido · ${soles(t.total)}`}</button>
    <p class="nota">${pago === "yape" ? "Si el pago no llega, el local no preparará el pedido." : "El local confirma tu pedido en unos minutos."}</p>`);
}

async function confirmar() {
  const nombre = val("fNombre").trim(), cel = val("fCel").replace(/\D/g, ""), dir = modo === "delivery" ? val("fDir").trim() : "";
  const falta = [];
  if (!nombre) falta.push("tu nombre");
  if (cel.length !== 9) falta.push("un celular de 9 dígitos");
  if (modo === "delivery" && !dir) falta.push("la dirección");
  const operacion = pago === "yape" ? val("fOper").replace(/\s/g, "") : "";
  if (pago === "yape" && !/^[A-Za-z0-9]{4,20}$/.test(operacion)) falta.push("el número de operación de tu Yape");
  if (falta.length) return hojaCarrito("Falta " + falta.join(", ") + ".");
  const t = totales();
  const vuelto = pago === "efectivo" ? Number(val("fVuelto").replace(",", ".")) || 0 : 0;
  if (pago === "efectivo" && vuelto && vuelto < t.total) return hojaCarrito(`El monto para el vuelto debe ser mayor o igual a ${soles(t.total)}.`);
  guardar("le_nombre", nombre); guardar("le_cel", cel); if (dir) guardar("le_dir", dir);

  enviando = true; hojaCarrito();
  try {
    const ref = await addDoc(collection(db, "pedidos"), {
      codigo: Math.random().toString(36).slice(2, 6).toUpperCase(),
      cliente: { nombre, cel, dir },
      items: Object.entries(carrito).map(([id, q]) => { const p = productos.find(x => x.id === id); return { id, n: p.nombre, p: p.precio, q }; }),
      subtotal: t.sub, envio: t.envio, total: t.total,
      modo, pago, vuelto, estado: 0, creado: serverTimestamp(),
      pagoEstado: pago === "yape" ? "por_verificar" : "contra_entrega",
      operacion,
    });
    carrito = {}; enviando = false;
    guardar("le_pedido", ref.id);
    pintarCarta(); pintarBarra();
    seguir(ref.id, true);
  } catch (e) {
    console.error(e); enviando = false;
    hojaCarrito("No se pudo enviar el pedido. Revisa tu conexión e inténtalo otra vez.");
  }
}

// ---------- Seguimiento ----------
function seguir(id, abrirHoja) {
  cancelarSeguimiento?.();
  cancelarSeguimiento = onSnapshot(doc(db, "pedidos", id), snap => {
    if (!snap.exists()) { guardar("le_pedido", null); $("#btnMiPedido").hidden = true; return; }
    pedidoActual = { id, ...snap.data() };
    $("#btnMiPedido").hidden = pedidoActual.estado >= 3 || pedidoActual.estado === 9;
    if (abrirHoja || !$("#velo").hidden && $("#hoja").dataset.vista === "seg") hojaSeguimiento();
    abrirHoja = false;
  }, () => { guardar("le_pedido", null); });
}
function hojaSeguimiento() {
  const p = pedidoActual; if (!p) return;
  let cuerpo;
  if (p.estado === 9) {
    cuerpo = `<div class="vacio">El local no pudo atender este pedido${p.motivo ? `: ${esc(p.motivo)}` : ""}. Si pagaste por Yape, comunícate con el local.</div>`;
  } else {
    cuerpo = `<ol class="pasos">${ESTADOS.map((e, i) => {
      if (i === 0 && p.pagoEstado === "por_verificar") e = { t: "Verificando tu pago", s: `El local está confirmando tu Yape (operación ${esc(p.operacion)})` };
      if (i === 0 && p.pagoEstado === "verificado") e = { t: "Pago confirmado", s: "Recibimos tu Yape" };
      if (p.modo === "recojo" && i === 2) e = { t: "Listo para recoger", s: "Acércate al local" };
      const cls = i < p.estado || p.estado === 3 ? "hecho" : i === p.estado ? "actual" : "";
      return `<li class="paso ${cls}"><div class="bola">${cls === "hecho" ? "✓" : i + 1}</div><div><b>${e.t}</b><span>${e.s}</span></div></li>`;
    }).join("")}</ol>`;
  }
  abrir(`<button class="cerrar" data-cerrar aria-label="Cerrar">×</button><h2>Pedido ${esc(p.codigo)}</h2>
    <p class="nota" style="margin-top:-6px">${p.items.map(i => `${i.q} × ${esc(i.n)}`).join(" · ")} — <b>${soles(p.total)}</b></p>
    ${cuerpo}
    <p class="nota">Esta pantalla se actualiza sola. Puedes cerrarla y volver con “Mi pedido”.</p>`);
  $("#hoja").dataset.vista = "seg";
}

// ---------- Eventos ----------
document.addEventListener("click", e => {
  if (e.target.id === "velo") { cerrar(); return; }
  const b = e.target.closest("button"); if (!b) return;
  if (b.dataset.tab) { tabActiva = b.dataset.tab; pintarTabs(); pintarCarta(); }
  else if (b.dataset.mas) cambiar(b.dataset.mas, 1);
  else if (b.dataset.menos) cambiar(b.dataset.menos, -1);
  else if (b.id === "verCarrito") { $("#hoja").dataset.vista = "carrito"; hojaCarrito(); }
  else if (b.dataset.modo) { modo = b.dataset.modo; hojaCarrito(); }
  else if (b.dataset.pago) { pago = b.dataset.pago; hojaCarrito(); }
  else if (b.id === "confirmar") confirmar();
  else if (b.dataset.cerrar !== undefined) cerrar();
  else if (b.id === "btnMiPedido") hojaSeguimiento();
});

const pendiente = leer("le_pedido");
if (pendiente) seguir(pendiente, false);
