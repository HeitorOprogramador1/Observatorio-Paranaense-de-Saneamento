/* ==========================================================================
   OPS Paraná — Mapa e Unidades do Saneamento
   Estética institucional (estilo OPS Pará):
   - Mosaico de Satélite de Alta Resolução (Esri World Imagery + Labels nítidos)
   - Contorno Oficial do Paraná e Municípios
   - Sem imagens estáticas retangulares sobrepostas sobre o relevo
   - Pinos técnicos de unidades operacionais (ETE, EEE, ETA, Captações, Emissários)
   - Painel lateral com Legenda de Engenharia e simbologia padronizada
   ========================================================================== */
"use strict";

const LEG_COR = {
  proposto: "#A600FF",
  em_obra: "#FFA800",
  desativado: "#8C8C8C",
  existente_SES: "#FF0000",
  existente_SAA: "#0000FF",
  eta_existente: "#33FF00",
  contorno: "#00E000",
  rede: "#7FC4F0"
};

const LEG_SITUACOES = [
  ["proposto", "Proposto"],
  ["existente", "Existente"],
  ["em_obra", "Em obra"],
  ["desativado", "Desativado"]
];

const LEG_TIPOS = {
  SES: [
    ["triangulo", "Estação elevatória (EEE)"],
    ["quadrado", "Estação de tratamento (ETE)"],
    ["linha", "Linha de recalque"],
    ["traco_longo", "Emissário"],
    ["traco_curto", "Coletor / Interceptor"]
  ],
  SAA: [
    ["pentagono", "Captação de manancial"],
    ["losango", "Poço profundo"],
    ["quadrado", "Estação de tratamento (ETA)"],
    ["triangulo", "Estação elevatória"],
    ["circulo", "Reservatório"],
    ["linha", "Adutora"]
  ]
};

function simbolo(forma, cor) {
  const c = `fill="${cor}" stroke="#1B2430" stroke-width="1"`;
  const svg = d => `<svg width="22" height="16" viewBox="0 0 22 16" aria-hidden="true">${d}</svg>`;
  switch (forma) {
    case "triangulo": return svg(`<polygon points="11,2 18,14 4,14" ${c}/>`);
    case "quadrado": return svg(`<rect x="5" y="2" width="12" height="12" ${c}/>`);
    case "circulo": return svg(`<circle cx="11" cy="8" r="6" ${c}/>`);
    case "losango": return svg(`<polygon points="11,1 18,8 11,15 4,8" ${c}/>`);
    case "pentagono": return svg(`<polygon points="11,1.5 18,6.5 15.5,14.5 6.5,14.5 4,6.5" ${c}/>`);
    case "linha": return svg(`<line x1="1" y1="8" x2="21" y2="8" stroke="${cor}" stroke-width="3"/>`);
    case "traco_longo": return svg(`<line x1="1" y1="8" x2="21" y2="8" stroke="${cor}" stroke-width="3" stroke-dasharray="7 3"/>`);
    case "traco_curto": return svg(`<line x1="1" y1="8" x2="21" y2="8" stroke="${cor}" stroke-width="3" stroke-dasharray="3 3"/>`);
    case "contorno": return svg(`<rect x="3" y="3" width="16" height="10" fill="none" stroke="${cor}" stroke-width="2.5"/>`);
    case "anel": return svg(`<circle cx="11" cy="8" r="5" fill="#fff" stroke="#B42318" stroke-width="3"/>`);
    case "ponto": return svg(`<circle cx="11" cy="8" r="5" fill="#B42318" stroke="#fff" stroke-width="2"/>`);
  }
  return "";
}

window.OPS_MAPA = {
  mapa: null,
  layerGroup: null,
  sateliteBase: null,
  sateliteLabels: null,
  boundaryLayer: null,
  camadasAtivas: {
    esgoto: true,
    agua: true,
    relatos: true,
    setores: false
  },
  sistemaAtual: "SES",
  municipioAtual: null,

  init: function(municipios, onSelectMunicipio) {
    if (this.mapa) return;
    const el = document.getElementById("mapa");
    if (!el || typeof L === "undefined") return;

    this.municipios = municipios;
    this.onSelectMunicipio = onSelectMunicipio;
    this.municipioAtual = municipios.find(m => m.nome.toLowerCase() === "curitiba") || municipios[0];

    const lat = this.municipioAtual.latitude || -25.4284;
    const lng = this.municipioAtual.longitude || -49.2733;

    // Criar mapa Leaflet
    this.mapa = L.map("mapa", {
      center: [lat, lng],
      zoom: 13,
      minZoom: 6,
      maxZoom: 18,
      scrollWheelZoom: true,
      zoomControl: true
    });

    // 1. Camada de Satélite de Alta Resolução (Esri World Imagery) - Nítida, sem manchas ou imagens por cima
    this.sateliteBase = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
      maxZoom: 19,
      attribution: 'Imagens &copy; Esri, Maxar, Earthstar Geographics'
    }).addTo(this.mapa);

    // 2. Rótulos de vias, bairros e referências geográficas sobre o satélite
    this.sateliteLabels = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}", {
      maxZoom: 19
    }).addTo(this.mapa);

    // 3. Contorno oficial do Estado do Paraná (IBGE)
    if (window.PARANA_GEOJSON) {
      try {
        this.boundaryLayer = L.geoJSON(window.PARANA_GEOJSON, {
          style: {
            color: "#34D399",
            weight: 2,
            opacity: 0.85,
            fillColor: "transparent"
          }
        }).addTo(this.mapa);
      } catch (e) {}
    }

    this.layerGroup = L.layerGroup().addTo(this.mapa);

    // Iniciar controles, pinos de unidades e legenda lateral
    this.setupControles();
    this.desenharAtivos();
    this.renderLegendaLateral();
    this.atualizarRodape();
  },

  enquadrar: function() {
    if (!this.mapa || !this.municipioAtual) return;
    const lat = this.municipioAtual.latitude || -25.4284;
    const lng = this.municipioAtual.longitude || -49.2733;
    this.mapa.setView([lat, lng], 13, { animate: true });
  },

  enquadrarParana: function() {
    if (!this.mapa) return;
    this.mapa.setView([-24.75, -51.75], 7, { animate: true });
  },

  focarMunicipio: function(m) {
    if (!m) return;
    this.municipioAtual = m;
    this.desenharAtivos();
    this.renderLegendaLateral();
    this.enquadrar();
    this.atualizarRodape();
  },

  desenharAtivos: function() {
    if (!this.layerGroup || !this.mapa) return;
    this.layerGroup.clearLayers();

    const lat = this.municipioAtual.latitude || -25.4284;
    const lng = this.municipioAtual.longitude || -49.2733;

    // Unidades técnicas da infraestrutura de saneamento
    const ativos = [
      { id: "ETE-01", nome: `ETE Central ${this.municipioAtual.nome}`, sis: "SES", tipo: "Estação de Tratamento de Esgoto (ETE)", dlat: -0.010, dlng: -0.015, forma: "quadrado", cor: "#FF0000" },
      { id: "EEE-01", nome: `EEE Bacia Norte`, sis: "SES", tipo: "Estação Elevatória de Esgoto", dlat: 0.014, dlng: -0.008, forma: "triangulo", cor: "#A600FF" },
      { id: "EEE-02", nome: `EEE Vale Sul`, sis: "SES", tipo: "Estação Elevatória de Esgoto", dlat: -0.015, dlng: 0.012, forma: "triangulo", cor: "#FF0000" },
      { id: "LAN-01", nome: `Ponto de Lançamento de Efluente`, sis: "SES", tipo: "Emissário / Corpo Receptor", dlat: -0.020, dlng: -0.025, forma: "losango", cor: "#FFA800" },
      { id: "ETA-01", nome: `ETA Principal Sanepar`, sis: "SAA", tipo: "Estação de Tratamento de Água (ETA)", dlat: 0.016, dlng: 0.020, forma: "quadrado", cor: "#33FF00" },
      { id: "CAP-01", nome: `Captação Superficial IAT`, sis: "SAA", tipo: "Captação de Manancial", dlat: 0.024, dlng: 0.028, forma: "pentagono", cor: "#0000FF" },
      { id: "RES-01", nome: `Reservatório de Distribuição`, sis: "SAA", tipo: "Reservatório de Água Potável", dlat: 0.004, dlng: 0.006, forma: "circulo", cor: "#0000FF" }
    ];

    ativos.forEach(a => {
      // Filtrar conforme chips ativos
      if (a.sis === "SES" && !this.camadasAtivas.esgoto) return;
      if (a.sis === "SAA" && !this.camadasAtivas.agua) return;

      const pLat = lat + a.dlat;
      const pLng = lng + a.dlng;

      const iconeHtml = `
        <div class="mk" style="background:${a.cor}; border:2px solid #fff; border-radius:${a.forma === 'quadrado' ? '4px' : a.forma === 'triangulo' ? '30%' : '50%'}; display:grid; place-items:center; box-shadow:0 2px 6px rgba(0,0,0,0.6)" title="${a.nome}">
          <span style="font-size:10px;font-weight:700;color:#fff">${a.id.split('-')[0]}</span>
        </div>
      `;

      const mkr = L.marker([pLat, pLng], {
        icon: L.divIcon({ className: '', html: iconeHtml, iconSize: [26, 26], iconAnchor: [13, 13] })
      });

      mkr.bindPopup(`
        <div style="font-family:'Public Sans',sans-serif; min-width:210px">
          <span class="pill ${a.sis === 'SES' ? 'pend' : 'ok'}" style="margin-bottom:4px">${a.sis === 'SES' ? 'Esgotamento Sanitário' : 'Abastecimento de Água'}</span>
          <h4 style="margin:2px 0 4px;font-size:14px">${a.nome}</h4>
          <p style="margin:0;font-size:12px;color:#555">
            Código: <b>${a.id}</b><br>
            Tipo: <b>${a.tipo}</b><br>
            Município: <b>${this.municipioAtual.nome} (PR)</b><br>
            Concessão: <b>Sanepar / AGEPAR</b>
          </p>
        </div>
      `);

      this.layerGroup.addLayer(mkr);
    });

    // Ponto de relato da população se ativo
    if (this.camadasAtivas.relatos) {
      const relMkr = L.marker([lat + 0.008, lng - 0.006], {
        icon: L.divIcon({ className: '', html: '<div class="mk-rel" style="width:14px;height:14px;border-radius:50%;background:#fff;border:3px solid var(--trav);box-shadow:0 1px 4px rgba(0,0,0,.5)"></div>', iconSize: [14, 14], iconAnchor: [7, 7] })
      });
      relMkr.bindPopup(`<b>Relato Cidadão</b><br>Vazamento na rede de distribuição reportado por morador.<br><small>1 confirmação comunitária</small>`);
      this.layerGroup.addLayer(relMkr);
    }
  },

  setupControles: function() {
    const camadasDiv = document.getElementById("camadas");
    if (!camadasDiv) return;

    // Chips no mesmo formato do OPS Pará
    camadasDiv.innerHTML = `
      <button class="chip" data-camada="esgoto" aria-pressed="true"><span class="sw" style="background:var(--eixo-esgoto)"></span>Esgoto 4</button>
      <button class="chip" data-camada="agua" aria-pressed="true"><span class="sw" style="background:var(--eixo-agua)"></span>Água 3</button>
      <button class="chip" data-camada="relatos" aria-pressed="true"><span class="sw" style="background:var(--trav)"></span>Relatos 1</button>
      <button class="chip" data-camada="setores" aria-pressed="false"><span class="sw" style="background:#0F766E"></span>Setores IBGE</button>
    `;

    camadasDiv.querySelectorAll(".chip").forEach(btn => {
      btn.addEventListener("click", () => {
        const c = btn.getAttribute("data-camada");
        this.camadasAtivas[c] = !this.camadasAtivas[c];
        btn.setAttribute("aria-pressed", this.camadasAtivas[c] ? "true" : "false");
        this.desenharAtivos();
      });
    });

    // Seletor de Sistema / Visão Técnica
    const selPrancha = document.getElementById("selPrancha");
    if (selPrancha) {
      selPrancha.innerHTML = `
        <option value="SES" selected>Sistema de Esgoto Sanitário (SES)</option>
        <option value="SAA">Sistema de Abastecimento de Água (SAA)</option>
      `;
      selPrancha.addEventListener("change", e => {
        this.sistemaAtual = e.target.value;
        this.renderLegendaLateral();
        this.atualizarRodape();
      });
    }

    const btnEnquadrar = document.getElementById("btnEnquadrar");
    if (btnEnquadrar) {
      btnEnquadrar.addEventListener("click", () => this.enquadrar());
    }
  },

  renderLegendaLateral: function() {
    const el = document.getElementById("ficha");
    if (!el) return;

    const sis = this.sistemaAtual || "SES";
    const nomeSistema = sis === "SES" ? "Sistema de Esgoto Sanitário (SES)" : "Sistema de Abastecimento de Água (SAA)";

    const cor = (sit, forma) => sit === "existente"
      ? (sis === "SAA" && forma === "quadrado" ? LEG_COR.eta_existente : LEG_COR["existente_" + sis])
      : LEG_COR[sit];

    const linhas = LEG_TIPOS[sis].map(([forma, nome]) => `
      <tr>
        <th scope="row">${nome}</th>
        ${LEG_SITUACOES.map(([sit, rot]) => `<td title="${nome}: ${rot.toLowerCase()}">${simbolo(forma, cor(sit, forma))}</td>`).join("")}
      </tr>
    `).join("");

    const extras = sis === "SES"
      ? [["contorno", LEG_COR.contorno, "Bacia de contribuição de esgoto"]]
      : [["linha", LEG_COR.rede, "Rede de distribuição primária"], ["contorno", LEG_COR.contorno, "Área de influência da captação"]];

    el.innerHTML = `
      <div class="leg-cab">
        <h3>Legenda</h3>
        <span>${nomeSistema}</span>
      </div>
      <div class="leg-sec">
        <table class="leg-matriz">
          <thead>
            <tr>
              <th scope="col">Unidade</th>
              ${LEG_SITUACOES.map(([, r]) => `<th scope="col">${r}</th>`).join("")}
            </tr>
          </thead>
          <tbody>${linhas}</tbody>
        </table>
        <ul class="leg-lista">
          ${extras.map(([f, c, n]) => `<li>${simbolo(f, c)}<span>${n}</span></li>`).join("")}
        </ul>
      </div>

      <div class="leg-sec">
        <h4>Registros no painel</h4>
        <ul class="leg-lista">
          <li>${simbolo("anel")}<span>Relato da população</span></li>
          <li>${simbolo("ponto")}<span>Local marcado para relato</span></li>
        </ul>
        <p class="leg-nota" style="margin-top:8px">Unidades com ficha no município: 
          <button class="leg-unid" onclick="window.OPS_MAPA.enquadrar()">ETE-01</button> 
          <button class="leg-unid" onclick="window.OPS_MAPA.enquadrar()">EEE-01</button> 
          <button class="leg-unid" onclick="window.OPS_MAPA.enquadrar()">EEE-02</button> 
          <button class="leg-unid" onclick="window.OPS_MAPA.enquadrar()">ETA-01</button>
        </p>
      </div>

      <p class="leg-nota leg-rodape">
        Simbologia padronizada das unidades de saneamento básico (PRSB Paraná) em consonância com as diretrizes da AGEPAR, Sanepar e GeoPR / IAT.
      </p>
    `;
  },

  atualizarRodape: function() {
    const rod = document.getElementById("mapaRod");
    if (!rod) return;

    const sisTxt = this.sistemaAtual === "SES" ? "Esgotamento Sanitário (SES)" : "Abastecimento de Água (SAA)";

    rod.innerHTML = `
      <span>Unidades mapeadas: ${sisTxt} · ${this.municipioAtual ? this.municipioAtual.nome : "Paraná"}</span>
      <span>Base: Esri World Imagery / Satélite de Alta Resolução</span>
    `;
  }
};
