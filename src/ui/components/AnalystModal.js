export class AnalystModal {
  constructor(containerElement, onApplySuggestion) {
    this.container = containerElement;
    this.onApplySuggestion = onApplySuggestion;
  }

  escapeHtml(unsafe) {
    if (unsafe === null || unsafe === undefined) return '';
    return String(unsafe)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Shared overlay — full-screen backdrop, bottom-sheet on mobile, centered on desktop
  _createOverlay() {
    this.container.innerHTML = '';
    this.container.className = 'fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex justify-center';
    // Bottom-sheet on mobile, centered on desktop — via inline style + media-query-safe approach
    this.container.style.cssText = 'display:flex; align-items:flex-end;';
    this.container.style.setProperty('--modal-align', 'flex-end');

    // Align center on wider screens (640px+)
    const alignCenter = () => {
      if (window.innerWidth >= 640) {
        this.container.style.alignItems = 'center';
      } else {
        this.container.style.alignItems = 'flex-end';
      }
    };
    alignCenter();
    this._resizeHandler = alignCenter;
    window.addEventListener('resize', this._resizeHandler);
  }

  // Shared modal box — height is constrained via inline styles (more reliable than Tailwind arbitrary values on CDN)
  _createModalBox(extraClass = '') {
    const box = document.createElement('div');
    const isMobile = window.innerWidth < 640;

    box.className = [
      'glass-panel relative w-full bg-slate-900 text-white border border-white/20 shadow-2xl flex flex-col',
      isMobile ? 'rounded-t-2xl' : 'rounded-2xl',
      extraClass,
    ].filter(Boolean).join(' ');

    // Inline styles — guaranteed to apply regardless of Tailwind CDN class generation
    box.style.maxHeight    = isMobile ? '91vh' : '88vh';
    box.style.maxWidth     = isMobile ? '100%' : '32rem'; // sm:max-w-lg = 32rem
    box.style.overflowY    = 'auto';
    box.style.overflowX    = 'hidden';

    return box;
  }

  _cleanup() {
    if (this._resizeHandler) {
      window.removeEventListener('resize', this._resizeHandler);
      this._resizeHandler = null;
    }
  }

  _close() {
    this._cleanup();
    this.container.style.display = 'none';
    this.container.innerHTML = '';
  }

  show(analysis, homeTeamName, awayTeamName) {
    if (this.loadingInterval) { clearInterval(this.loadingInterval); this.loadingInterval = null; }

    this._createOverlay();
    const box = this._createModalBox();

    const safeHome = this.escapeHtml(homeTeamName);
    const safeAway = this.escapeHtml(awayTeamName);

    // Prediction option cards
    let optionsHtml = '';
    if (analysis.options && Array.isArray(analysis.options)) {
      optionsHtml = analysis.options.map((opt, idx) => {
        const safeHomeScore = this.escapeHtml(opt.home_score);
        const safeAwayScore = this.escapeHtml(opt.away_score);
        const safeProb      = this.escapeHtml(Math.round(opt.probability * 100));
        const safeDesc      = this.escapeHtml(opt.description);
        return `
          <div style="border:1px solid rgba(255,255,255,0.1); border-radius:12px; padding:12px; background:rgba(255,255,255,0.04); margin-bottom:8px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
              <span style="font-size:11px; font-weight:700; color:#fbbf24; text-transform:uppercase; letter-spacing:0.05em;">
                Escenario ${idx + 1}
              </span>
              <span style="font-size:11px; background:rgba(251,191,36,0.15); color:#fcd34d; padding:2px 8px; border-radius:999px; font-weight:600; white-space:nowrap;">
                ${safeProb}% prob.
              </span>
            </div>
            <div style="font-size:13px; font-weight:700; line-height:1.4; margin-bottom:5px; word-break:break-word;">
              ${safeHome} <span style="color:#fbbf24;">${safeHomeScore} – ${safeAwayScore}</span> ${safeAway}
            </div>
            <p style="font-size:11px; color:#9ca3af; line-height:1.5; margin:0;">${safeDesc}</p>
          </div>`;
      }).join('');
    } else {
      const h = this.escapeHtml(analysis.estimatedScore?.home ?? '-');
      const a = this.escapeHtml(analysis.estimatedScore?.away ?? '-');
      optionsHtml = `
        <div style="background:rgba(251,191,36,0.1); border:1px solid rgba(251,191,36,0.2); border-radius:12px; padding:14px;">
          <span style="font-size:11px; color:#fbbf24; font-weight:600; display:block; text-transform:uppercase; margin-bottom:4px;">Resultado Sugerido</span>
          <span style="font-size:14px; font-weight:700;">${safeHome} ${h} – ${a} ${safeAway}</span>
        </div>`;
    }

    const playedVal   = this.escapeHtml(analysis.h2hRecord?.played    ?? '-');
    const homeWinsVal = this.escapeHtml(analysis.h2hRecord?.home_wins  ?? '-');
    const awayWinsVal = this.escapeHtml(analysis.h2hRecord?.away_wins  ?? '-');
    const drawsVal    = this.escapeHtml(analysis.h2hRecord?.draws      ?? '-');
    const safeContext = this.escapeHtml(analysis.contextSummary);

    box.innerHTML = `
      <!-- Fixed header -->
      <div style="padding:14px 14px 10px; border-bottom:1px solid rgba(255,255,255,0.08); flex-shrink:0; display:flex; align-items:center; justify-content:space-between;">
        <h3 style="font-size:15px; font-weight:700; display:flex; align-items:center; gap:8px; margin:0;">
          <span>🤖</span> Análisis del Analista
        </h3>
        <button id="close-modal-btn"
          style="width:32px;height:32px;display:flex;align-items:center;justify-content:center;
                 border-radius:50%;background:rgba(255,255,255,0.08);border:none;
                 color:#9ca3af;font-size:18px;font-weight:700;cursor:pointer;flex-shrink:0;">
          &times;
        </button>
      </div>

      <!-- Scrollable body -->
      <div style="flex:1; overflow-y:auto; padding:14px; -webkit-overflow-scrolling:touch;">

        <!-- H2H -->
        <p style="font-size:10px; color:#6b7280; font-weight:600; text-transform:uppercase; letter-spacing:0.08em; margin:0 0 8px;">
          Historial Directo (H2H)
        </p>
        <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:6px; text-align:center;
                    background:rgba(255,255,255,0.04); border-radius:10px; padding:10px; margin-bottom:14px;">
          <div>
            <div style="font-weight:700; font-size:15px;">${playedVal}</div>
            <div style="font-size:9px; color:#6b7280; margin-top:2px;">Jugados</div>
          </div>
          <div>
            <div style="font-weight:700; font-size:15px; color:#34d399;">${homeWinsVal}</div>
            <div style="font-size:9px; color:#6b7280; margin-top:2px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${safeHome}</div>
          </div>
          <div>
            <div style="font-weight:700; font-size:15px; color:#f87171;">${awayWinsVal}</div>
            <div style="font-size:9px; color:#6b7280; margin-top:2px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${safeAway}</div>
          </div>
          <div>
            <div style="font-weight:700; font-size:15px;">${drawsVal}</div>
            <div style="font-size:9px; color:#6b7280; margin-top:2px;">Empates</div>
          </div>
        </div>

        <!-- Context -->
        <p style="font-size:10px; color:#6b7280; font-weight:600; text-transform:uppercase; letter-spacing:0.08em; margin:0 0 8px;">
          Resumen del Contexto
        </p>
        <p style="font-size:12px; color:#e2e8f0; background:rgba(255,255,255,0.04); border-radius:10px;
                  padding:10px 12px; line-height:1.6; margin-bottom:14px; word-break:break-word;">
          ${safeContext}
        </p>

        <!-- Options -->
        <p style="font-size:10px; color:#6b7280; font-weight:600; text-transform:uppercase; letter-spacing:0.08em; margin:0 0 8px;">
          Opciones de Pronóstico
        </p>
        ${optionsHtml}
      </div>

      <!-- Fixed footer -->
      <div style="padding:10px 14px; border-top:1px solid rgba(255,255,255,0.08); flex-shrink:0; display:flex; justify-content:flex-end;">
        <button id="close-modal-footer-btn"
          style="padding:8px 18px; border-radius:8px; background:rgba(255,255,255,0.1); border:none;
                 color:white; font-weight:700; font-size:13px; cursor:pointer;">
          Cerrar
        </button>
      </div>
    `;

    const close = () => { this._close(); };
    box.querySelector('#close-modal-btn').addEventListener('click', close);
    box.querySelector('#close-modal-footer-btn').addEventListener('click', close);
    this.container.addEventListener('click', (e) => { if (e.target === this.container) close(); });

    this.container.appendChild(box);
  }

  showLoading(homeTeamName, awayTeamName) {
    if (this.loadingInterval) clearInterval(this.loadingInterval);

    this._createOverlay();
    const box = this._createModalBox();

    box.innerHTML = `
      <div style="padding:14px 14px 10px; border-bottom:1px solid rgba(255,255,255,0.08); display:flex; align-items:center; justify-content:space-between; flex-shrink:0;">
        <span style="font-size:14px; font-weight:700;">Consultando Analista IA</span>
        <button id="close-loading-btn"
          style="width:32px;height:32px;display:flex;align-items:center;justify-content:center;
                 border-radius:50%;background:rgba(255,255,255,0.08);border:none;
                 color:#9ca3af;font-size:18px;font-weight:700;cursor:pointer;">
          &times;
        </button>
      </div>

      <div style="flex:1; overflow-y:auto; padding:24px 14px; display:flex; flex-direction:column; align-items:center;">
        <!-- Spinner -->
        <div style="position:relative; width:64px; height:64px; margin-bottom:16px;">
          <div style="position:absolute;inset:0;border-radius:50%;border:4px solid rgba(255,255,255,0.1);"></div>
          <div style="position:absolute;inset:0;border-radius:50%;border:4px solid transparent;
                      border-top-color:#fbbf24;animation:spin 1s linear infinite;"></div>
          <span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:22px;">🤖</span>
        </div>

        <p style="font-size:13px; color:#fbbf24; font-weight:600; margin-bottom:4px; text-align:center;">
          ${this.escapeHtml(homeTeamName)} vs ${this.escapeHtml(awayTeamName)}
        </p>

        <div style="width:100%;max-width:280px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:12px; padding:14px; margin-top:12px;">
          <p id="loading-step-text" style="font-size:12px; color:#d1d5db; text-align:left; margin:0 0 10px;">
            Iniciando analista de IA...
          </p>
          <div style="width:100%;background:rgba(255,255,255,0.1);height:4px;border-radius:999px;overflow:hidden;">
            <div id="loading-progress-bar" style="background:#fbbf24;height:100%;border-radius:999px;width:10%;transition:width 0.5s ease;"></div>
          </div>
        </div>
      </div>
    `;

    const closeLoading = () => {
      if (this.loadingInterval) { clearInterval(this.loadingInterval); this.loadingInterval = null; }
      this._close();
    };
    box.querySelector('#close-loading-btn').addEventListener('click', closeLoading);
    this.container.appendChild(box);

    const steps = [
      { text: '🤖 Iniciando analista de IA...',                                   progress: '15%' },
      { text: '🔍 Buscando historial de partidos y H2H en Google...',             progress: '35%' },
      { text: '📊 Analizando el estado de forma reciente de los equipos...',      progress: '55%' },
      { text: '⚽ Calculando probabilidades y estimando marcadores posibles...',  progress: '75%' },
      { text: '✨ Generando reporte estructurado de predicción...',               progress: '95%' },
    ];
    let step = 0;
    this.loadingInterval = setInterval(() => {
      step++;
      if (step < steps.length) {
        const tEl = box.querySelector('#loading-step-text');
        const pEl = box.querySelector('#loading-progress-bar');
        if (tEl && pEl) { tEl.textContent = steps[step].text; pEl.style.width = steps[step].progress; }
      } else {
        clearInterval(this.loadingInterval);
        this.loadingInterval = null;
      }
    }, 3500);
  }

  showError(message, homeTeamName, awayTeamName) {
    if (this.loadingInterval) { clearInterval(this.loadingInterval); this.loadingInterval = null; }

    this._createOverlay();
    const box = this._createModalBox('border-red-500/30');

    box.innerHTML = `
      <div style="padding:14px 14px 10px; border-bottom:1px solid rgba(255,255,255,0.08); display:flex; align-items:center; justify-content:space-between; flex-shrink:0;">
        <span style="font-size:14px; font-weight:700;">No se puede predecir</span>
        <button id="close-error-btn"
          style="width:32px;height:32px;display:flex;align-items:center;justify-content:center;
                 border-radius:50%;background:rgba(255,255,255,0.08);border:none;
                 color:#9ca3af;font-size:18px;font-weight:700;cursor:pointer;">
          &times;
        </button>
      </div>

      <div style="flex:1; overflow-y:auto; padding:24px 14px; display:flex; flex-direction:column; align-items:center; text-align:center;">
        <span style="font-size:36px; margin-bottom:12px;">⚠️</span>
        <p style="font-size:13px; color:#f87171; font-weight:600; margin-bottom:8px;">
          ${this.escapeHtml(homeTeamName)} vs ${this.escapeHtml(awayTeamName)}
        </p>
        <p style="font-size:12px; color:#d1d5db; line-height:1.6; max-width:260px; margin-bottom:20px;">
          ${this.escapeHtml(message)}
        </p>
        <button id="close-error-footer-btn"
          style="padding:9px 24px; border-radius:8px; background:rgba(255,255,255,0.1); border:none;
                 color:white; font-weight:700; font-size:13px; cursor:pointer;">
          Cerrar
        </button>
      </div>
    `;

    const close = () => { this._close(); };
    box.querySelector('#close-error-btn').addEventListener('click', close);
    box.querySelector('#close-error-footer-btn').addEventListener('click', close);
    this.container.addEventListener('click', (e) => { if (e.target === this.container) close(); });

    this.container.appendChild(box);
  }
}
