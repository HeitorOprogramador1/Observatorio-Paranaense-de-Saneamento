-- Migration: 001_relatos_cidadaos.sql
-- Descrição: Criação da tabela de relatos da população para o OPS Paraná
-- Permissões: Visitantes anônimos (anon) podem apenas INSERIR registros válidos
-- Segurança: RLS ativado; status inicial travado em 'pendente' pelo banco

-- 1. Criação da tabela de relatos
CREATE TABLE IF NOT EXISTS public.relatos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    municipio TEXT NOT NULL,
    codigo_ibge TEXT NOT NULL,
    tipo TEXT NOT NULL,
    descricao TEXT NOT NULL,
    contato TEXT,
    status TEXT NOT NULL DEFAULT 'pendente',
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Habilitação do Row Level Security (RLS)
ALTER TABLE public.relatos ENABLE ROW LEVEL SECURITY;

-- 3. Limpeza de políticas existentes (garantia de idempotência)
DROP POLICY IF EXISTS "Permitir insercao anonima de relatos" ON public.relatos;
DROP POLICY IF EXISTS "Bloquear leitura publica de relatos" ON public.relatos;
DROP POLICY IF EXISTS "Bloquear edicao publica de relatos" ON public.relatos;
DROP POLICY IF EXISTS "Bloquear exclusao publica de relatos" ON public.relatos;

-- 4. Política restritiva de inserção para o público (anon / authenticated)
-- Garante que o visitante só consiga enviar com status = 'pendente'
CREATE POLICY "Permitir insercao anonima de relatos"
ON public.relatos
FOR INSERT
TO anon, authenticated
WITH CHECK (
    status = 'pendente'
    AND length(trim(municipio)) > 0
    AND length(trim(codigo_ibge)) > 0
    AND length(trim(tipo)) > 0
    AND length(trim(descricao)) >= 5
);

-- 5. Concessão explícita apenas das permissões estritamente necessárias
REVOKE ALL ON public.relatos FROM PUBLIC, anon, authenticated;
GRANT INSERT ON public.relatos TO anon, authenticated;

-- Comentários de documentação
COMMENT ON TABLE public.relatos IS 'Relatos da população sobre água, esgoto e saneamento no Paraná.';
COMMENT ON COLUMN public.relatos.status IS 'Status da moderação: pendente (padrão), publicado ou arquivado.';
