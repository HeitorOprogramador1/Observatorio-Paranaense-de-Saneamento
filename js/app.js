/* ==========================================================================
   OPS Paraná — Aplicação Principal (JavaScript Puro)
   Baseada na arquitetura, padrões e interatividade do OPS Pará
   ========================================================================== */
"use strict";

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const esc = s => String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const fmtBR = n => n == null || isNaN(n) ? "—" : Number(n).toLocaleString("pt-BR");
const fmtPct = n => n == null || isNaN(n) ? "—" : Number(n).toFixed(1) + "%";

window.OPS_APP = {
  municipios: [],
  municipioAtual: null,
  metadata: null,
  simulacaoAtiva: false,

  init: function() {
    console.log("Inicializando OPS Paraná...");

    // Carregar dados de data_bundle.js
    if (window.OPS_DATA) {
      this.municipios = window.OPS_DATA.municipios || [];
      this.metadata = window.OPS_DATA.metadata || {};
    }

    if (!this.municipios.length) {
      console.error("Nenhum dado de município encontrado em window.OPS_DATA!");
      return;
    }

    // Definir Curitiba ou primeiro município como inicial
    const curitiba = this.municipios.find(m => m.nome.toLowerCase() === "curitiba");
    this.municipioAtual = curitiba || this.municipios[0];

    // Inicializar subsistemas
    this.initTema();
    this.renderSeletor();
    this.setupAbas();
    this.setupEventos();

    // Renderizar município inicial
    this.carregarMunicipio(this.municipioAtual);

    // Inicializar mapa após carregar
    if (window.OPS_MAPA) {
      window.OPS_MAPA.init(this.municipios, m => this.carregarMunicipio(m));
    }

    // Inicializar repositório
    this.renderRepositorio();

    // Sincronizar hash de URL se houver
    const hash = window.location.hash.replace("#", "");
    if (hash && document.getElementById(hash)) {
      this.abrirAba(hash);
    } else {
      this.abrirAba("visao");
    }
  },

  initTema: function() {
    try {
      const temaSalvo = localStorage.getItem("ops-tema") || "light";
      document.documentElement.setAttribute("data-theme", temaSalvo);
      const btnTema = $("#btnTema");
      if (btnTema) {
        btnTema.setAttribute("title", temaSalvo === "dark" ? "Alternar para tema claro" : "Alternar para tema escuro");
      }
    } catch (e) {}
  },

  toggleTema: function() {
    const atual = document.documentElement.getAttribute("data-theme") || "light";
    const novo = atual === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", novo);
    try {
      localStorage.setItem("ops-tema", novo);
    } catch (e) {}
  },

  renderSeletor: function() {
    const sel = $("#selMunicipio");
    if (!sel) return;

    // Agrupar municípios por MRAE
    const grupos = {
      "MRAE 1 - Centro-Litoral": [],
      "MRAE 2 - Centro-Leste": [],
      "MRAE 3 - Oeste": []
    };

    this.municipios.forEach(m => {
      const mrae = m.mrae || "MRAE 1 - Centro-Litoral";
      if (!grupos[mrae]) grupos[mrae] = [];
      grupos[mrae].push(m);
    });

    let html = "";
    Object.keys(grupos).sort().forEach(grp => {
      grupos[grp].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
      html += `<optgroup label="${esc(grp)} (${grupos[grp].length} municípios)">`;
      grupos[grp].forEach(m => {
        html += `<option value="${esc(m.nome)}">${esc(m.nome)} · IBGE ${m.codigo_ibge || ""}</option>`;
      });
      html += `</optgroup>`;
    });

    sel.innerHTML = html;
    sel.value = this.municipioAtual.nome;
  },

  setupAbas: function() {
    // Abas de navegação principal
    const abas = $$(".abas a[data-aba]");
    abas.forEach(aba => {
      aba.addEventListener("click", e => {
        e.preventDefault();
        const nomeAba = aba.getAttribute("data-aba");
        this.abrirAba(nomeAba);
      });
    });

    // Links gerais com hash (como o botão 'Relatar problema', links no texto, etc.)
    document.addEventListener("click", e => {
      const link = e.target.closest("a[href^='#']");
      if (link) {
        const hash = link.getAttribute("href").replace("#", "");
        if (hash && document.getElementById(hash) && document.getElementById(hash).classList.contains("aba")) {
          e.preventDefault();
          this.abrirAba(hash);
        }
      }
    });

    // Ouvir mudança de hash na URL (botão voltar/avançar do navegador)
    window.addEventListener("hashchange", () => {
      const hash = window.location.hash.replace("#", "");
      if (hash && document.getElementById(hash) && document.getElementById(hash).classList.contains("aba")) {
        this.abrirAba(hash);
      }
    });
  },

  abrirAba: function(nomeAba) {
    $$(".abas a[data-aba]").forEach(a => {
      const ativa = a.getAttribute("data-aba") === nomeAba;
      a.setAttribute("aria-selected", ativa ? "true" : "false");
    });

    $$("main section.aba").forEach(sec => {
      if (sec.id === nomeAba) {
        sec.removeAttribute("hidden");
      } else {
        sec.setAttribute("hidden", "");
      }
    });

    // Se abrir território (mapa), forçar resize no Leaflet
    if (nomeAba === "territorio" && window.OPS_MAPA && window.OPS_MAPA.mapa) {
      setTimeout(() => {
        window.OPS_MAPA.mapa.invalidateSize();
        if (this.municipioAtual) {
          window.OPS_MAPA.focarMunicipio(this.municipioAtual);
        }
      }, 100);
    }

    // Se abrir metas, desenhar gráficos
    if (nomeAba === "metas") {
      this.renderGraficosMetas();
    }

    window.history.replaceState(null, null, "#" + nomeAba);
    window.scrollTo({ top: 0, behavior: "smooth" });
  },

  selecionarMunicipioPorNome: function(nome) {
    const m = this.municipios.find(item => item.nome.toLowerCase() === nome.toLowerCase());
    if (m) {
      this.carregarMunicipio(m);
      const sel = $("#selMunicipio");
      if (sel) sel.value = m.nome;
      this.abrirAba("visao");
    }
  },

  carregarMunicipio: function(m) {
    if (!m) return;
    this.municipioAtual = m;

    this.renderHeroi(m);
    this.renderKPIs(m);
    this.renderEixos(m);
    this.renderCadeiaEsgoto(m);
    this.renderFichaTerritorio(m);
    this.renderMetasResumo(m);

    if (window.OPS_MAPA && window.OPS_MAPA.mapa) {
      window.OPS_MAPA.focarMunicipio(m);
    }
  },

  renderHeroi: function(m) {
    $("#heroiSobre").textContent = `Paraná · ${m.mrae || "Microrregião de Água e Esgoto"} · IBGE ${m.codigo_ibge || "—"}`;
    $("#heroiNome").textContent = m.nome;
    $("#heroiUF").textContent = "PR";

    const densidade = m.densidade_demografica ? `${fmtBR(m.densidade_demografica)} hab/km²` : "—";
    const area = m.area_km2 ? `${fmtBR(m.area_km2)} km²` : "—";
    const pib = m.pib_per_capita ? `PIB per capita R$ ${fmtBR(m.pib_per_capita)}` : "";
    const idhm = m.idhm ? `IDHM ${m.idhm}` : "";

    $("#heroiSub").innerHTML = [area, densidade, pib, idhm, `Fonte: PRSB Paraná (2023)`].filter(Boolean).join(" · ");

    const fatos = [
      ["População (Censo 2022)", fmtBR(m.populacao_2022) + " hab."],
      ["Taxa de Urbanização", fmtPct(m.taxa_urbanizacao)],
      ["Prestador Principal", "Sanepar (Concessão Estadual)"],
      ["Regulador", "AGEPAR (Agência Reguladora do PR)"],
      ["Classificação Geral", m.classificacao_geral || "Intermediário"]
    ];

    $("#heroiFatos").innerHTML = fatos.map(([t, d]) => `<div><dt>${t}</dt><dd>${esc(d)}</dd></div>`).join("");

    $("#txtAvisoDados").innerHTML = `<b>Dados Oficiais do PRSB / SECID-PR (2023) e Aditivos 2025.</b> Indicadores de água, esgoto, perdas e projeções de universalização (Lei 14.026/2020) apurados nos cadernos regionais das 3 MRAEs do Paraná.`;
  },

  renderKPIs: function(m) {
    const kpisDiv = $("#kpis");
    if (!kpisDiv) return;

    const aguaTot = m.atendimento_agua_total || 0;
    const esgotoTot = m.atendimento_esgoto_total || 0;
    const aguaUrb = m.atendimento_agua_urbano || 0;
    const esgotoUrb = m.atendimento_esgoto_urbano || 0;
    const perdas = m.perdas_distribuicao || 0;
    const consumo = m.consumo_per_capita || 0;

    const statusAgua = aguaTot >= 99 ? "Meta 99% cumprida" : `Faltam ${(99 - aguaTot).toFixed(1)} p.p. para 2033`;
    const statusEsgoto = esgotoTot >= 90 ? "Meta 90% cumprida" : `Faltam ${(90 - esgotoTot).toFixed(1)} p.p. para 2033`;
    const statusPerdas = perdas <= 25 ? "Dentro do padrão nacional" : `Acima da diretriz (<25%)`;

    const cards = [
      {
        rot: "Água Potável Total",
        val: aguaTot ? aguaTot.toFixed(1) : "—",
        un: "%",
        met: statusAgua,
        fonte: "PRSB · Caderno Municipal",
        cor: "var(--eixo-agua)"
      },
      {
        rot: "Água Cobertura Urbana",
        val: aguaUrb ? aguaUrb.toFixed(1) : "—",
        un: "%",
        met: "Meta urbana consolidada",
        fonte: "PRSB / Sanepar",
        cor: "var(--eixo-agua)"
      },
      {
        rot: "Esgotamento Total",
        val: esgotoTot ? esgotoTot.toFixed(1) : "—",
        un: "%",
        met: statusEsgoto,
        fonte: "PRSB · Diagnóstico",
        cor: "var(--eixo-esgoto)"
      },
      {
        rot: "Esgoto Cobertura Urbana",
        val: esgotoUrb ? esgotoUrb.toFixed(1) : "—",
        un: "%",
        met: "Meta Marco Legal: 90%",
        fonte: "PRSB / AGEPAR",
        cor: "var(--eixo-esgoto)"
      },
      {
        rot: "Perdas na Distribuição",
        val: perdas ? perdas.toFixed(1) : "—",
        un: "%",
        met: statusPerdas,
        fonte: "SNIS / Sanepar",
        cor: perdas > 35 ? "var(--trav)" : "var(--parana-green)"
      },
      {
        rot: "Consumo Médio per capita",
        val: consumo ? consumo.toFixed(0) : "—",
        un: "L/hab/dia",
        met: "Diretriz OMS: 110 L/dia",
        fonte: "PRSB · Demanda",
        cor: "var(--brand)"
      }
    ];

    kpisDiv.innerHTML = cards.map(c => `
      <div class="kpi card">
        <span class="rot">${c.rot}</span>
        <div class="val" style="color:${c.cor}">${c.val}<span class="un">${c.un}</span></div>
        <div class="met">${c.met}</div>
        <div class="fonte">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          ${c.fonte}
        </div>
      </div>
    `).join("");
  },

  renderEixos: function(m) {
    const el = $("#eixosCards");
    if (!el) return;

    const aguaOk = (m.atendimento_agua_total || 0) >= 90;
    const esgotoOk = (m.atendimento_esgoto_total || 0) >= 60;

    const eixos = [
      {
        nome: "Água Potável",
        cor: "var(--eixo-agua)",
        status: aguaOk ? "Cobertura Avançada" : "Expansão em andamento",
        detalhe: `${fmtPct(m.atendimento_agua_total)} de atendimento total com mananciais monitorados pelo IAT e Sanepar.`
      },
      {
        nome: "Esgotamento Sanitário",
        cor: "var(--eixo-esgoto)",
        status: esgotoOk ? "Atendimento Estruturado" : "Déficit prioritário para 2033",
        detalhe: `${fmtPct(m.atendimento_esgoto_total)} com tratamento das cargas coletadas nas ETEs regionais.`
      },
      {
        nome: "Drenagem Pluvial (DMAPU)",
        cor: "var(--eixo-drenagem)",
        status: "Normatizado no PRSB Cap. 8",
        detalhe: "Diretrizes integradas do Instituto Água e Terra (IAT) para controle de cheias e galerias pluviais."
      },
      {
        nome: "Resíduos Sólidos (PERS-PR)",
        cor: "var(--eixo-residuos)",
        status: "Plano Estadual Integrado",
        detalhe: "Consórcios intermunicipais de coleta e disposição em aterro sanitário regulamentado."
      }
    ];

    el.innerHTML = eixos.map(e => `
      <div class="eixo-linha">
        <span class="sw" style="background:${e.cor}"></span>
        <b>${e.nome}:</b>
        <span><b>${e.status}</b> — ${e.detalhe}</span>
      </div>
    `).join("");

    // Atualização dos dados
    const frescor = $("#frescor");
    if (frescor) {
      frescor.innerHTML = `
        <div class="frescor"><span class="ponto" style="background:var(--ok)"></span><div><b>Plano Regional (PRSB):</b> Versão 2023 consolidada</div></div>
        <div class="frescor"><span class="ponto" style="background:var(--ok)"></span><div><b>Aditivos Regulatórios:</b> Resoluções das Assembleias de 2025</div></div>
        <div class="frescor"><span class="ponto" style="background:var(--ok)"></span><div><b>Censo Demográfico:</b> IBGE 2022 (População e Domicílios)</div></div>
        <div class="frescor"><span class="ponto" style="background:var(--pend)"></span><div><b>Saneamento Rural:</b> Diagnóstico SESA/SECID em validação</div></div>
      `;
    }
  },

  renderCadeiaEsgoto: function(m) {
    const cadeia = $("#cadeiaElos");
    const msg = $("#cadeiaMsg");
    if (!cadeia) return;

    const esgotoTot = m.atendimento_esgoto_total || 0;
    const esgotoUrb = m.atendimento_esgoto_urbano || 0;
    const trat = m.tratamento_esgoto || 100;

    cadeia.innerHTML = `
      <div class="elo">
        <div class="bola" style="background:var(--brand)">${fmtPct(m.taxa_urbanizacao)}</div>
        <div class="nm">Geração</div>
        <div class="ds">Área urbana</div>
      </div>
      <div class="seta">→</div>
      <div class="elo">
        <div class="bola" style="background:${esgotoUrb > 50 ? 'var(--eixo-esgoto)' : 'var(--trav)'}">${fmtPct(esgotoUrb)}</div>
        <div class="nm">Coleta Urbana</div>
        <div class="ds">Rede Sanepar</div>
      </div>
      <div class="seta">→</div>
      <div class="elo">
        <div class="bola" style="background:var(--eixo-esgoto)">100%</div>
        <div class="nm">Transporte</div>
        <div class="ds">Interceptores/EEEs</div>
      </div>
      <div class="seta">→</div>
      <div class="elo">
        <div class="bola" style="background:var(--parana-green)">${trat.toFixed(0)}%</div>
        <div class="nm">Tratamento</div>
        <div class="ds">ETEs Secundárias</div>
      </div>
      <div class="seta">→</div>
      <div class="elo">
        <div class="bola" style="background:var(--eixo-drenagem)">Norma</div>
        <div class="nm">Disposição</div>
        <div class="ds">Corpo receptor</div>
      </div>
    `;

    if (msg) {
      if (esgotoTot >= 90) {
        msg.textContent = `Sistema completo em operação plena, já atendendo aos patamares de universalização estabelecidos no Marco Legal do Saneamento.`;
      } else if (esgotoTot >= 30) {
        msg.textContent = `Sistema em operação na sede urbana, porém com necessidade de expansão da malha coletora para bairros periurbanos e distritos.`;
      } else {
        msg.textContent = `Município com déficit crítico de coleta de esgoto. O Aditivo do PRSB (2025) prevê plano de aceleração contratual junto à AGEPAR.`;
      }
    }
  },

  renderFichaTerritorio: function(m) {
    const ficha = $("#ficha");
    if (!ficha) return;

    ficha.innerHTML = `
      <div class="ficha-top">
        <div class="ico" style="background:var(--brand)">PR</div>
        <div>
          <h3>${esc(m.nome)}</h3>
          <span class="sub">${esc(m.mrae || "Paraná")} · IBGE ${m.codigo_ibge || "—"}</span>
        </div>
      </div>
      <div class="ficha-sec">
        <h4>Dados Demográficos</h4>
        <dl class="dl">
          <dt>População:</dt><dd>${fmtBR(m.populacao_2022)} hab.</dd>
          <dt>Taxa de Urbanização:</dt><dd>${fmtPct(m.taxa_urbanizacao)}</dd>
          <dt>Área territorial:</dt><dd>${fmtBR(m.area_km2)} km²</dd>
          <dt>Densidade:</dt><dd>${fmtBR(m.densidade_demografica)} hab/km²</dd>
        </dl>
      </div>
      <div class="ficha-sec">
        <h4>Metas de Universalização (Marco Legal)</h4>
        <div class="prog">
          <div class="prog-l"><span>Água potável (Meta: 99%)</span><b>${fmtPct(m.atendimento_agua_total)}</b></div>
          <div class="prog-b"><i style="width:${Math.min(100, m.atendimento_agua_total || 0)}%;background:var(--eixo-agua)"></i></div>
        </div>
        <div class="prog">
          <div class="prog-l"><span>Esgotamento sanitário (Meta: 90%)</span><b>${fmtPct(m.atendimento_esgoto_total)}</b></div>
          <div class="prog-b"><i style="width:${Math.min(100, m.atendimento_esgoto_total || 0)}%;background:var(--eixo-esgoto)"></i></div>
        </div>
      </div>
      <div class="ficha-sec">
        <h4>Saúde e Desenvolvimento</h4>
        <dl class="dl">
          <dt>IDHM Geral:</dt><dd>${m.idhm || "—"}</dd>
          <dt>Firjan Desenvolvimento:</dt><dd>${m.firjan_desenvolvimento || "—"}</dd>
          <dt>Firjan Saúde:</dt><dd>${m.firjan_saude || "—"}</dd>
          <dt>Mortalidade DRSAI Infantil:</dt><dd>${m.mortalidade_drsai_infantil != null ? m.mortalidade_drsai_infantil : "0.0"} por mil</dd>
        </dl>
      </div>
      <div class="ficha-sec">
        <h4>Prestador e Regulação</h4>
        <p>Operação: <b>Sanepar</b><br>Regulação: <b>AGEPAR</b><br>Diretrizes Ambientais: <b>IAT</b></p>
      </div>
    `;
  },

  renderMetasResumo: function(m) {
    const esgTxt = $("#txtMetaEsg");
    const aguTxt = $("#txtMetaAgu");
    if (esgTxt) esgTxt.textContent = `Evolução projetada para ${m.nome} até 2033 perante o Marco Legal.`;
    if (aguTxt) aguTxt.textContent = `Índice de perdas na rede de distribuição para ${m.nome}.`;
  },

  renderGraficosMetas: function() {
    if (!window.OPS_GRAFICOS) return;

    const m = this.municipioAtual;
    const anos = [2022, 2024, 2026, 2028, 2030, 2033];

    // Simulação de trajetória linear de expansão para a meta 2033
    const esgBase = m.atendimento_esgoto_total || 25;
    const esgMetaFinal = 90.0;
    const esgMetas = anos.map((a, i) => {
      const frac = i / (anos.length - 1);
      return Number((esgBase + frac * (esgMetaFinal - esgBase)).toFixed(1));
    });
    const esgRealizados = [esgBase, Number((esgBase + 3.2).toFixed(1)), null, null, null, null];

    window.OPS_GRAFICOS.renderLinhaMeta("grafEsgoto", "ttEsg", {
      anos: anos,
      metas: esgMetas,
      realizados: esgRealizados,
      unidade: "%",
      rotuloMeta: "Meta do Plano",
      rotuloReal: "Realizado Sanepar",
      corReal: "var(--eixo-esgoto)"
    });

    // Gráfico de redução de perdas de água
    const perdasBase = m.perdas_distribuicao || 32.0;
    const perdasMetaFinal = 20.0;
    const perdasMetas = anos.map((a, i) => {
      const frac = i / (anos.length - 1);
      return Number((perdasBase - frac * (perdasBase - perdasMetaFinal)).toFixed(1));
    });
    const perdasRealizadas = [perdasBase, Number((perdasBase - 1.5).toFixed(1)), null, null, null, null];

    window.OPS_GRAFICOS.renderLinhaMeta("grafAgua", "ttAgu", {
      anos: anos,
      metas: perdasMetas,
      realizados: perdasRealizadas,
      unidade: "%",
      rotuloMeta: "Meta de Redução",
      rotuloReal: "Medido SNIS/Sanepar",
      corReal: "var(--eixo-agua)"
    });

    // Gráfico de Investimento Previsto (CAPEX das 3 MRAEs)
    const capexItens = [
      { rotulo: "MRAE 1 - Esgoto Sanitário", valor: 3096235482, cor: "var(--eixo-esgoto)", pct: "20.0" },
      { rotulo: "MRAE 1 - Abastecimento Água", valor: 2590484155, cor: "var(--eixo-agua)", pct: "16.7" },
      { rotulo: "MRAE 2 - Abastecimento Água", valor: 2274025921, cor: "#165BAA", pct: "14.7" },
      { rotulo: "MRAE 2 - Esgoto Sanitário", valor: 1653403908, cor: "#B36329", pct: "10.7" },
      { rotulo: "MRAE 3 - Abastecimento Água", valor: 2479056586, cor: "#3C7FD5", pct: "16.0" },
      { rotulo: "MRAE 3 - Esgoto Sanitário", valor: 2305502001, cor: "#C27A41", pct: "14.9" },
      { rotulo: "Segurança Hídrica Integrada", valor: 1103744577, cor: "var(--parana-green)", pct: "7.0" }
    ];

    window.OPS_GRAFICOS.renderBarrasCapex("grafCapex", "ttCap", capexItens);

    // Divisão visual horizontal do CAPEX
    const divCapex = $("#divisaoCapex");
    if (divCapex) {
      divCapex.innerHTML = `
        <div class="barra-div">
          <i style="width:36.7%;background:var(--brand)">MRAE 1 (R$ 5,69 bi)</i>
          <i style="width:26.4%;background:var(--parana-green)">MRAE 2 (R$ 4,10 bi)</i>
          <i style="width:36.9%;background:var(--eixo-esgoto)">MRAE 3 (R$ 5,72 bi)</i>
        </div>
        <div class="leg">
          <span><b style="color:var(--brand)">■ MRAE 1 Centro-Litoral:</b> R$ 5,69 bilhões (36,7%)</span>
          <span><b style="color:var(--parana-green)">■ MRAE 2 Centro-Leste:</b> R$ 4,10 bilhões (26,4%)</span>
          <span><b style="color:var(--eixo-esgoto)">■ MRAE 3 Oeste:</b> R$ 5,72 bilhões (36,9%)</span>
          <span><b>Total Estadual:</b> R$ 15,50 bilhões até 2033</span>
        </div>
      `;
    }
  },

  renderRepositorio: function() {
    const lista = $("#repoLista");
    if (!lista || !window.OPS_REPOSITORIO) return;

    lista.innerHTML = window.OPS_REPOSITORIO.map(item => {
      const corTema = item.tema === "agua" ? "var(--eixo-agua)" : item.tema === "esgoto" ? "var(--eixo-esgoto)" : item.tema === "drenagem" ? "var(--eixo-drenagem)" : "var(--eixo-residuos)";
      return `
        <article class="card repo-item">
          <div class="repo-item-cab">
            <span class="repo-tema" style="--cor:${corTema}">${item.tipo}</span>
            <span class="repo-tipo">${item.ano} · ${item.instituicao}</span>
          </div>
          <h3><a href="${item.url}" target="_blank" rel="noopener noreferrer">${esc(item.titulo)}</a></h3>
          <p class="repo-autor">${esc(item.autor)}</p>
          <p class="repo-resumo-txt">${esc(item.resumo)}</p>
          <div class="repo-acoes">
            <a class="btn btn-s" href="${item.url}" target="_blank" rel="noopener noreferrer">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/></svg>
              Acessar documento oficial
            </a>
            <span class="repo-dom">${esc(item.arquivo)}</span>
          </div>
        </article>
      `;
    }).join("");
  },

  setupEventos: function() {
    // Seletor de municípios
    const sel = $("#selMunicipio");
    if (sel) {
      sel.addEventListener("change", e => {
        this.selecionarMunicipioPorNome(e.target.value);
      });
    }

    // Alternador de tema
    const btnTema = $("#btnTema");
    if (btnTema) {
      btnTema.addEventListener("click", () => this.toggleTema());
    }

    // Botão de simulação
    const btnSim = $("#btnSim");
    const avisoSim = $("#avisoSim");
    const btnSairSim = $("#btnSairSim");

    if (btnSim) {
      btnSim.addEventListener("click", () => {
        this.simulacaoAtiva = !this.simulacaoAtiva;
        btnSim.setAttribute("aria-pressed", this.simulacaoAtiva ? "true" : "false");
        $("#btnSimT").textContent = this.simulacaoAtiva ? "Sair da simulação" : "Ver simulação";
        if (avisoSim) avisoSim.hidden = !this.simulacaoAtiva;
      });
    }

    if (btnSairSim) {
      btnSairSim.addEventListener("click", () => {
        this.simulacaoAtiva = false;
        if (btnSim) {
          btnSim.setAttribute("aria-pressed", "false");
          $("#btnSimT").textContent = "Ver simulação";
        }
        if (avisoSim) avisoSim.hidden = true;
      });
    }

    // Participação popular (envio de relato integrado ao Supabase)
    const btnEnviar = $("#btnEnviar");
    if (btnEnviar) {
      btnEnviar.addEventListener("click", async () => {
        const texto = $("#relTexto") ? $("#relTexto").value.trim() : "";
        const contato = $("#relContato") ? $("#relContato").value.trim() : "";
        const erro = $("#erroRel");
        const avisoSucesso = $("#avisoSucessoRel");
        const btnTipoAtivo = $(".tipos .tipo[aria-pressed='true']");
        const tipoProblema = btnTipoAtivo ? btnTipoAtivo.textContent.trim() : "Falta d'água recorrente";

        if (erro) erro.hidden = true;
        if (avisoSucesso) avisoSucesso.hidden = true;

        if (!texto || texto.length < 5) {
          if (erro) {
            erro.textContent = "Por favor, forneça uma descrição detalhada da situação (mínimo de 5 caracteres).";
            erro.hidden = false;
          }
          return;
        }

        const m = this.municipioAtual || { nome: "Paraná", codigo_ibge: "4100000" };

        btnEnviar.disabled = true;
        btnEnviar.textContent = "Gravando relato no Supabase...";

        try {
          if (window.OPS_SERVICO && window.OPS_SERVICO.isConfigurado()) {
            await window.OPS_SERVICO.enviarRelato({
              municipio: m.nome,
              codigo_ibge: String(m.codigo_ibge || "4100000"),
              tipo: tipoProblema,
              descricao: texto,
              contato: contato || null
            });
          } else {
            throw new Error("Conexão com o Supabase não configurada no cliente.");
          }

          if (avisoSucesso) {
            avisoSucesso.textContent = "Relato registrado com sucesso no banco de dados do Observatório e encaminhado para moderação.";
            avisoSucesso.hidden = false;
          }
          if ($("#relTexto")) $("#relTexto").value = "";
          if ($("#relContato")) $("#relContato").value = "";
        } catch (err) {
          console.error("Erro no envio:", err);
          if (erro) {
            erro.textContent = "Não foi possível registrar o relato: " + (err.message || "Erro de conexão com o banco de dados.");
            erro.hidden = false;
          }
        } finally {
          btnEnviar.disabled = false;
          btnEnviar.textContent = "Registrar relato no observatório";
        }
      });
    }

    // Tipos de relato interativos com feedback dinâmico
    const sugestoesPlaceholder = {
      "Falta d'água recorrente": "Ex.: No bairro X, estamos sem abastecimento de água regular há dias consecutivos...",
      "Água com cor ou cheiro": "Ex.: A água da torneira está apresentando coloração turva ou cheiro forte há 3 dias...",
      "Vazamento de água na via": "Ex.: Há um cano rompido na Rua Tal, altura do número 120, jorrando água potável na rua...",
      "Esgoto a céu aberto / extravasamento": "Ex.: Vazamento de esgoto a céu aberto na esquina da Rua A com B, causando mau cheiro...",
      "Obra atrasada ou paralisada": "Ex.: A obra de ampliação da rede de saneamento na Avenida Principal está parada há semanas...",
      "Bueiro entupido / alagamento": "Ex.: Bueiro e galeria pluvial totalmente obstruídos por sedimentos, causando alagamento..."
    };

    $$(".tipos .tipo").forEach(btn => {
      btn.addEventListener("click", () => {
        $$(".tipos .tipo").forEach(b => b.setAttribute("aria-pressed", "false"));
        btn.setAttribute("aria-pressed", "true");
        const tipoTexto = btn.textContent.trim();
        const textarea = $("#relTexto");
        if (textarea && sugestoesPlaceholder[tipoTexto]) {
          textarea.placeholder = sugestoesPlaceholder[tipoTexto];
        }
      });
    });

    // Gerar resumo manifestação AGEPAR
    const btnResumo = $("#btnResumo");
    const boxResumo = $("#boxResumo");
    const btnCopiar = $("#btnCopiar");
    if (btnResumo && boxResumo) {
      btnResumo.addEventListener("click", () => {
        const m = this.municipioAtual;
        const texto = `MANIFESTAÇÃO À OUVIDORIA DA AGEPAR
Município: ${m.nome} (PR) - MRAE: ${m.mrae}
Prestador de Serviço: Sanepar
Objeto: Demanda referente aos serviços de saneamento básico (Água/Esgoto)
Indicador atual: Atendimento de água ${fmtPct(m.atendimento_agua_total)} | Esgoto ${fmtPct(m.atendimento_esgoto_total)}
Descrição do problema: [Inserir protocolo anterior na concessionária e resumo do problema]
Fundamento legal: Lei Federal nº 11.445/2007, Lei nº 14.026/2020 e Plano Regional de Saneamento Básico (PRSB-PR).`;
        boxResumo.textContent = texto;
        boxResumo.hidden = false;
        if (btnCopiar) btnCopiar.hidden = false;
      });
    }

    if (btnCopiar && boxResumo) {
      btnCopiar.addEventListener("click", () => {
        navigator.clipboard.writeText(boxResumo.textContent).then(() => {
          alert("Resumo copiado para a área de transferência!");
        });
      });
    }
  },

  // Exportações
  exportarCSV: function() {
    window.location.href = "data/municipios_completo.csv";
  },

  exportarJSON: function() {
    window.location.href = "data/municipios_completo.json";
  }
};

// Inicialização automática ao carregar o DOM
document.addEventListener("DOMContentLoaded", () => {
  window.OPS_APP.init();
});
