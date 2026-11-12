/* ==========================================================================
   OPS — medição de acesso (Vercel Web Analytics): anônima, sem cookies.
   Visitas e páginas contam sozinhas no site publicado; os eventos abaixo
   registram o uso que interessa ao relatório do 2º Congresso (downloads,
   relatos, canais da ARCON e dos órgãos). Fora da Vercel (file://, localhost)
   nada é carregado e OPS.medir não faz nada.
   ========================================================================== */
"use strict";

window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
(() => {
  const h = location.hostname;
  if (!/^https?:$/.test(location.protocol) || h === "localhost" || h === "127.0.0.1" || h.endsWith(".localhost")) return;
  const s = document.createElement("script");
  s.defer = true;
  s.src = "/_vercel/insights/script.js";
  document.head.appendChild(s);
})();

OPS.medir = (nome, dados) => { try { window.va("event", { name: nome, data: dados || {} }); } catch (e) {} };

/* downloads de dados abertos e saídas para canais externos, num só ouvinte */
document.addEventListener("click", e => {
  const a = e.target.closest("a[href]");
  if (!a) return;
  const href = a.getAttribute("href"), mun = OPS.estado.mun ? OPS.estado.mun.id : "";
  if (href.startsWith("dados/")) OPS.medir("download", { arquivo: href.slice(6), mun });
  else if (a.dataset.medir) OPS.medir("canal", { destino: a.dataset.medir, mun });
});
