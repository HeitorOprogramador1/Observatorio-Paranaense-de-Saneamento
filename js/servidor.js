/* ==========================================================================
   OPS Paraná — Serviço Supabase para Relatos da População
   Usa supabase-js via CDN oficial.
   Permite apenas envio seguro com validação e status "pendente" automático.
   ========================================================================== */
"use strict";

window.OPS_SERVICO = (function() {
  let cliente = null;

  function obterCliente() {
    if (cliente) return cliente;
    const cfg = window.OPS_SUPABASE || {};
    if (cfg.url && cfg.chave && window.supabase && typeof window.supabase.createClient === "function") {
      cliente = window.supabase.createClient(cfg.url, cfg.chave);
    }
    return cliente;
  }

  return {
    isConfigurado: function() {
      const cfg = window.OPS_SUPABASE || {};
      return !!(cfg.url && cfg.chave && cfg.url !== "https://SEU_PROJETO.supabase.co");
    },

    enviarRelato: async function(dados) {
      const sb = obterCliente();
      if (!sb) {
        throw new Error("A conexão com o servidor do Observatório (Supabase) não pôde ser inicializada.");
      }

      // Validação prévia no cliente
      if (!dados.municipio || !dados.codigo_ibge) {
        throw new Error("Município ou código IBGE não informado.");
      }
      if (!dados.tipo) {
        throw new Error("Selecione o tipo do problema.");
      }
      if (!dados.descricao || dados.descricao.trim().length < 5) {
        throw new Error("Por favor, forneça uma descrição detalhada com pelo menos 5 caracteres.");
      }

      // Payload estrito: NÃO envia campo 'status' (definido exclusivamente pelo banco via default/RLS)
      const payload = {
        municipio: String(dados.municipio).trim(),
        codigo_ibge: String(dados.codigo_ibge).trim(),
        tipo: String(dados.tipo).trim(),
        descricao: String(dados.descricao).trim(),
        contato: dados.contato ? String(dados.contato).trim() : null
      };

      const { data, error } = await sb
        .from("relatos")
        .insert([payload]);

      if (error) {
        console.error("Erro retornado pelo Supabase:", error);
        throw new Error(error.message || "Falha ao registrar relato no banco de dados.");
      }

      return { sucesso: true };
    },

    /* ---------- Métodos de Autenticação para Área do Fórum ---------- */
    getCliente: obterCliente,

    entrar: async function(email, senha) {
      const sb = obterCliente();
      if (!sb) throw new Error("A conexão com o servidor do Observatório (Supabase) não pôde ser inicializada.");
      const { data, error } = await sb.auth.signInWithPassword({ email: String(email).trim(), password: String(senha) });
      if (error) throw error;
      return data;
    },

    sair: async function() {
      const sb = obterCliente();
      if (sb) {
        try { await sb.auth.signOut(); } catch (e) {}
      }
    },

    recuperarSenha: async function(email) {
      const sb = obterCliente();
      if (!sb) throw new Error("A conexão com o servidor do Observatório (Supabase) não pôde ser inicializada.");
      const { data, error } = await sb.auth.resetPasswordForEmail(String(email).trim(), {
        redirectTo: window.location.origin + window.location.pathname + "#forum"
      });
      if (error) throw error;
      return data;
    },

    obterSessao: async function() {
      const sb = obterCliente();
      if (!sb) return null;
      const { data } = await sb.auth.getSession();
      return data ? data.session : null;
    },

    aoMudarSessao: function(callback) {
      const sb = obterCliente();
      if (!sb) return;
      return sb.auth.onAuthStateChange(callback);
    }
  };
})();
