// Conexión a Firebase (SDK modular desde el CDN oficial de Google)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

export * from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
export { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// Utilidades compartidas
export const CATEGORIAS = [
  { id: "pollos",  nombre: "Pollos a la brasa", corto: "Pollos", sub: "Con papas fritas, ensalada y cremas" },
  { id: "chifa",   nombre: "Chifa", corto: "Chifa", sub: "Al wok, porciones generosas" },
  { id: "combos",  nombre: "Combos", corto: "Combos", sub: "Para compartir" },
  { id: "bebidas", nombre: "Bebidas", corto: "Bebidas", sub: "Heladas" },
];
export const ESTADOS = [
  { t: "Pedido recibido", s: "El local está revisando tu pedido", corto: "Nuevo" },
  { t: "Preparando", s: "Tu pedido está en la cocina", corto: "Preparando" },
  { t: "En camino", s: "El motorizado salió del local", corto: "En camino" },
  { t: "Entregado", s: "¡Buen provecho!", corto: "Entregado" },
];
export const soles = n => "S/ " + Number(n || 0).toFixed(2);
export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
