// Carta de ejemplo. Se carga desde el panel con el botón "Cargar carta de ejemplo".
// Cambia nombres y precios aquí o, mejor, desde el panel una vez cargada.
export const CARTA_INICIAL = [
  { categoria: "pollos", nombre: "1/8 de pollo", desc: "Papas y ensalada", precio: 12 },
  { categoria: "pollos", nombre: "1/4 de pollo", desc: "Pecho o pierna, papas y ensalada", precio: 19, tag: "Más pedido" },
  { categoria: "pollos", nombre: "1/2 pollo", desc: "Papas familiares y ensalada", precio: 34 },
  { categoria: "pollos", nombre: "Pollo entero", desc: "Papas familiares, ensalada y cremas", precio: 62 },
  { categoria: "pollos", nombre: "Mostrito", desc: "1/8 de pollo, chaufa y papas", precio: 16 },
  { categoria: "chifa", nombre: "Arroz chaufa de pollo", desc: "Con huevo y cebolla china", precio: 16 },
  { categoria: "chifa", nombre: "Aeropuerto", desc: "Chaufa con tallarín saltado", precio: 20, tag: "Favorito" },
  { categoria: "chifa", nombre: "Tallarín saltado de pollo", desc: "Fideo chino, verduras y sillao", precio: 18 },
  { categoria: "chifa", nombre: "Pollo enrollado", desc: "Con chaufa", precio: 22 },
  { categoria: "chifa", nombre: "Wantán frito (12 u.)", desc: "Con salsa tamarindo", precio: 10 },
  { categoria: "chifa", nombre: "Kam lu wantán", desc: "Pollo, cerdo, wantán y piña", precio: 25 },
  { categoria: "combos", nombre: "Combo Esquina", desc: "1/2 pollo + chaufa + gaseosa 1 L", precio: 45 },
  { categoria: "combos", nombre: "Combo Familiar", desc: "1 pollo + aeropuerto + gaseosa 1.5 L", precio: 82 },
  { categoria: "combos", nombre: "Combo Pareja", desc: "1/4 pollo + chaufa + 2 chichas", precio: 36 },
  { categoria: "bebidas", nombre: "Inca Kola 1 L", desc: "", precio: 7 },
  { categoria: "bebidas", nombre: "Coca-Cola 1.5 L", desc: "", precio: 9 },
  { categoria: "bebidas", nombre: "Chicha morada (jarra)", desc: "Hecha en casa", precio: 10 },
  { categoria: "bebidas", nombre: "Agua sin gas 625 ml", desc: "", precio: 2.5 },
];

export const CONFIG_INICIAL = {
  abierto: true,
  envio: 3,
  yape: "9XX XXX XXX",
  whatsapp: "",
  horario: "Todos los días, 12:00 a 11:00 p. m.",
};
