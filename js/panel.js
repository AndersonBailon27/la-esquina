// Panel del local: login, pedidos en tiempo real con sonido, carta editable y datos del local
import {
  db, auth, signInWithEmailAndPassword, signOut, onAuthStateChanged,
  collection, doc, onSnapshot, query, where, orderBy, Timestamp,
  updateDoc, setDoc, addDoc, deleteDoc, writeBatch,
  CATEGORIAS, ESTADOS, soles, esc,
} from "./firebase.js";
import { CARTA_INICIAL, CONFIG_INICIAL } from "./carta-inicial.js";

const $ = s => document.querySelector(s);
let cancelar = [];
let pedidos = [], productos = [], vistos = new Set(), primeraCarga = true;
let audio = null;

const toast = msg => { const t = $("#toast"); t.textContent = msg; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => t.hidden = true, 2200); };

// ---------- Sesión ----------
onAuthStateChanged(auth, user => {
  cancelar.forEach(f => f()); cancelar = [];
  $("#vistaLogin").hidden = !!user;
  $("#vistaPanel").hidden = !user;
  $("#btnSalir").hidden = !user;
  $("#btnSonido").hidden = !user || !!audio;
  if (user) iniciar();
});

$("#formLogin").addEventListener("submit", async e => {
  e.preventDefault();
  const err = $("#lError"); err.hidden = true;
  try { await signInWithEmailAndPassword(auth, $("#lCorreo").value.trim(), $("#lClave").value); }
  catch { err.textContent = "Correo o contraseña incorrectos."; err.hidden = false; }
});
$("#btnSalir").addEventListener("click", () => signOut(auth));

// ---------- Sonido ----------
$("#btnSonido").addEventListener("click", () => {
  audio = new (window.AudioContext || window.webkitAudioContext)();
  $("#btnSonido").hidden = true; sonar(); toast("Sonido activado");
});
function sonar() {
  if (!audio) return;
  [0, 0.25, 0.5].forEach(t => {
    const o = audio.createOscillator(), g = audio.createGain();
    o.frequency.value = 880; o.type = "square"; g.gain.value = 0.15;
    o.connect(g); g.connect(audio.destination);
    o.start(audio.currentTime + t); o.stop(audio.currentTime + t + 0.15);
  });
  navigator.vibrate?.([200, 100, 200]);
}

// ---------- Datos ----------
function iniciar() {
  primeraCarga = true;
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const q = query(collection(db, "pedidos"), where("creado", ">=", Timestamp.fromDate(hoy)), orderBy("creado", "desc"));
  cancelar.push(onSnapshot(q, snap => {
    pedidos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const nuevos = pedidos.filter(p => p.estado === 0 && !vistos.has(p.id));
    if (!primeraCarga && nuevos.length) { sonar(); toast("¡Nuevo pedido!"); document.title = "🔴 Nuevo pedido · La Esquina"; }
    nuevos.forEach(p => vistos.add(p.id));
    primeraCarga = false;
    pintarPedidos();
  }, err => { $("#pedidos").innerHTML = `<p class="error">No se pudieron leer los pedidos (${esc(err.code)}). ¿Este usuario está autorizado en las reglas?</p>`; }));

  cancelar.push(onSnapshot(collection(db, "productos"), snap => {
    productos = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
    pintarCarta();
  }));

  cancelar.push(onSnapshot(doc(db, "config", "local"), snap => {
    const c = snap.exists() ? snap.data() : CONFIG_INICIAL;
    $("#cAbierto").checked = c.abierto !== false;
    $("#cEnvio").value = c.envio ?? 0;
    $("#cYape").value = c.yape ?? "";
    $("#cWsp").value = c.whatsapp ?? "";
    $("#cHorario").value = c.horario ?? "";
  }));
}

// ---------- Pedidos ----------
const ACCION = ["Aceptar y preparar", "Marcar en camino", "Marcar entregado"];
function pintarPedidos() {
  $("#kNuevos").textContent = pedidos.filter(p => p.estado === 0).length;
  $("#kActivos").textContent = pedidos.filter(p => p.estado > 0 && p.estado < 3).length;
  $("#kVentas").textContent = "S/ " + Math.round(pedidos.filter(p => p.estado !== 9 && p.pagoEstado !== "por_verificar").reduce((a, p) => a + (p.total || 0), 0));
  if (!pedidos.some(p => p.estado === 0)) document.title = "Panel · La Esquina";
  if (!pedidos.length) { $("#pedidos").innerHTML = `<div class="vacio"><b>Aún no hay pedidos hoy</b><br>Cuando un cliente pida desde la app, aparecerá aquí con sonido.</div>`; return; }
  $("#pedidos").innerHTML = pedidos.map(p => {
    const hora = p.creado?.toDate?.().toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" }) ?? "ahora";
    const recojo = p.modo === "recojo";
    const porVerificar = p.estado === 0 && p.pagoEstado === "por_verificar";
    const nombreEstado = p.estado === 9 ? "Rechazado" : porVerificar ? "Pago por verificar" : recojo && p.estado === 2 ? "Listo" : ESTADOS[p.estado]?.corto;
    const accion = porVerificar ? "" : p.estado < 3 ? (recojo && p.estado === 1 ? "Marcar listo" : recojo && p.estado === 2 ? "Marcar recogido" : ACCION[p.estado]) : "";
    const pagoTxt = p.pago === "yape"
      ? `Yape/Plin · Op. <b>${esc(p.operacion || "—")}</b> · ${p.pagoEstado === "verificado" ? "✅ pago confirmado" : p.pagoEstado === "por_verificar" ? "⏳ por verificar" : ""}`
      : "Efectivo" + (p.vuelto ? ` · paga con ${soles(p.vuelto)} (vuelto ${soles(p.vuelto - p.total)})` : "");
    return `<div class="pedido ${p.estado === 0 ? "nuevo" : ""}">
      <div class="ped-top"><b>${esc(p.codigo)} · ${esc(p.cliente?.nombre)}</b><span class="chip e${p.estado}">${nombreEstado}</span></div>
      <div class="ped-items">${(p.items || []).map(i => `${i.q} × ${esc(i.n)} <span style="float:right">${soles(i.p * i.q)}</span>`).join("<br>")}</div>
      <div class="ped-items">${hora} · ${recojo ? "Recojo en local" : "Delivery: " + esc(p.cliente?.dir)}<br>${pagoTxt} · Cel. ${esc(p.cliente?.cel)}</div>
      ${porVerificar ? `<div class="yape">Revisa tu Yape: debe haber entrado <b>${soles(p.total)}</b> con la operación <b>${esc(p.operacion)}</b>.</div>` : ""}
      <div class="ped-top"><b>${soles(p.total)}</b>
        <span class="acciones">${porVerificar
          ? `<button class="btn-lin" data-rechazar="${p.id}" data-motivo="No llegó el pago">No llegó el pago</button><button class="btn-sec" data-pagook="${p.id}">Pago recibido</button>`
          : `${p.estado === 0 ? `<button class="btn-lin" data-rechazar="${p.id}">Rechazar</button>` : ""}${accion ? `<button class="btn-sec" data-avanzar="${p.id}">${accion}</button>` : ""}`}</span></div>
    </div>`;
  }).join("");
}

// ---------- Carta ----------
function pintarCarta() {
  $("#pCat").innerHTML = CATEGORIAS.map(c => `<option value="${c.id}">${c.nombre}</option>`).join("");
  if (!productos.length) {
    $("#editorCarta").innerHTML = `<div class="vacio"><b>La carta está vacía</b><br>Carga la carta de ejemplo y luego ajusta precios.<br><br><button class="btn-sec" id="btnSembrar">Cargar carta de ejemplo</button></div>`;
    return;
  }
  // No redibujar mientras el cajero está escribiendo en un campo (se perdería lo que escribe)
  const foco = document.activeElement;
  if (foco && $("#editorCarta").contains(foco) && foco.matches("input:not([type=checkbox]):not([type=file])")) { redibujarCarta = true; return; }
  redibujarCarta = false;
  $("#editorCarta").innerHTML = CATEGORIAS.map(c => {
    const items = productos.filter(p => p.categoria === c.id); if (!items.length) return "";
    return `<h2 class="sec">${c.nombre}</h2>` + items.map(p => `<div class="editar2">
      <label class="foto" title="Cambiar foto">
        ${p.foto ? `<img src="${esc(p.foto)}" alt="">` : `<span>📷<br>Foto</span>`}
        <input type="file" accept="image/*" data-foto="${p.id}" hidden>
      </label>
      <div class="campos">
        <input value="${esc(p.nombre)}" data-campo="nombre" data-id="${p.id}" maxlength="60" aria-label="Nombre del plato">
        <input value="${esc(p.desc)}" data-campo="desc" data-id="${p.id}" maxlength="120" placeholder="Descripción" aria-label="Descripción de ${esc(p.nombre)}">
        <div class="fila-ctrl">
          <span class="soles">S/</span><input type="number" step="0.5" min="0" value="${p.precio}" data-precio="${p.id}" aria-label="Precio de ${esc(p.nombre)}">
          <label class="switch"><input type="checkbox" data-disp="${p.id}" ${p.disponible === false ? "" : "checked"}> Hay</label>
          <button class="btn-lin borrar" data-borrar="${p.id}">Eliminar</button>
        </div>
      </div>
    </div>`).join("");
  }).join("");
}
let redibujarCarta = false;
document.addEventListener("focusout", () => { if (redibujarCarta) setTimeout(pintarCarta, 50); });

// Achica la foto en el celular antes de guardarla (≈ 400 px, unos 40–80 KB)
function comprimirFoto(archivo, lado = 480) {
  return new Promise((ok, mal) => {
    const url = URL.createObjectURL(archivo), img = new Image();
    img.onload = () => {
      const k = Math.min(1, lado / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      let q = 0.75, data = c.toDataURL("image/jpeg", q);
      while (data.length > 200000 && q > 0.35) { q -= 0.1; data = c.toDataURL("image/jpeg", q); }
      ok(data);
    };
    img.onerror = () => { URL.revokeObjectURL(url); mal(new Error("No se pudo leer la imagen")); };
    img.src = url;
  });
}

async function sembrar() {
  const b = writeBatch(db);
  CARTA_INICIAL.forEach((p, i) => b.set(doc(collection(db, "productos")), { ...p, tag: p.tag || "", foto: "", disponible: true, orden: i }));
  b.set(doc(db, "config", "local"), CONFIG_INICIAL, { merge: true });
  await b.commit(); toast("Carta cargada");
}

// ---------- Eventos ----------
document.addEventListener("click", async e => {
  const b = e.target.closest("button"); if (!b) return;
  try {
    if (b.dataset.sub) {
      document.querySelectorAll("[data-sub]").forEach(x => x.setAttribute("aria-selected", x === b));
      $("#subPedidos").hidden = b.dataset.sub !== "pedidos";
      $("#subCarta").hidden = b.dataset.sub !== "carta";
      $("#subLocal").hidden = b.dataset.sub !== "local";
    } else if (b.dataset.avanzar) {
      const p = pedidos.find(x => x.id === b.dataset.avanzar);
      b.disabled = true; await updateDoc(doc(db, "pedidos", p.id), { estado: p.estado + 1 });
    } else if (b.dataset.rechazar) {
      if (b.dataset.confirmar !== "1") { b.dataset.confirmar = "1"; b.textContent = "¿Seguro? Toca otra vez"; return; }
      b.disabled = true; await updateDoc(doc(db, "pedidos", b.dataset.rechazar), { estado: 9, motivo: b.dataset.motivo || "" });
    } else if (b.dataset.pagook) {
      b.disabled = true; await updateDoc(doc(db, "pedidos", b.dataset.pagook), { pagoEstado: "verificado", estado: 1 });
    } else if (b.dataset.borrar) {
      if (b.dataset.confirmar !== "1") { b.dataset.confirmar = "1"; b.textContent = "¿Seguro?"; setTimeout(() => { b.dataset.confirmar = ""; b.textContent = "Eliminar"; }, 4000); return; }
      b.disabled = true; await deleteDoc(doc(db, "productos", b.dataset.borrar)); toast("Plato eliminado");
    } else if (b.id === "btnSembrar") {
      b.disabled = true; await sembrar();
    }
  } catch (err) { console.error(err); toast("No se pudo guardar. Revisa la conexión."); b.disabled = false; }
});

document.addEventListener("change", async e => {
  const t = e.target;
  try {
    if (t.dataset.precio) { await updateDoc(doc(db, "productos", t.dataset.precio), { precio: Number(t.value) || 0 }); toast("Precio guardado"); }
    if (t.dataset.disp) { await updateDoc(doc(db, "productos", t.dataset.disp), { disponible: t.checked }); toast(t.checked ? "Disponible" : "Marcado como agotado"); }
    if (t.dataset.campo) {
      const v = t.value.trim();
      if (t.dataset.campo === "nombre" && !v) { toast("El nombre no puede quedar vacío"); return; }
      await updateDoc(doc(db, "productos", t.dataset.id), { [t.dataset.campo]: v }); toast("Guardado");
    }
    if (t.dataset.foto && t.files[0]) {
      toast("Subiendo foto…");
      const foto = await comprimirFoto(t.files[0]);
      await updateDoc(doc(db, "productos", t.dataset.foto), { foto }); toast("Foto guardada");
    }
    if (t.id === "pFotoArchivo") {
      $("#pFotoVista").innerHTML = t.files[0] ? `<img src="${URL.createObjectURL(t.files[0])}" alt="">` : "📷<br>Elegir foto";
    }
  } catch (err) { console.error(err); toast("No se pudo guardar."); }
});

$("#formPlato").addEventListener("submit", async e => {
  e.preventDefault();
  const btn = e.target.querySelector("button[type=submit]"); btn.disabled = true;
  try {
    const archivo = $("#pFotoArchivo").files[0];
    const foto = archivo ? await comprimirFoto(archivo) : "";
    await addDoc(collection(db, "productos"), {
      nombre: $("#pNombre").value.trim(), desc: $("#pDesc").value.trim(), categoria: $("#pCat").value,
      precio: Number($("#pPrecio").value) || 0, foto, tag: "", disponible: true,
      orden: Math.max(0, ...productos.map(p => p.orden ?? 0)) + 1,
    });
    e.target.reset(); $("#pFotoVista").innerHTML = "📷<br>Elegir foto"; toast("Plato agregado");
  } catch (err) { console.error(err); toast("No se pudo agregar."); }
  btn.disabled = false;
});

$("#formLocal").addEventListener("submit", async e => {
  e.preventDefault();
  try {
    await setDoc(doc(db, "config", "local"), {
      abierto: $("#cAbierto").checked, envio: Number($("#cEnvio").value) || 0,
      yape: $("#cYape").value.trim(), whatsapp: $("#cWsp").value.trim(), horario: $("#cHorario").value.trim(),
    }, { merge: true });
    toast("Datos del local guardados");
  } catch (err) { console.error(err); toast("No se pudo guardar."); }
});
