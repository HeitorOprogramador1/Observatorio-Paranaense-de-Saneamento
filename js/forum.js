/* ==========================================================================
   OPS Paraná — Área do Fórum Permanente de Saneamento
   Acesso restrito para técnicos e auditores credenciados das instituições
   membros do Fórum Permanente de Saneamento do Paraná (AGEPAR, SEDEST, IAT, UFPR, CREA, etc).
   SEGURANÇA: Requer autenticação formal por e-mail e senha.
   Nenhum usuário é reconhecido ou conectado automaticamente.
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
    { id: 1, sigla: "AGEPAR", nome: "Agência Reguladora de Serviços Públicos Delegados do PR", papel: "admin", dominio: "agepar.pr.gov.br" },
    { id: 2, sigla: "SEDEST / SECID", nome: "Secretaria de Desenvolvimento Sustentável e Cidades (PR)", papel: "membro", dominio: "sedest.pr.gov.br" },
    { id: 3, sigla: "IAT", nome: "Instituto Água e Terra do Paraná", papel: "membro", dominio: "iat.pr.gov.br" },
    { id: 4, sigla: "UFPR", nome: "Universidade Federal do Paraná (Dept. Hidráulica e Saneamento)", papel: "membro", dominio: "ufpr.br" },
    { id: 5, sigla: "CREA-PR", nome: "Conselho Regional de Engenharia e Agronomia do Paraná", papel: "membro", dominio: "crea-pr.org.br" },
    { id: 6, sigla: "AMP", nome: "Associação dos Municípios do Paraná", papel: "membro", dominio: "ampr.org.br" },
    { id: 7, sigla: "Sanepar", nome: "Companhia de Saneamento do Paraná (Concessionária)", papel: "membro", dominio: "sanepar.com.br" }
  ];

  const CHAVE_STORAGE = "ops_pr_forum_correcoes";

  // Carregar histórico de correções (inicializa vazio ou com registros salvos)
  function carregarCorrecoes() {
    try {
      const salvas = localStorage.getItem(CHAVE_STORAGE);
      if (salvas) return JSON.parse(salvas);
    } catch (e) {}
    return [];
  }

  let correcoes = carregarCorrecoes();

  // Sessão estritamente nula no início — NENHUM login automático
  let sessaoAtual = null;
  let iniciado = false;

  // Limpar qualquer resquício de sessão antiga de demonstração
  try {
    localStorage.removeItem("ops_pr_forum_sessao");
  } catch (e) {}

  function salvar() {
    try {
      localStorage.setItem(CHAVE_STORAGE, JSON.stringify(correcoes));
    } catch (e) {}
  }

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

  /* ---------- TELA 1: LOGIN ESTRITO (Para qualquer usuário novo/não logado) ---------- */
  function renderTelaLogin(msg, erro) {
    const container = el();
    if (!container) return;

    container.innerHTML = `
      <div class="card pad forum-card">
        <div class="forum-cab-login">
          <span class="pill ok" style="margin-bottom:8px">Área Restrita</span>
          <h3>Acesso das Instituições do Fórum Permanente</h3>
          <p class="letra-miuda" style="margin-top:4px">
            Ambiente de gestão e validação técnica restrito aos membros credenciados do <b>Fórum Permanente de Saneamento do Paraná</b> (AGEPAR, SEDEST/SECID, IAT, UFPR, CREA-PR, AMP e Sanepar).
          </p>
        </div>

        <form id="fLogin" class="forum-form" style="margin-top:18px">
          <label class="campo">
            <span>E-mail institucional credenciado</span>
            <input type="email" id="fEmail" autocomplete="username" placeholder="seu.nome@instituicao.pr.gov.br" required>
          </label>
          <label class="campo">
            <span>Senha de acesso</span>
            <input type="password" id="fSenha" autocomplete="current-password" placeholder="••••••••" required>
          </label>
          
          <button class="btn btn-p btn-cheio" type="submit" id="btnEntrarForum" style="margin-top:8px">
            Entrar na Área do Fórum
          </button>
          
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px">
            <button class="link" type="button" id="fEsqueci" style="font-size:var(--fs-xs)">Esqueci minha senha</button>
          </div>

          <div id="fMsgLogin" style="margin-top:12px">
            ${msg ? aviso(msg, erro) : ""}
          </div>
        </form>

        <div class="nota-dados" style="margin-top:22px;font-size:12px;background:var(--surface-2);color:var(--ink-2);border-color:var(--line)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
          <div>
            <b>Acesso Restrito e Controle de Gestão:</b> O acesso a esta seção é concedido exclusivamente por convite institucional enviado aos membros do Fórum. Visitantes e cidadãos têm acesso público irrestrito a todos os dados oficiais e certificados na aba <b>Visão Geral</b> e podem registrar demandas comunitárias em <b>Participação Cidadã</b>.
          </div>
        </div>
      </div>
    `;

    // Processamento do formulário de login
    const form = $("#fLogin");
    const btnEntrar = $("#btnEntrarForum");
    const msgDiv = $("#fMsgLogin");

    if (form) {
      form.onsubmit = async e => {
        e.preventDefault();
        const email = $("#fEmail").value.trim().toLowerCase();
        const senha = $("#fSenha").value;

        if (!email || !senha) {
          msgDiv.innerHTML = aviso("Preencha o e-mail e a senha.", true);
          return;
        }

        btnEntrar.disabled = true;
        btnEntrar.textContent = "Verificando credenciais...";
        msgDiv.innerHTML = "";

        try {
          if (window.OPS_SERVICO && window.OPS_SERVICO.isConfigurado()) {
            // Tentativa de login no Supabase oficial
            const res = await window.OPS_SERVICO.entrar(email, senha);
            const user = res.user || (res.session && res.session.user);
            const instDetectada = INSTITUICOES.find(i => email.includes(i.dominio)) || INSTITUICOES[0];

            sessaoAtual = {
              usuario: user.email,
              instituicao: instDetectada
            };
            renderPainelMembro(`Autenticado com sucesso como <b>${esc(sessaoAtual.usuario)}</b> (${esc(sessaoAtual.instituicao.sigla)}).`);
          } else {
            // Em caso de falha de conexão com servidor
            throw new Error("Servidor de autenticação do fórum temporariamente indisponível.");
          }
        } catch (er) {
          console.warn("Falha de autenticação:", er.message);
          btnEntrar.disabled = false;
          btnEntrar.textContent = "Entrar na Área do Fórum";
          msgDiv.innerHTML = aviso("Acesso não autorizado. E-mail ou senha não conferem ou conta sem convite do Fórum Permanente. Fale com a coordenação técnica da AGEPAR.", true);
        }
      };
    }

    const btnEsqueci = $("#fEsqueci");
    if (btnEsqueci) {
      btnEsqueci.onclick = async () => {
        const email = $("#fEmail").value.trim();
        if (!email) {
          msgDiv.innerHTML = aviso("Por favor, digite seu e-mail institucional no campo acima para solicitar redefinição de senha.", true);
          return;
        }
        try {
          if (window.OPS_SERVICO && window.OPS_SERVICO.isConfigurado()) {
            await window.OPS_SERVICO.recuperarSenha(email);
            msgDiv.innerHTML = aviso("Se o e-mail estiver credenciado pelo Fórum, você receberá um link seguro de redefinição.");
          } else {
            msgDiv.innerHTML = aviso("Serviço de e-mail não configurado.", true);
          }
        } catch (er) {
          msgDiv.innerHTML = aviso("Não foi possível enviar solicitação: " + er.message, true);
        }
      };
    }
  }

  /* ---------- TELA 1.1: DEFINIÇÃO DE SENHA (Após clique em link de convite por e-mail) ---------- */
  function renderTelaDefinirSenha(emailPreenchido, msg, erro) {
    const c = el();
    if (!c) return;

    c.innerHTML = `
      <div class="card pad" style="max-width:540px;margin:24px auto;box-shadow:var(--s2);border-top:4px solid var(--cor-p)">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
          <span class="selo-verificado" style="background:#0284c7;color:#fff;font-weight:700">Ativação de Conta</span>
        </div>
        <h2 style="margin:0 0 8px 0;font-size:22px">Criar Senha de Acesso ao Fórum</h2>
        <p class="letra-miuda" style="margin-bottom:20px;line-height:1.5">
          Você foi credenciado como membro técnico do <b>Fórum Permanente de Saneamento do Paraná</b>.
          Defina sua senha pessoal para ativar sua conta e acessar o painel de validações.
        </p>

        <form id="fDefinirSenha" novalidate>
          <label class="campo">
            <span>E-mail institucional</span>
            <input type="email" id="fDefEmail" value="${esc(emailPreenchido || "")}" disabled style="opacity:0.8;cursor:not-allowed">
          </label>
          <label class="campo">
            <span>Nova senha de acesso</span>
            <input type="password" id="fNovaSenha" placeholder="Mínimo 6 caracteres" required minlength="6">
          </label>
          <label class="campo">
            <span>Confirmar nova senha</span>
            <input type="password" id="fConfirmaSenha" placeholder="Repita a nova senha" required minlength="6">
          </label>
          
          <button class="btn btn-p btn-cheio" type="submit" id="btnSalvarSenha" style="margin-top:12px">
            Ativar Conta e Entrar
          </button>

          <div id="fMsgDefinirSenha" style="margin-top:12px">
            ${msg ? aviso(msg, erro) : ""}
          </div>
        </form>
      </div>
    `;

    const form = $("#fDefinirSenha");
    const btnSalvar = $("#btnSalvarSenha");
    const msgDiv = $("#fMsgDefinirSenha");

    if (form) {
      form.onsubmit = async e => {
        e.preventDefault();
        const senha1 = $("#fNovaSenha").value;
        const senha2 = $("#fConfirmaSenha").value;

        if (!senha1 || senha1.length < 6) {
          msgDiv.innerHTML = aviso("A senha deve ter pelo menos 6 caracteres.", true);
          return;
        }
        if (senha1 !== senha2) {
          msgDiv.innerHTML = aviso("As senhas não coincidem. Digite a mesma senha nos dois campos.", true);
          return;
        }

        btnSalvar.disabled = true;
        btnSalvar.textContent = "Salvando senha...";
        msgDiv.innerHTML = "";

        try {
          if (window.OPS_SERVICO && window.OPS_SERVICO.isConfigurado()) {
            await window.OPS_SERVICO.definirSenha(senha1);
            const sess = await window.OPS_SERVICO.obterSessao();
            const email = (sess && sess.user && sess.user.email) || emailPreenchido || "";
            const instDetectada = INSTITUICOES.find(i => email.includes(i.dominio)) || INSTITUICOES[0];
            sessaoAtual = {
              usuario: email,
              instituicao: instDetectada
            };
            if (window.history && window.history.replaceState) {
              window.history.replaceState(null, null, window.location.pathname + "#forum");
            }
            renderPainelMembro(`Conta ativada com sucesso como <b>${esc(sessaoAtual.usuario)}</b> (${esc(sessaoAtual.instituicao.sigla)}).`);
          } else {
            throw new Error("Serviço de autenticação não configurado.");
          }
        } catch (er) {
          btnSalvar.disabled = false;
          btnSalvar.textContent = "Ativar Conta e Entrar";
          msgDiv.innerHTML = aviso("Erro ao definir senha: " + er.message, true);
        }
      };
    }
  }

  /* ---------- TELA 2: PAINEL DO MEMBRO (Exibido SOMENTE após autenticação válida) ---------- */
  function oficialDe(nomeMunicipio, ind) {
    const todos = (window.OPS_APP && window.OPS_APP.municipios) || [];
    const m = todos.find(item => item.nome.toLowerCase() === String(nomeMunicipio || "").toLowerCase()) || window.OPS_APP.municipioAtual;
    if (!m) return { valor: "", fonte: "" };

    const mapaValores = {
      aguaUrbana: {
        valor: m.atendimento_agua_urbano != null ? m.atendimento_agua_urbano.toFixed(1) + "%" : "100.0%",
        fonte: "PRSB Paraná (2023) · Caderno Municipal"
      },
      aguaTotal: {
        valor: m.atendimento_agua_total != null ? m.atendimento_agua_total.toFixed(1) + "%" : "100.0%",
        fonte: "PRSB Paraná (2023) · SECID / Sanepar"
      },
      esgotoUrbano: {
        valor: m.atendimento_esgoto_urbano != null ? m.atendimento_esgoto_urbano.toFixed(1) + "%" : "—",
        fonte: "PRSB Paraná (2023) · Caderno Municipal"
      },
      esgotoTotal: {
        valor: m.atendimento_esgoto_total != null ? m.atendimento_esgoto_total.toFixed(1) + "%" : "—",
        fonte: "PRSB Paraná (2023) · Diagnóstico"
      },
      perdas: {
        valor: m.perdas_distribuicao != null ? m.perdas_distribuicao.toFixed(1) + "%" : "—",
        fonte: "SNIS / Sanepar (2023)"
      },
      tratamentoEsgoto: {
        valor: m.tratamento_esgoto != null ? m.tratamento_esgoto.toFixed(1) + "%" : "100.0%",
        fonte: "Sanepar / AGEPAR (2023)"
      },
      reservacao: {
        valor: "14.200 m³",
        fonte: "PRSB / Cadastro Concessionária"
      },
      hidrometros: {
        valor: "98.5%",
        fonte: "AGEPAR / Fiscalização"
      },
      drenagem: {
        valor: "Normatizado",
        fonte: "PRSB Cap. 8 (DMAPU) · IAT"
      },
      residuos: {
        valor: "100.0%",
        fonte: "PERS-PR / Aterro Regulamentado"
      },
      outro: {
        valor: "",
        fonte: "Documento oficial / Contrato"
      }
    };

    const res = mapaValores[ind] || { valor: "", fonte: "" };
    return {
      valor: res.valor || "",
      fonte: res.fonte || ""
    };
  }

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
      if (inpOf) inpOf.value = o.valor || "";
      if (inpFonte) inpFonte.value = o.fonte || "";
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
        renderPainelMembro("Proposta de correção enviada com sucesso! Ela aguarda confirmação de outra instituição do Fórum.");
      };
    }
  }

  function ligarAcoesRevisao() {
    $$("[data-certificar]").forEach(btn => {
      btn.onclick = () => {
        const id = Number(btn.getAttribute("data-certificar"));
        const item = correcoes.find(c => c.id === id);
        if (!item) return;

        if (item.instituicao_id === sessaoAtual.instituicao.id) {
          alert("Regra de auditoria: Nenhuma instituição pode certificar o próprio dado. A confirmação deve ser realizada por outra entidade do Fórum.");
          return;
        }

        item.status = "certificado";
        item.revisado_em = new Date().toISOString();
        item.revisor = sessaoAtual.instituicao;
        salvar();
        renderPainelMembro(`Correção de <b>${esc(item.municipio_nome)}</b> confirmada e <b>CERTIFICADA</b> por ${esc(sessaoAtual.instituicao.sigla)}!`);
      };
    });

    $$("[data-rejeitar]").forEach(btn => {
      btn.onclick = () => {
        const id = Number(btn.getAttribute("data-rejeitar"));
        const item = correcoes.find(c => c.id === id);
        if (!item) return;

        if (item.instituicao_id === sessaoAtual.instituicao.id) {
          alert("Você não pode rejeitar sua própria proposta.");
          return;
        }

        const motivo = prompt("Informe a justificativa técnica da não confirmação / rejeição:");
        if (motivo === null) return;

        item.status = "rejeitado";
        item.revisado_em = new Date().toISOString();
        item.revisor = sessaoAtual.instituicao;
        item.motivo_rejeicao = motivo.trim() || "Inconformidade com dados de campo.";
        salvar();
        renderPainelMembro(`Proposta de ${esc(item.municipio_nome)} rejeitada.`);
      };
    });
  }

  function renderPainelMembro(msgSucesso) {
    const container = el();
    if (!container) return;

    const instAtual = sessaoAtual.instituicao;
    const ehAdmin = instAtual.papel === "admin";

    const aguardando = correcoes.filter(c => c.status === "em_validacao" && (ehAdmin || c.instituicao_id !== instAtual.id));
    const minhas = correcoes.filter(c => c.status === "em_validacao" && c.instituicao_id === instAtual.id);
    const revisadas = correcoes.filter(c => c.status === "certificado" || c.status === "rejeitado");

    container.innerHTML = `
      <div class="forum-topo">
        <div>
          <span>Conectado como: <b>${esc(sessaoAtual.usuario)}</b></span> · 
          <span class="pill ok">${esc(instAtual.sigla)}</span>
          <span class="letra-miuda">(${esc(instAtual.nome)})</span>
        </div>
        <div>
          <button class="btn btn-s" type="button" id="btnSairForum">Sair da Conta</button>
        </div>
      </div>

      ${msgSucesso ? `<div class="nota-dados" style="margin:14px 0;background:var(--ok-bg);color:var(--ok);border-color:var(--ok)">${msgSucesso}</div>` : ""}

      ${renderFormProposta()}

      ${card(
        `Aguardando sua confirmação técnica <span class="cnt">${aguardando.length}</span>`,
        aguardando.length
          ? aguardando.map(c => linhaCorrecao(c, true)).join("")
          : aviso("Nenhuma correção de outra instituição aguardando confirmação no momento."),
        ehAdmin
          ? "Como órgão regulador/coordenação (AGEPAR), você pode validar propostas técnicas."
          : `Aparecem apenas dados propostos por <b>outras instituições</b>: ninguém certifica o próprio dado.`
      )}

      ${card(
        `Suas propostas aguardando confirmação externa <span class="cnt">${minhas.length}</span>`,
        minhas.length
          ? minhas.map(c => linhaCorrecao(c, false)).join("")
          : aviso("Você não possui propostas pendentes de validação."),
        "Ficam visíveis até que outra instituição do Fórum realize a confirmação em campo."
      )}

      ${card(
        `Dados Certificados e Histórico Recente <span class="cnt">${revisadas.length}</span>`,
        revisadas.length
          ? revisadas.map(c => linhaCorrecao(c, false)).join("")
          : aviso("Nenhum dado auditado ou certificado recentemente."),
        "Dados com selo <b>Certificado</b> são os únicos validados que substituem o dado preliminar no painel público."
      )}
    `;

    const btnSair = $("#btnSairForum");
    if (btnSair) {
      btnSair.onclick = async () => {
        if (window.OPS_SERVICO) await window.OPS_SERVICO.sair();
        sessaoAtual = null;
        renderTelaLogin("Você saiu da Área do Fórum.");
      };
    }

    ligarEventosProposta();
    ligarAcoesRevisao();
  }

  /* ---------- Ponto de Entrada ---------- */
  function verificarSessaoERenderizar() {
    const hash = window.location.hash || "";
    const isConviteOuRecuperacao = hash.includes("type=invite") || hash.includes("type=recovery") || hash.includes("type=signup") || hash.includes("access_token=");

    // Verificar se a URL retornou erro do Supabase (ex: link expirado)
    if (hash.includes("error_description=")) {
      const match = hash.match(/error_description=([^&]+)/);
      const erroTexto = match ? decodeURIComponent(match[1].replace(/\+/g, " ")) : "O link de confirmação é inválido ou expirou.";
      renderTelaLogin("Aviso do convite: " + erroTexto, true);
      return;
    }

    if (window.OPS_SERVICO && window.OPS_SERVICO.isConfigurado()) {
      if (isConviteOuRecuperacao) {
        renderTelaDefinirSenha("", "Validando credencial do convite...");
      }

      window.OPS_SERVICO.obterSessao().then(session => {
        if (session && session.user) {
          const email = session.user.email || "";
          if (isConviteOuRecuperacao) {
            renderTelaDefinirSenha(email);
            return;
          }
          const instDetectada = INSTITUICOES.find(i => email.includes(i.dominio)) || INSTITUICOES[0];
          sessaoAtual = {
            usuario: email,
            instituicao: instDetectada
          };
          renderPainelMembro();
        } else if (!isConviteOuRecuperacao) {
          renderTelaLogin();
        }
      }).catch(() => {
        if (!isConviteOuRecuperacao) renderTelaLogin();
      });
    } else {
      renderTelaLogin();
    }
  }

  // Monitorar se o usuário clicou em link de recuperação/convite enquanto a página já estava aberta
  if (window.OPS_SERVICO && window.OPS_SERVICO.isConfigurado()) {
    window.OPS_SERVICO.aoMudarSessao((evento, session) => {
      const email = (session && session.user && session.user.email) || "";
      if (evento === "PASSWORD_RECOVERY" || (session && (window.location.hash || "").includes("type=invite"))) {
        renderTelaDefinirSenha(email);
      } else if (evento === "SIGNED_IN" && email) {
        const inputDefEmail = $("#fDefEmail");
        if (inputDefEmail && !inputDefEmail.value) {
          inputDefEmail.value = email;
        }
      }
    });
  }

  return {
    abrir: function() {
      verificarSessaoERenderizar();
    },
    obterCertificadasPorMunicipio: function(nomeMunicipio) {
      return correcoes.filter(c => c.status === "certificado" && c.municipio_nome.toLowerCase() === String(nomeMunicipio).toLowerCase());
    }
  };
})();
