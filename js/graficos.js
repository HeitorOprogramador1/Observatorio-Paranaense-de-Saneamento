/* ==========================================================================
   OPS Paraná — Gráficos SVG Nativos (Metas e Investimentos CAPEX)
   Baseado no modelo de renderização SVG vetorial do ops-para
   ========================================================================== */
"use strict";

window.OPS_GRAFICOS = {
  // Renderiza gráfico de projeção temporal (meta vs realizado)
  renderLinhaMeta: function(svgId, ttId, config) {
    const svg = document.getElementById(svgId);
    const tt = document.getElementById(ttId);
    if (!svg) return;

    const { anos, metas, realizados, unidade, rotuloMeta, rotuloReal, corReal } = config;
    const w = 560, h = 250;
    const pad = { top: 25, right: 30, bottom: 35, left: 45 };
    const pw = w - pad.left - pad.right;
    const ph = h - pad.top - pad.bottom;

    // Calcular escala
    const todosVals = [...metas, ...(realizados.filter(v => v !== null && v !== undefined))];
    const minVal = 0;
    const maxVal = Math.max(100, Math.ceil(Math.max(...todosVals) / 10) * 10);

    const x = i => pad.left + (i / (anos.length - 1)) * pw;
    const y = v => pad.top + ph - ((v - minVal) / (maxVal - minVal)) * ph;

    let svgHtml = '';

    // Linhas de grade horizontais
    const passos = 5;
    for (let i = 0; i <= passos; i++) {
      const v = minVal + (i / passos) * (maxVal - minVal);
      const yPos = y(v);
      svgHtml += `<line class="eixo-l" x1="${pad.left}" y1="${yPos}" x2="${w - pad.right}" y2="${yPos}" stroke="#E6EAF0" stroke-width="1" />`;
      svgHtml += `<text class="rot-y" x="${pad.left - 8}" y="${yPos + 4}" text-anchor="end" font-size="11" fill="var(--ink-3)">${Math.round(v)}${unidade}</text>`;
    }

    // Linhas de grade verticais e rótulos de ano
    anos.forEach((ano, i) => {
      const xPos = x(i);
      svgHtml += `<line class="eixo-l" x1="${xPos}" y1="${pad.top}" x2="${xPos}" y2="${h - pad.bottom}" stroke="#F0F2F5" stroke-width="1" />`;
      svgHtml += `<text class="rot-x" x="${xPos}" y="${h - pad.bottom + 18}" text-anchor="middle" font-size="11" fill="var(--ink-3)">${ano}</text>`;
    });

    // Caminho da meta (tracejada)
    let dMeta = anos.map((_, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(metas[i]).toFixed(1)}`).join(' ');
    svgHtml += `<path d="${dMeta}" fill="none" stroke="var(--ink-3)" stroke-width="2" stroke-dasharray="4,4" />`;

    // Pontos da meta
    anos.forEach((ano, i) => {
      svgHtml += `<circle cx="${x(i)}" cy="${y(metas[i])}" r="3.5" fill="#fff" stroke="var(--ink-3)" stroke-width="2" class="ponto-meta" data-ano="${ano}" data-tipo="meta" data-val="${metas[i]}" />`;
    });

    // Caminho do realizado (contínua)
    const ptsReal = [];
    anos.forEach((ano, i) => {
      if (realizados[i] !== null && realizados[i] !== undefined) {
        ptsReal.push({ x: x(i), y: y(realizados[i]), val: realizados[i], ano: ano });
      }
    });

    if (ptsReal.length > 0) {
      let dReal = ptsReal.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
      svgHtml += `<path d="${dReal}" fill="none" stroke="${corReal}" stroke-width="3" />`;
      ptsReal.forEach(p => {
        svgHtml += `<circle cx="${p.x}" cy="${p.y}" r="4.5" fill="${corReal}" stroke="#fff" stroke-width="2" class="ponto-real" data-ano="${p.ano}" data-tipo="real" data-val="${p.val}" />`;
      });
    }

    svg.innerHTML = svgHtml;

    // Tooltip interativo
    if (tt) {
      const pts = svg.querySelectorAll('circle');
      pts.forEach(p => {
        p.addEventListener('mouseenter', e => {
          const ano = p.getAttribute('data-ano');
          const tipo = p.getAttribute('data-tipo');
          const val = parseFloat(p.getAttribute('data-val')).toFixed(1);
          tt.innerHTML = `
            <div style="font-weight:600;margin-bottom:2px">${ano}</div>
            <div class="l"><span>${tipo === 'meta' ? rotuloMeta : rotuloReal}:</span> <b>${val}${unidade}</b></div>
          `;
          tt.style.opacity = '1';
          const r = p.getBoundingClientRect();
          const wrapR = svg.parentElement.getBoundingClientRect();
          tt.style.left = (r.left - wrapR.left + 10) + 'px';
          tt.style.top = (r.top - wrapR.top - 20) + 'px';
        });
        p.addEventListener('mouseleave', () => {
          tt.style.opacity = '0';
        });
      });
    }
  },

  // Renderiza gráfico de barras de CAPEX por rubrica
  renderBarrasCapex: function(svgId, ttId, itens) {
    const svg = document.getElementById(svgId);
    const tt = document.getElementById(ttId);
    if (!svg || !itens || !itens.length) return;

    const w = 700, h = 380;
    const pad = { top: 30, right: 40, bottom: 65, left: 160 };
    const pw = w - pad.left - pad.right;
    const ph = h - pad.top - pad.bottom;

    const maxVal = Math.max(...itens.map(d => d.valor));
    const barHeight = Math.min(32, Math.floor(ph / itens.length) - 10);
    const step = ph / itens.length;

    let svgHtml = '';

    // Eixos e linhas de referência
    const passos = 4;
    for (let i = 0; i <= passos; i++) {
      const frac = i / passos;
      const xPos = pad.left + frac * pw;
      const v = (frac * maxVal) / 1e6; // em milhões
      svgHtml += `<line class="eixo-l" x1="${xPos}" y1="${pad.top}" x2="${xPos}" y2="${h - pad.bottom}" stroke="#E6EAF0" stroke-width="1" />`;
      svgHtml += `<text class="rot-x" x="${xPos}" y="${h - pad.bottom + 20}" text-anchor="middle" font-size="11" fill="var(--ink-3)">R$ ${v.toFixed(0)} mi</text>`;
    }

    // Barras horizontais
    itens.forEach((d, i) => {
      const yPos = pad.top + i * step + (step - barHeight) / 2;
      const barW = Math.max(4, (d.valor / maxVal) * pw);
      const valFmt = d.valor >= 1e9 ? `R$ ${(d.valor / 1e9).toFixed(2)} bi` : `R$ ${(d.valor / 1e6).toFixed(1)} mi`;

      svgHtml += `
        <text x="${pad.left - 10}" y="${yPos + barHeight / 2 + 4}" text-anchor="end" font-size="12" font-weight="500" fill="var(--ink)">${d.rotulo}</text>
        <rect x="${pad.left}" y="${yPos}" width="${barW}" height="${barHeight}" rx="4" fill="${d.cor}" class="barra-capex" data-rotulo="${d.rotulo}" data-valor="${valFmt}" data-pct="${d.pct || ''}" />
        <text x="${pad.left + barW + 8}" y="${yPos + barHeight / 2 + 4}" font-size="11" font-weight="600" fill="var(--ink-2)">${valFmt}</text>
      `;
    });

    svg.innerHTML = svgHtml;

    // Tooltip
    if (tt) {
      const barras = svg.querySelectorAll('.barra-capex');
      barras.forEach(b => {
        b.addEventListener('mouseenter', e => {
          const rot = b.getAttribute('data-rotulo');
          const val = b.getAttribute('data-valor');
          const pct = b.getAttribute('data-pct');
          tt.innerHTML = `
            <div style="font-weight:600;margin-bottom:2px">${rot}</div>
            <div class="l"><span>Investimento previsto:</span> <b>${val}</b></div>
            ${pct ? `<div class="l"><span>Participação:</span> <b>${pct}%</b></div>` : ''}
          `;
          tt.style.opacity = '1';
          const r = b.getBoundingClientRect();
          const wrapR = svg.parentElement.getBoundingClientRect();
          tt.style.left = (r.left - wrapR.left + 50) + 'px';
          tt.style.top = (r.top - wrapR.top - 10) + 'px';
        });
        b.addEventListener('mouseleave', () => {
          tt.style.opacity = '0';
        });
      });
    }
  }
};
