/* ==========================================================================
   OPS — área do fórum: login, correções com certificação por outra
   instituição, moderação de relatos, membros e histórico.
   As regras valem no banco (supabase/migrations/); esta tela só as expõe.
   ========================================================================== */
"use strict";

OPS.forum = (() => {
  const INDICADORES = [
    ["aguaUrbana", "Cobertura de água (urbana)"], ["aguaRural", "Cobertura de água (rural)"],
    ["perdas", "Perdas na distribuição"], ["esgotoUrbano", "Cobertura de esgoto (urbana)"],
    ["hidrometros", "Hidrômetros instalados"], ["ligacoesAgua", "Ligações de água"],
    ["reservacao", "Reservação"], ["tratamentoAgua", "Tratamento da água"],
    ["coletaResiduos", "Cobertura de coleta de resíduos (urbana)"], ["disposicaoFinal", "Destino final dos resíduos"],
    ["drenagemVias", "Vias com rede de drenagem"], ["outro", "Outro dado"]
  ];
  const ROT_ST = { em_validacao: "em_validacao", certificado: "certificado" };
  let sessao = null, perfil = null, insts = [], recuperando = false, iniciado = false, ocupado = false;

  const el = () => $("#forumConteudo");
  const aberto = () => OPS.estado.aba === "forum";
  const data = d => d ? new Date(d).toLocaleDateString("pt-BR") : "—";
  const aviso = (t, erro) => `<p class="${erro ? "erro" : "letra-miuda"}" role="${erro ? "alert" : "status"}">${esc(t)}</p>`;
  const card = (titulo, corpo, sub) => `<div class="card pad forum-card"><h3>${titulo}</h3>${sub ? `<p class="letra-miuda">${sub}</p>` : ""}${corpo}</div>`;
  const nomeMun = id => ((window.OPS_CATALOGO || []).find(c => c.id === id) || {}).nome || id;
  const statusPill = st => st === "rejeitado" ? pill("trav", "Rejeitado") : seloVal(ROT_ST[st]);

  /* ---------- telas sem login ---------- */
  function telaDesligada() {
    el().innerHTML = card("Área em configuração", aviso("O painel ainda não está conectado ao servidor do fórum."));
  }

  function telaLogin(msg, erro) {
    el().innerHTML = card("Entrar", `
      <form id="fLogin" class="forum-form">
        <label class="campo"><span>E-mail</span><input type="email" id="fEmail" autocomplete="username" required></label>
        <label class="campo"><span>Senha</span><input type="password" id="fSenha" autocomplete="current-password" required></label>
        <button class="btn btn-p btn-cheio" type="submit">Entrar</button>
        <button class="link" type="button" id="fEsqueci">Esqueci a senha</button>
        ${msg ? aviso(msg, erro) : ""}
      </form>`, "Acesso por convite, para as instituições do Fórum Permanente de Saneamento.");
    $("#fLogin").onsubmit = async e => {
      e.preventDefault();
      try { await OPS.srv.entrar($("#fEmail").value.trim(), $("#fSenha").value); }
      catch (er) { telaLogin("E-mail ou senha não conferem.", true); }
    };
    $("#fEsqueci").onclick = async () => {
      const email = $("#fEmail").value.trim();
      if (!email) return telaLogin("Digite seu e-mail e clique de novo em “Esqueci a senha”.", true);
      try { await OPS.srv.recuperar(email); telaLogin("Se o e-mail estiver cadastrado, você vai receber um link para criar uma nova senha."); }
      catch (er) { telaLogin("Não foi possível enviar o e-mail agora. Tente de novo em alguns minutos.", true); }
    };
  }

  function telaNovaSenha(msg, erro) {
    el().innerHTML = card("Criar nova senha", `
      <form id="fNova" class="forum-form">
        <label class="campo"><span>Nova senha (mínimo 8 caracteres)</span><input type="password" id="fNovaSenha" minlength="8" autocomplete="new-password" required></label>
        <button class="btn btn-p btn-cheio" type="submit">Salvar senha</button>
        ${msg ? aviso(msg, erro) : ""}
      </form>`);
    $("#fNova").onsubmit = async e => {
      e.preventDefault();
      try { await OPS.srv.definirSenha($("#fNovaSenha").value); recuperando = false; render(); }
      catch (er) { telaNovaSenha("Não foi possível salvar: " + er.message, true); }
    };
  }

  function telaSemVinculo() {
    el().innerHTML = card("Conta sem vínculo com o fórum",
      aviso("Você entrou, mas sua conta ainda não está ligada a uma instituição do fórum. Fale com a coordenação.") +
      `<button class="btn btn-s" id="fSair">Sair</button>`);
    $("#fSair").onclick = () => OPS.srv.sair();
  }

  /* ---------- painel do membro ---------- */
  function oficialDe(mun, ind) {
    const m = M();
    if (!m || OPS.estado.semDoc || m.id !== mun) return { valor: "", fonte: "" };
    const I = m.indicadores[ind];
    if (I && typeof I.v === "number") return { valor: ind === "hidrometros" || ind === "ligacoesAgua" ? fmtBR(I.v) : fmtPct(I.v), fonte: I.fonte || "" };
    const it = m.verificacaoCampo && m.verificacaoCampo.itens.find(i => i.ind === ind);
    return it ? { valor: it.oficial, fonte: it.fonteOficial || "" } : { valor: "", fonte: "" };
  }

  function formProposta() {
    const cat = [...(window.OPS_CATALOGO || [])].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    const atual = OPS.estado.semDoc ? OPS.estado.semDoc.id : M().id;
    return card("Propor correção", `
      <form id="fProp" class="forum-form forum-grade">
        <label class="campo"><span>Município</span><select id="pMun">${cat.map(c => `<option value="${c.id}" ${c.id === atual ? "selected" : ""}>${esc(c.nome)}</option>`).join("")}</select></label>
        <label class="campo"><span>Dado</span><select id="pInd">${INDICADORES.map(([k, r]) => `<option value="${k}">${esc(r)}</option>`).join("")}</select></label>
        <label class="campo" id="pRotCampo" hidden><span>Nome do dado</span><input id="pRot" maxlength="120"></label>
        <label class="campo"><span>Valor oficial <em>(como está no documento)</em></span><input id="pOf" maxlength="120"></label>
        <label class="campo"><span>Fonte do valor oficial</span><input id="pFonte" maxlength="200"></label>
        <label class="campo"><span>Valor verificado</span><input id="pVal" maxlength="120" required placeholder="Ex.: 62,4% ou Sem reservação"></label>
        <label class="campo forum-largo"><span>Evidência <em>(como foi verificado: visita, medição, documento, data)</em></span>
          <textarea id="pEv" minlength="10" maxlength="2000" required></textarea></label>
        <label class="campo forum-largo"><span>Link da evidência <em>(opcional: relatório, fotos, planilha)</em></span><input id="pUrl" type="url" maxlength="500" placeholder="https://"></label>
        <div class="forum-largo"><button class="btn btn-p" type="submit">Enviar para confirmação</button> <span id="pMsg"></span></div>
      </form>`, "A correção fica “em validação” até outra instituição do fórum confirmar. O valor oficial continua visível ao lado.");
  }

  function ligarProposta() {
    const preencher = () => {
      const ind = $("#pInd").value, o = oficialDe($("#pMun").value, ind);
      $("#pOf").value = o.valor; $("#pFonte").value = o.fonte;
      $("#pRotCampo").hidden = ind !== "outro"; $("#pRot").required = ind === "outro";
    };
    $("#pMun").onchange = preencher; $("#pInd").onchange = preencher; preencher();
    $("#fProp").onsubmit = async e => {
      e.preventDefault();
      if (ocupado) return;
      const ind = $("#pInd").value, mun = $("#pMun").value;
      const rot = ind === "outro" ? $("#pRot").value.trim() : INDICADORES.find(x => x[0] === ind)[1];
      const url = $("#pUrl").value.trim();
      ocupado = true;
      try {
        await OPS.srv.proporCorrecao({ municipio_id: mun, municipio_nome: nomeMun(mun), indicador: ind === "outro" ? "outro:" + rot.toLowerCase().slice(0, 50) : ind,
          rotulo: rot, valor_oficial: $("#pOf").value.trim() || null, fonte_oficial: $("#pFonte").value.trim() || null,
          valor_proposto: $("#pVal").value.trim(), evidencia: $("#pEv").value.trim(), evidencia_url: url || null });
        OPS.medir("correcao_proposta", { mun, ind });
        await render("Correção enviada. Ela aparece para as outras instituições confirmarem.");
      } catch (er) { $("#pMsg").innerHTML = aviso("Não foi possível enviar: " + er.message, true); }
      finally { ocupado = false; }
    };
  }

  const linhaCorrecao = (c, acoes) => `
    <div class="forum-item">
      <div class="forum-item-cab"><b>${esc(c.rotulo)}</b> · ${esc(c.municipio_nome)} ${statusPill(c.status)}</div>
      <dl class="dl"><dt>Oficial</dt><dd>${esc(c.valor_oficial || "não informado")}${c.fonte_oficial ? ` <span class="sub">(${esc(c.fonte_oficial)})</span>` : ""}</dd>
        <dt>Verificado</dt><dd><b>${esc(c.valor_proposto)}</b></dd>
        <dt>Evidência</dt><dd>${esc(c.evidencia)}${c.evidencia_url ? ` · <a href="${esc(c.evidencia_url)}" target="_blank" rel="noopener noreferrer">abrir</a>` : ""}</dd>
        <dt>Proposto por</dt><dd>${esc((c.autor_perfil || {}).nome || "—")} · ${esc((c.instituicao || {}).sigla || "")} · ${data(c.criado_em)}</dd>
        ${c.revisado_em ? `<dt>Revisado por</dt><dd>${esc((c.revisor || {}).sigla || "")} · ${data(c.revisado_em)}${c.motivo_rejeicao ? ` · ${esc(c.motivo_rejeicao)}` : ""}</dd>` : ""}</dl>
      ${acoes ? `<div class="forum-acoes">
        <button class="btn btn-p" data-certificar="${c.id}">Confirmar e certificar</button>
        <button class="btn btn-s" data-rejeitar="${c.id}">Rejeitar</button></div>` : ""}
    </div>`;

  async function render(msg) {
    if (!aberto()) return;
    if (!OPS.srv.ativo) return telaDesligada();
    if (recuperando) return telaNovaSenha();
    if (!sessao) return telaLogin(msg);
    if (!perfil) {
      try { perfil = await OPS.srv.perfil(sessao.user.id); } catch (e) { perfil = null; }
      if (!perfil) return telaSemVinculo();
    }
    const admin = perfil.papel === "admin";
    el().innerHTML = card("Carregando…", "");
    let pend = [], cert = [], rej = [], rels = [], hist = [];
    try {
      [pend, cert, rej, insts] = await Promise.all([OPS.srv.correcoes("em_validacao"), OPS.srv.correcoes("certificado"),
        OPS.srv.correcoes("rejeitado"), OPS.srv.instituicoes()]);
      if (admin) [rels, hist] = await Promise.all([OPS.srv.relatosModeracao(), OPS.srv.historico()]);
    } catch (e) { el().innerHTML = card("Erro", aviso("Não foi possível carregar a área do fórum: " + e.message, true)); return; }

    const aguardando = pend.filter(c => admin || c.instituicao_id !== perfil.instituicao_id);
    const minhas = pend.filter(c => c.autor === perfil.id);
    const revisadas = cert.concat(rej).sort((a, b) => String(b.revisado_em).localeCompare(String(a.revisado_em))).slice(0, 15);
    const inst = perfil.instituicao || {};

    el().innerHTML = `
      <div class="forum-topo">
        <span><b>${esc(perfil.nome)}</b> · ${esc(inst.sigla || "")}${admin ? " · coordenação" : ""}</span>
        <button class="btn btn-s" id="fSair">Sair</button>
      </div>
      ${msg ? aviso(msg) : ""}
      ${formProposta()}
      ${card(`Aguardando sua confirmação <span class="cnt">${aguardando.length}</span>`,
        aguardando.length ? aguardando.map(c => linhaCorrecao(c, true)).join("") : aviso("Nenhuma correção de outra instituição esperando confirmação."),
        admin ? "Como coordenação, você pode confirmar qualquer correção." : "Só aparecem correções de outras instituições: ninguém certifica o próprio dado.")}
      ${card(`Suas propostas em validação <span class="cnt">${minhas.length}</span>`,
        minhas.length ? minhas.map(c => linhaCorrecao(c, false)).join("") : aviso("Nenhuma proposta sua esperando confirmação."))}
      ${card("Revisadas recentemente", revisadas.length ? revisadas.map(c => linhaCorrecao(c, false)).join("") : aviso("Nenhuma correção revisada ainda."))}
      ${admin ? cardModeracao(rels) + cardMembros() + cardHistorico(hist) : ""}`;

    $("#fSair").onclick = () => OPS.srv.sair();
    ligarProposta();
    $$("[data-certificar]").forEach(b => b.onclick = () => revisar(+b.dataset.certificar, true, null, pend));
    $$("[data-rejeitar]").forEach(b => b.onclick = () => {
      const motivo = prompt("Motivo da rejeição (fica no histórico):");
      if (motivo != null) revisar(+b.dataset.rejeitar, false, motivo, pend);
    });
    if (admin) ligarAdmin();
  }

  async function revisar(id, certificar, motivo, pend) {
    if (ocupado) return;
    ocupado = true;
    try {
      await OPS.srv.revisar(id, certificar, motivo);
      const c = pend.find(x => x.id === id);
      OPS.medir(certificar ? "correcao_certificada" : "correcao_rejeitada", { mun: c ? c.municipio_id : "" });
      if (c && OPS.estado.mun && c.municipio_id === OPS.estado.mun.id) sincronizarServidor(OPS.estado.mun);
      ocupado = false;
      await render(certificar ? "Correção certificada. O dado já aparece como certificado no painel." : "Correção rejeitada.");
    } catch (e) { ocupado = false; alert(e.message); }
  }

  /* ---------- coordenação ---------- */
  const TIPOS = Object.fromEntries(TIPOS_RELATO.map(t => [t.id, t.rot]));
  function cardModeracao(rels) {
    return card(`Relatos em moderação <span class="cnt">${rels.length}</span>`, rels.length ? rels.map(r => `
      <div class="forum-item">
        <div class="forum-item-cab"><b>${esc(TIPOS[r.tipo] || r.tipo)}</b> · ${esc(nomeMun(r.municipio_id))} · ${data(r.criado_em)}</div>
        <p>${esc(r.texto || "(sem descrição)")}</p>
        <dl class="dl"><dt>Local</dt><dd>${r.lat != null ? `${Number(r.lat).toFixed(4)}, ${Number(r.lon).toFixed(4)}` : "não marcado"}</dd>
          <dt>Contato</dt><dd>${esc((r.contato && (r.contato.contato || (r.contato[0] || {}).contato)) || "não informado")}</dd></dl>
        <div class="forum-acoes"><button class="btn btn-p" data-publicar="${r.id}">Publicar</button>
          <button class="btn btn-s" data-recusar="${r.id}">Não publicar</button></div>
      </div>`).join("") : aviso("Nenhum relato esperando moderação."),
      "O contato de quem relatou só aparece aqui. Publique relatos sem dados pessoais na descrição.");
  }

  function cardMembros() {
    return card("Vincular membro", `
      <form id="fMembro" class="forum-form forum-grade">
        <label class="campo"><span>E-mail da conta</span><input type="email" id="mEmail" required></label>
        <label class="campo"><span>Nome</span><input id="mNome" maxlength="80" required></label>
        <label class="campo"><span>Instituição</span><select id="mInst">${insts.map(i => `<option value="${i.id}">${esc(i.sigla)} · ${esc(i.nome)}</option>`).join("")}</select></label>
        <label class="campo"><span>Papel</span><select id="mPapel"><option value="membro">Membro</option><option value="admin">Coordenação</option></select></label>
        <div class="forum-largo"><button class="btn btn-p" type="submit">Vincular</button> <span id="mMsg"></span></div>
      </form>`, "Antes, convide a pessoa no Supabase (Authentication → Users → Invite). Instituições novas entram pelo SQL Editor.");
  }

  function cardHistorico(hist) {
    const desc = h => h.tabela === "correcoes"
      ? `${h.acao === "insert" ? "Proposta" : "Revisão"}: ${h.dados.rotulo} · ${h.dados.municipio_nome} → ${h.dados.status}`
      : `Relato ${h.dados.id} · ${nomeMun(h.dados.municipio_id)} → ${h.dados.status}`;
    return card("Histórico", hist.length ? `<ul class="lista">${hist.map(h => `<li>${data(h.em)} · ${esc(desc(h))}</li>`).join("")}</ul>` : aviso("Sem registros."),
      "Toda proposta, revisão e moderação fica registrada.");
  }

  function ligarAdmin() {
    $$("[data-publicar]").forEach(b => b.onclick = () => moderar(+b.dataset.publicar, true));
    $$("[data-recusar]").forEach(b => b.onclick = () => moderar(+b.dataset.recusar, false));
    $("#fMembro").onsubmit = async e => {
      e.preventDefault();
      try {
        await OPS.srv.vincular($("#mEmail").value.trim(), $("#mNome").value.trim(), +$("#mInst").value, $("#mPapel").value);
        await render("Membro vinculado.");
      } catch (er) { $("#mMsg").innerHTML = aviso(er.message, true); }
    };
  }

  async function moderar(id, publicar) {
    if (ocupado) return;
    ocupado = true;
    try {
      const r = await OPS.srv.moderar(id, publicar);
      if (publicar && OPS.estado.mun && r.municipio_id === OPS.estado.mun.id) sincronizarServidor(OPS.estado.mun);
      ocupado = false;
      await render(publicar ? "Relato publicado." : "Relato não publicado.");
    } catch (e) { ocupado = false; alert(e.message); }
  }

  /* ---------- sessão ---------- */
  function iniciar() {
    if (iniciado || !OPS.srv.ativo) return;
    iniciado = true;
    OPS.srv.aoMudarSessao((evento, s) => {
      sessao = s;
      if (!s || (perfil && perfil.id !== s.user.id)) perfil = null;
      if (evento === "PASSWORD_RECOVERY") { recuperando = true; location.hash = "forum"; }
      if (evento === "SIGNED_IN" && sessao) OPS.medir("forum_login", {});
      /* render fora do callback: o cliente do Supabase não aceita novas chamadas dentro dele */
      setTimeout(() => render(), 0);
    });
  }
  iniciar();

  return { abrir: () => { iniciar(); render(); } };
})();
