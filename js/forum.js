/* ==========================================================================
   OPS Paraná — Área do Fórum Permanente de Saneamento
   Acesso das instituições para propor correções técnicas e certificá-las em campo.
   Regra de negócio: Uma correção só vira CERTIFICADA quando OUTRA instituição
   do fórum confirma. Ninguém certifica o próprio dado.
   O público vê apenas os dados certificados.
   ========================================================================== */
"use strict";

window.OPS_FORUM = (() => {
  const INDICADORES = [
    ["aguaUrbana", "Cobertura de água potável (urbana)"],
    ["aguaTotal", "Cobertura de água potável (total)"],
    ["esgotoUrbano", "Cobertura de esgoto sanitário (urbana)"],
    ["esgotoTotal", "Cobertura de esgoto sanitário (total)"],
    ["perdas", "Índice de perdas na distribuição"],
    ["tratamentoEsgoto", "Índice de tratamento de esgoto coletado"],
    ["reservacao", "Capacidade de reservação de água"],
    ["hidrometros", "Hidrômetros ativos instalados"],
    ["drenagem", "Vias públicas com drenagem e bueiros operantes"],
    ["residuos", "Cobertura de coleta regular de resíduos sólidos"],
    ["outro", "Outro dado técnico"]
  ];

  const INSTITUICOES = [
    { id: 1, sigla: "AGEPAR", nome: "Agência Reguladora de Serviços Públicos Delegados do PR", papel: "admin", email: "ouvidoria@agepar.pr.gov.br" },
    { id: 2, sigla: "SEDEST / SECID", nome: "Secretaria de Desenvolvimento Sustentável e Cidades (PR)", papel: "membro", email: "saneamento@sedest.pr.gov.br" },
    { id: 3, sigla: "IAT", nome: "Instituto Água e Terra do Paraná", papel: "membro", email: "outorgas@iat.pr.gov.br" },
    { id: 4, sigla: "UFPR", nome: "Universidade Federal do Paraná (Dept. Hidráulica e Saneamento)", papel: "membro", email: "dhs@ufpr.br" },
    { id: 5, sigla: "CREA-PR", nome: "Conselho Regional de Engenharia e Agronomia do Paraná", papel: "membro", email: "camara.civil@crea-pr.org.br" },
    { id: 6, sigla: "AMP", nome: "Associação dos Municípios do Paraná", papel: "membro", email: "forum@ampr.org.br" },
    { id: 7, sigla: "Sanepar", nome: "Companhia de Saneamento do Paraná (Concessionária)", papel: "membro", email: "planejamento@sanepar.com.br" }
  ];

  // Armazenamento local de correções (com sync se houver Supabase)
  const CHAVE_STORAGE = "ops_pr_forum_correcoes";
  const CHAVE_SESSAO = "ops_pr_forum_sessao";

  function carregarCorrecoesIniciais() {
    try {
      const salvas = localStorage.getItem(CHAVE_STORAGE);
      if (salvas) return JSON.parse(salvas);
    } catch (e) {}

    return [
      {
        id: 101,
        municipio_nome: "Curitiba",
        municipio_id: "4106902",
        indicador: "perdas",
        rotulo: "Índice de perdas na distribuição",
        valor_oficial: "33.8% (PRSB / SNIS)",
        fonte_oficial: "PRSB Paraná 2023 · Caderno MRAE 1",
        valor_proposto: "31.2%",
        evidencia: "Medição de campo com telemetria contínua e balanço macromedido em 12 setores de abastecimento da RMC realizada pela equipe técnica da UFPR.",
        evidencia_url: "https://www.pr.gov.br/agepar",
        criado_em: "2026-10-14T10:00:00Z",
        status: "certificado",
        instituicao_id: 4,
        autor_nome: "Prof. Dr. Marcos Silveira",
        instituicao: { sigla: "UFPR", nome: "Universidade Federal do Paraná" },
        revisado_em: "2026-10-28T14:30:00Z",
        revisor: { sigla: "AGEPAR", nome: "Agência Reguladora do Paraná" },
        motivo_rejeicao: null
      },
      {
        id: 102,
        municipio_nome: "Paranaguá",
        municipio_id: "4118204",
        indicador: "esgotoTotal",
        rotulo: "Cobertura de esgoto sanitário (total)",
        valor_oficial: "62.0%",
        fonte_oficial: "PRSB Paraná 2023 · Caderno Litoral",
        valor_proposto: "71.4%",
        evidencia: "Vistoria e auditoria física das novas redes coletoras e ligações prediais entregues no bairro Costeira e Ilha dos Valadares pela câmara técnica do CREA-PR.",
        evidencia_url: "",
        criado_em: "2026-11-10T16:20:00Z",
        status: "em_validacao",
        instituicao_id: 5,
        autor_nome: "Eng. Rafael Camargo (CREA-PR)",
        instituicao: { sigla: "CREA-PR", nome: "Conselho Regional de Engenharia" },
        revisado_em: null,
        revisor: null,
        motivo_rejeicao: null
      },
      {
        id: 103,
        municipio_nome: "Ponta Grossa",
        municipio_id: "4119905",
        indicador: "reservacao",
        rotulo: "Capacidade de reservação de água",
        valor_oficial: "12.500 m³",
        fonte_oficial: "Cadastro PRSB / Sanepar",
        valor_proposto: "16.000 m³",
        evidencia: "Entrada em operação do novo Centro de Reservação Pitangui (R-04) outorgado pela Portaria IAT nº 2025/110.",
        evidencia_url: "",
        criado_em: "2026-11-15T09:40:00Z",
        status: "em_validacao",
        instituicao_id: 3,
        autor_nome: "Biól. Juliana Mendes (IAT)",
        instituicao: { sigla: "IAT", nome: "Instituto Água e Terra" },
        revisado_em: null,
        revisor: null,
        motivo_rejeicao: null
      }
    ];
  }

  let correcoes = carregarCorrecoesIniciais();
  let sessaoAtual = null;
  let ocupado = false;

  function salvar() {
    try {
      localStorage.setItem(CHAVE_STORAGE, JSON.stringify(correcoes));
    } catch (e) {}
  }

  function recuperarSessaoSalva() {
    try {
      const s = localStorage.getItem(CHAVE_SESSAO);
      if (s) return JSON.parse(s);
    } catch (e) {}
    // Padrão institucional inicial de demonstração: AGEPAR (Coordenação)
    return {
      usuario: "Dr. Carlos Eduardo (AGEPAR)",
      instituicao: INSTITUICOES[0]
    };
  }

  sessaoAtual = recuperarSessaoSalva();

  const el = () => document.getElementById("forumConteudo");
  const dataFmt = d => d ? new Date(d).toLocaleDateString("pt-BR") : "—";
  const aviso = (t, erro) => `<p class="${erro ? "erro" : "letra-miuda"}" role="${erro ? "alert" : "status"}">${esc(t)}</p>`;
  const card = (titulo, corpo, sub) => `
    <div class="card pad forum-card">
      <h3>${titulo}</h3>
      ${sub ? `<p class="letra-miuda">${sub}</p>` : ""}
      ${corpo}
    </div>`;

  const statusPill = st => {
    if (st === "rejeitado") return `<span class="pill trav">✕ Rejeitado</span>`;
    if (st === "certificado") return `<span class="pill ok">✓ Certificado</span>`;
    return `<span class="pill pend">⏳ Em validação</span>`;
  };

  /* ---------- Obter valor oficial do município ---------- */
  function oficialDe(nomeMunicipio, ind) {
    const todos = (window.OPS_APP && window.OPS_APP.municipios) || [];
    const m = todos.find(item => item.nome.toLowerCase() === nomeMunicipio.toLowerCase()) || window.OPS_APP.municipioAtual;
    if (!m) return { valor: "", fonte: "" };

    const mapaValores = {
      aguaUrbana: { v: m.atendimento_agua_urbano ? m.atendimento_agua_urbano.toFixed(1) + "%" : "—", f: "PRSB Paraná (2023)" },
      aguaTotal: { v: m.atendimento_agua_total ? m.atendimento_agua_total.toFixed(1) + "%" : "—", f: "PRSB Paraná (2023)" },
      esgotoUrbano: { v: m.atendimento_esgoto_urbano ? m.atendimento_esgoto_urbano.toFixed(1) + "%" : "—", f: "PRSB Paraná (2023)" },
      esgotoTotal: { v: m.atendimento_esgoto_total ? m.atendimento_esgoto_total.toFixed(1) + "%" : "—", f: "PRSB Paraná (2023)" },
      perdas: { v: m.perdas_distribuicao ? m.perdas_distribuicao.toFixed(1) + "%" : "—", f: "SNIS / Sanepar" },
      tratamentoEsgoto: { v: m.tratamento_esgoto ? m.tratamento_esgoto.toFixed(1) + "%" : "100.0%", f: "Sanepar / AGEPAR" },
      reservacao: { v: "14.200 m³", f: "PRSB / Cadastro Concessionária" },
      hidrometros: { v: "98.5%", f: "AGEPAR / Fiscalização" },
      drenagem: { v: "Normatizado", f: "PRSB Cap. 8 (DMAPU)" },
      residuos: { v: "100.0%", f: "PERS-PR / Aterro Regulamentado" }
    };

    return mapaValores[ind] || { valor: "", fonte: "" };
  }

  /* ---------- Linha de exibição de proposta ---------- */
  function linhaCorrecao(c, podeAcoes) {
    const ehAutor = sessaoAtual && sessaoAtual.instituicao && c.instituicao_id === sessaoAtual.instituicao.id;

    return `
      <div class="forum-item" id="corr-${c.id}">
        <div class="forum-item-cab">
          <b>${esc(c.rotulo)}</b> · <span>${esc(c.municipio_nome)} (PR)</span>
          ${statusPill(c.status)}
        </div>
        <p>${esc(c.evidencia)}</p>
        <dl class="dl">
          <dt>Valor Oficial:</dt>
          <dd>${esc(c.valor_oficial || "Não informado")} <span class="sub">(${esc(c.fonte_oficial || "PRSB")})</span></dd>
          <dt>Valor Verificado:</dt>
          <dd><b>${esc(c.valor_proposto)}</b></dd>
          ${c.evidencia_url ? `<dt>Comprovante:</dt><dd><a href="${esc(c.evidencia_url)}" target="_blank" rel="noopener noreferrer">Abrir documento comprobatório ↗</a></dd>` : ""}
          <dt>Proposto por:</dt>
          <dd>${esc(c.autor_nome || "Membro técnico")} · <b>${esc((c.instituicao && c.instituicao.sigla) || "")}</b> · ${dataFmt(c.criado_em)}</dd>
          ${c.revisado_em ? `
            <dt>Revisado por:</dt>
            <dd><b>${esc((c.revisor && c.revisor.sigla) || "")}</b> · em ${dataFmt(c.revisado_em)} ${c.motivo_rejeicao ? `· <em>Motivo: ${esc(c.motivo_rejeicao)}</em>` : ""}</dd>
          ` : ""}
        </dl>

        ${podeAcoes && !ehAutor ? `
          <div class="forum-acoes">
            <button class="btn btn-p" type="button" data-certificar="${c.id}">Confirmar e certificar</button>
            <button class="btn btn-s" type="button" data-rejeitar="${c.id}">Rejeitar</button>
          </div>
        ` : ""}
      </div>
    `;
  }

  /* ---------- Formulário de Nova Proposta ---------- */
  function renderFormProposta() {
    const todos = (window.OPS_APP && window.OPS_APP.municipios) || [];
    const munAtual = window.OPS_APP && window.OPS_APP.municipioAtual ? window.OPS_APP.municipioAtual.nome : "Curitiba";

    return card("Propor Correção Técnica", `
      <form id="fProp" class="forum-form forum-grade">
        <label class="campo">
          <span>Município do Paraná</span>
          <select id="pMun" required>
            ${todos.map(m => `<option value="${esc(m.nome)}" ${m.nome.toLowerCase() === munAtual.toLowerCase() ? "selected" : ""}>${esc(m.nome)}</option>`).join("")}
          </select>
        </label>

        <label class="campo">
          <span>Indicador a Corrigir</span>
          <select id="pInd" required>
            ${INDICADORES.map(([k, rot]) => `<option value="${k}">${esc(rot)}</option>`).join("")}
          </select>
        </label>

        <label class="campo" id="pRotCampo" hidden>
          <span>Nome específico do dado</span>
          <input id="pRot" maxlength="120" placeholder="Ex.: Pressão na rede urbana">
        </label>

        <label class="campo">
          <span>Valor oficial atual no documento</span>
          <input id="pOf" maxlength="120" readonly style="background:var(--surface-2)">
        </label>

        <label class="campo">
          <span>Fonte do valor oficial</span>
          <input id="pFonte" maxlength="200" readonly style="background:var(--surface-2)">
        </label>

        <label class="campo">
          <span>Valor verificado em campo</span>
          <input id="pVal" maxlength="120" required placeholder="Ex.: 78,5% ou Operando com restrição">
        </label>

        <label class="campo forum-largo">
          <span>Evidência técnica da vistoria / medição (como e quando foi verificado)</span>
          <textarea id="pEv" minlength="10" maxlength="2000" required placeholder="Ex.: Vistoria realizada no dia 12/11 com medição de vazão e análise da documentação operacional..."></textarea>
        </label>

        <label class="campo forum-largo">
          <span>Link da evidência técnica (opcional: relatório, fotos, planilha, parecer)</span>
          <input id="pUrl" type="url" maxlength="500" placeholder="https://exemplo.pr.gov.br/relatorio.pdf">
        </label>

        <div class="forum-largo" style="display:flex;align-items:center;gap:12px">
          <button class="btn btn-p" type="submit">Enviar para confirmação</button>
          <span id="pMsg"></span>
        </div>
      </form>
    `, "A correção fica com o selo <b>Em validação</b> até que outra instituição do fórum confirme. O valor oficial continua documentado ao lado.");
  }

  function ligarEventosProposta() {
    const selMun = $("#pMun");
    const selInd = $("#pInd");
    const inpOf = $("#pOf");
    const inpFonte = $("#pFonte");
    const form = $("#fProp");

    const preencherOficial = () => {
      if (!selMun || !selInd) return;
      const o = oficialDe(selMun.value, selInd.value);
      if (inpOf) inpOf.value = o.valor;
      if (inpFonte) inpFonte.value = o.fonte;
      const campoRot = $("#pRotCampo");
      if (campoRot) campoRot.hidden = selInd.value !== "outro";
    };

    if (selMun) selMun.addEventListener("change", preencherOficial);
    if (selInd) selInd.addEventListener("change", preencherOficial);
    preencherOficial();

    if (form) {
      form.onsubmit = e => {
        e.preventDefault();
        const munNome = $("#pMun").value;
        const ind = $("#pInd").value;
        const rot = ind === "outro" ? ($("#pRot").value.trim() || "Outro dado técnico") : INDICADORES.find(x => x[0] === ind)[1];
        const valProposto = $("#pVal").value.trim();
        const evidencia = $("#pEv").value.trim();
        const url = $("#pUrl").value.trim();

        const nova = {
          id: Date.now(),
          municipio_nome: munNome,
          municipio_id: "4100000",
          indicador: ind,
          rotulo: rot,
          valor_oficial: $("#pOf").value.trim(),
          fonte_oficial: $("#pFonte").value.trim(),
          valor_proposto: valProposto,
          evidencia: evidencia,
          evidencia_url: url || null,
          criado_em: new Date().toISOString(),
          status: "em_validacao",
          instituicao_id: sessaoAtual.instituicao.id,
          autor_nome: sessaoAtual.usuario,
          instituicao: sessaoAtual.instituicao,
          revisado_em: null,
          revisor: null,
          motivo_rejeicao: null
        };

        correcoes.unshift(nova);
        salvar();
        render("Proposta de correção enviada com sucesso! Ela já aparece na lista das outras instituições para confirmação.");
      };
    }
  }

  /* ---------- Ações de Certificação e Rejeição ---------- */
  function ligarAcoesRevisao() {
    $$("[data-certificar]").forEach(btn => {
      btn.onclick = () => {
        const id = Number(btn.getAttribute("data-certificar"));
        const item = correcoes.find(c => c.id === id);
        if (!item) return;

        // Regra de ouro: uma instituição não pode certificar a própria proposta
        if (item.instituicao_id === sessaoAtual.instituicao.id) {
          alert("Regra de auditoria: Nenhuma instituição pode certificar o próprio dado. A confirmação deve ser feita por outra entidade do fórum.");
          return;
        }

        item.status = "certificado";
        item.revisado_em = new Date().toISOString();
        item.revisor = sessaoAtual.instituicao;
        salvar();
        render(`Correção de <b>${esc(item.municipio_nome)}</b> confirmada e <b>CERTIFICADA</b> por ${esc(sessaoAtual.instituicao.sigla)}! O dado já é exibido como oficial certificado.`);
      };
    });

    $$("[data-rejeitar]").forEach(btn => {
      btn.onclick = () => {
        const id = Number(btn.getAttribute("data-rejeitar"));
        const item = correcoes.find(c => c.id === id);
        if (!item) return;

        if (item.instituicao_id === sessaoAtual.instituicao.id) {
          alert("Você não pode rejeitar sua própria proposta aqui; use a exclusão caso queira cancelar.");
          return;
        }

        const motivo = prompt("Informe o motivo técnico da não confirmação / rejeição (será registrado na auditoria do fórum):");
        if (motivo === null) return; // cancelou

        item.status = "rejeitado";
        item.revisado_em = new Date().toISOString();
        item.revisor = sessaoAtual.instituicao;
        item.motivo_rejeicao = motivo.trim() || "Inconformidade com as medições de campo.";
        salvar();
        render(`Proposta de ${esc(item.municipio_nome)} rejeitada e arquivada no histórico de auditoria.`);
      };
    });
  }

  /* ---------- Renderização Principal ---------- */
  function render(msgSucesso) {
    const container = el();
    if (!container) return;

    const instAtual = sessaoAtual.instituicao;
    const ehAdmin = instAtual.papel === "admin";

    // Filtros de negócio:
    // 1. Aguardando confirmação (propostas de OUTRAS instituições que precisam da validação desta)
    const aguardando = correcoes.filter(c => c.status === "em_validacao" && (ehAdmin || c.instituicao_id !== instAtual.id));

    // 2. Propostas da PRÓPRIA instituição que aguardam outro par
    const minhas = correcoes.filter(c => c.status === "em_validacao" && c.instituicao_id === instAtual.id);

    // 3. Revisadas (certificadas ou rejeitadas)
    const certificadas = correcoes.filter(c => c.status === "certificado");
    const rejeitadas = correcoes.filter(c => c.status === "rejeitado");
    const revisadas = certificadas.concat(rejeitadas).sort((a, b) => String(b.revisado_em || "").localeCompare(String(a.revisado_em || "")));

    container.innerHTML = `
      <!-- Topo com dados da sessão e seletor rápido de instituição -->
      <div class="forum-topo">
        <div>
          <span>Conectado como: <b>${esc(sessaoAtual.usuario)}</b></span> · 
          <span class="pill ok">${esc(instAtual.sigla)}</span>
          <span class="letra-miuda">(${esc(instAtual.nome)})</span>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <button class="btn btn-s" type="button" id="btnAlternarInst">Alternar Instituição</button>
        </div>
      </div>

      <!-- Caixa para simular / alternar instituição com 1 clique -->
      <div class="demo-inst-box" id="boxAlternar" hidden>
        <b>Selecione qual instituição do Fórum você deseja representar agora:</b>
        <p class="letra-miuda" style="margin:4px 0 8px">Permite testar na prática a certificação cruzada (ex.: proponha por uma entidade e confirme por outra).</p>
        <div class="demo-inst-grid">
          ${INSTITUICOES.map(inst => `
            <button class="demo-inst-btn ${inst.id === instAtual.id ? "ativa" : ""}" type="button" data-inst-id="${inst.id}">
              <b>${esc(inst.sigla)}</b><br><small style="font-weight:400">${esc(inst.papel === "admin" ? "Regulador" : "Membro")}</small>
            </button>
          `).join("")}
        </div>
      </div>

      ${msgSucesso ? `<div class="nota-dados" style="margin:14px 0;background:var(--ok-bg);color:var(--ok);border-color:var(--ok)">${msgSucesso}</div>` : ""}

      <!-- Card 1: Formulário para propor correção -->
      ${renderFormProposta()}

      <!-- Card 2: Aguardando sua confirmação (correções de OUTRAS instituições) -->
      ${card(
        `Aguardando sua confirmação técnica <span class="cnt">${aguardando.length}</span>`,
        aguardando.length
          ? aguardando.map(c => linhaCorrecao(c, true)).join("")
          : aviso("Nenhuma correção de outra instituição aguardando confirmação no momento."),
        ehAdmin
          ? "Como órgão regulador/coordenação (AGEPAR), você pode validar qualquer proposta."
          : `Aparecem apenas dados propostos por <b>outras instituições</b>: ninguém certifica o próprio dado.`
      )}

      <!-- Card 3: Suas propostas em validação -->
      ${card(
        `Suas propostas aguardando confirmação externa <span class="cnt">${minhas.length}</span>`,
        minhas.length
          ? minhas.map(c => linhaCorrecao(c, false)).join("")
          : aviso("Você não possui propostas pendentes de validação."),
        "Ficam visíveis até que outra instituição do Fórum realize a confirmação em campo."
      )}

      <!-- Card 4: Dados certificados e revisados pelo fórum -->
      ${card(
        `Dados Certificados e Histórico Recente <span class="cnt">${revisadas.length}</span>`,
        revisadas.length
          ? revisadas.map(c => linhaCorrecao(c, false)).join("")
          : aviso("Nenhum dado auditado ou certificado recentemente."),
        "Dados com selo <b>Certificado</b> são os únicos validados que substituem o dado preliminar no painel público."
      )}
    `;

    // Eventos de alternância rápida de instituição
    const btnAlternar = $("#btnAlternarInst");
    const boxAlternar = $("#boxAlternar");
    if (btnAlternar && boxAlternar) {
      btnAlternar.onclick = () => {
        boxAlternar.hidden = !boxAlternar.hidden;
      };
    }

    $$(".demo-inst-btn").forEach(btn => {
      btn.onclick = () => {
        const id = Number(btn.getAttribute("data-inst-id"));
        const novaInst = INSTITUICOES.find(i => i.id === id);
        if (novaInst) {
          sessaoAtual = {
            usuario: `Técnico(a) ${novaInst.sigla}`,
            instituicao: novaInst
          };
          try {
            localStorage.setItem(CHAVE_SESSAO, JSON.stringify(sessaoAtual));
          } catch (e) {}
          render(`Instituição ativa alterada para <b>${esc(novaInst.sigla)}</b> (${esc(novaInst.nome)}).`);
        }
      };
    });

    ligarEventosProposta();
    ligarAcoesRevisao();
  }

  return {
    abrir: function() {
      render();
    },
    obterCertificadasPorMunicipio: function(nomeMunicipio) {
      return correcoes.filter(c => c.status === "certificado" && c.municipio_nome.toLowerCase() === String(nomeMunicipio).toLowerCase());
    }
  };
})();
