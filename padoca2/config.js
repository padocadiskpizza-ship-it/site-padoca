// ============================================================
// Configuração da API (backend)
// ============================================================
// Em desenvolvimento local (node server.js), deixe vazio para usar
// o mesmo domínio (window.location.origin).
//
// Em produção (Netlify + backend em outro host), coloque a URL
// completa do backend, ex.:
//   window.PADOCA_API_BASE = "https://padoca-api.onrender.com";
//
// Sem barra no final.
window.PADOCA_API_BASE = "";
window.PADOCA_API = function (path) {
  const base = (window.PADOCA_API_BASE || "").replace(/\/$/, "");
  const p = path.startsWith("/") ? path : "/" + path;
  return (base || window.location.origin) + p;
};