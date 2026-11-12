# Observatório Paranaense do Saneamento (OPS)

Plataforma analítica e painel interativo de dados para monitoramento e transparência do saneamento básico nos **399 municípios do Estado do Paraná**, abrangendo integralmente os quatro eixos estruturais da **Lei Federal nº 11.445/2007 (atualizada pela Lei Federal nº 14.026/2020 - Marco Legal do Saneamento)** e da **Lei Complementar Estadual nº 237/2021**.

---

## 📌 Visão Geral

O **OPS** consolida os dados oficiais extraídos diretamente dos **Planos Regionais de Saneamento Básico (PRSB)** das três Microrregiões de Água e Esgoto do Paraná e das deliberações das **11ªs Assembleias Gerais de 2025 (SECID / AGEPAR / SANEPAR)**:

1. **MRAE 1 - Centro-Litoral** (36 municípios - Região Metropolitana de Curitiba, Litoral e Vale do Ribeira)
2. **MRAE 2 - Centro-Leste** (155 municípios - Campos Gerais, Centro-Sul, Norte Pioneiro e Norte Central)
3. **MRAE 3 - Oeste** (208 municípios - Oeste, Sudoeste, Noroeste e Norte Central)

---

## 🌊 Os Quatro Eixos Estruturais

| Eixo | Descrição & Escopo | Meta Oficial |
| :--- | :--- | :--- |
| **💧 1. Abastecimento de Água** | Cobertura total e urbana, segurança hídrica, mananciais, controle de perdas na rede (média PR: 26,8%) e Planos de Segurança da Água (PSA). | **99% da população até 2033** |
| **🚽 2. Esgotamento Sanitário** | Coleta, transporte, interceptores, tratamento de efluentes em ETEs, índice de tratamento (94,2% do coletado) e readequação de contratos da Sanepar. | **90% da população até 2033** |
| **🌧️ 3. Drenagem Urbana (DMAPU)** | Capítulo 8 do PRSB: Diretrizes do Instituto Água e Terra (IAT), controle de cheias e inundações, bacias de amortecimento, galerias e SbN. | **R$ 2.047/hab. em obras e gestão** |
| **♻️ 4. Gestão de Resíduos (PERS-PR)** | Metas integradas do Plano Estadual de Resíduos Sólidos: consórcios públicos de RSU, coleta seletiva, valorização de lodos de ETA/ETE e desvio de aterro. | **100% Coleta Seletiva / -30% Aterros** |

---

## 📊 Principais Indicadores e Investimentos

* **População Coberta:** 11.675.661 habitantes (Censo IBGE 2022).
* **Total de Municípios:** 399 municípios com diagnóstico individual completo.
* **Cobertura Média de Água Total:** 87,7% (Urbano médio de 94,8%).
* **Cobertura Média de Esgotamento Total:** 36,7% (Urbano médio de 47,9%).
* **Índice Médio de Perdas na Distribuição:** 26,8% (abaixo da média nacional de ~40%).
* **CAPEX Total para Universalização (2022-2033):** **R$ 15,50 Bilhões**
  * *MRAE 1:* R$ 5,69 bilhões
  * *MRAE 2:* R$ 4,10 bilhões
  * *MRAE 3:* R$ 5,72 bilhões

---

## 🚀 Como Executar

A plataforma foi desenvolvida em arquitetura leve, moderna e auto-contida. Não depende de bancos de dados externos nem de processos de build complexos.

### Opção 1: Execução Direta (Sem Servidor)
Dê um duplo clique no arquivo [`index.html`](file:///C:/Users/heito/.gemini/antigravity/scratch/observatorio-saneamento-pr/index.html) para abri-lo diretamente no Google Chrome, Microsoft Edge, Firefox ou qualquer navegador moderno. Os dados são carregados instantaneamente via bundle offline.

### Opção 2: Servidor Local (Python)
Para rodar como serviço web local:
```powershell
cd "C:\Users\heito\.gemini\antigravity\scratch\observatorio-saneamento-pr"
python -m http.server 8080
```
Em seguida, acesse no navegador: `http://localhost:8080`

### Opção 3: Servidor Local (Node.js)
```powershell
npx serve "C:\Users\heito\.gemini\antigravity\scratch\observatorio-saneamento-pr"
```

---

## 🗂️ Estrutura do Projeto

```
observatorio-saneamento-pr/
├── index.html                   # Página principal e portal do Observatório
├── README.md                    # Esta documentação completa
├── css/
│   └── styles.css               # Folha de estilos customizada, Glassmorphism e Print Styles
├── js/
│   └── app.js                   # Lógica da aplicação, gráficos Chart.js, mapa Leaflet e filtros
└── data/
    ├── data_bundle.js           # Bundle de dados para execução instantânea offline (file://)
    ├── municipios_completo.json  # Base de dados JSON dos 399 municípios com coordenadas
    ├── municipios_completo.csv   # Base tabular CSV para exportação e integração com Excel/BI
    └── regional_metadata.json   # Metadados regionais, CAPEX, metas legais e diretrizes do IAT
```

---

## 📑 Fontes Oficiais de Dados

Os dados foram minerados e estruturados a partir dos documentos arquivados na pasta `OPS`:
* `PRSB_MRAE1_Centro-Litoral.pdf` (533 páginas, SECID / Governo do Paraná)
* `PRSB_MRAE2_Centro-Leste.pdf` (1.072 páginas, SECID / Governo do Paraná)
* `PRSB_MRAE3_Oeste.pdf` (1.290 páginas, SECID / Governo do Paraná)
* `Aditivo_PRSB_2025_Resolucao_MRAE1_Centro-Litoral.pdf` (67 páginas, 11ª Assembleia Geral 2025)
* `Aditivo_PRSB_2025_Resolucao_MRAE2_Centro-Leste.pdf` (102 páginas, 11ª Assembleia Geral 2025)
* `Aditivo_PRSB_2025_Resolucao_MRAE3_Oeste.pdf` (129 páginas, 11ª Assembleia Geral 2025)
* `Sistema Nacional de Informações sobre Saneamento (SNIS)`
* `DATASUS / Ministério da Saúde` (Indicadores DRSAI)
* `Instituto Brasileiro de Geografia e Estatística (IBGE)` (Censo 2022 e Malha Municipal)
