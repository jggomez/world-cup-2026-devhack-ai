export class AnalystModal {
  constructor(containerElement, onApplySuggestion) {
    this.container = containerElement;
    this.onApplySuggestion = onApplySuggestion;
  }

  escapeHtml(unsafe) {
    if (unsafe === null || unsafe === undefined) return '';
    return String(unsafe)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  show(analysis, homeTeamName, awayTeamName) {
    if (this.loadingInterval) {
      clearInterval(this.loadingInterval);
      this.loadingInterval = null;
    }

    this.container.innerHTML = '';
    this.container.className = 'fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50 p-4';
    this.container.style.display = 'flex';

    const modalContent = document.createElement('div');
    modalContent.className = 'glass-panel max-w-lg w-full border border-white/20 relative shadow-2xl animate-fade-in p-6 bg-slate-900 text-white rounded-2xl';

    // Escape variable inputs for secure rendering
    const safeHome = this.escapeHtml(homeTeamName);
    const safeAway = this.escapeHtml(awayTeamName);

    // Build the prediction options HTML list
    let optionsHtml = '';
    if (analysis.options && Array.isArray(analysis.options)) {
      optionsHtml = analysis.options.map((opt, idx) => {
        const safeHomeScore = this.escapeHtml(opt.home_score);
        const safeAwayScore = this.escapeHtml(opt.away_score);
        const safeProb = this.escapeHtml(Math.round(opt.probability * 100));
        const safeDesc = this.escapeHtml(opt.description);
        return `
          <div class="flex flex-col justify-between items-start bg-white/5 border border-white/10 hover:border-amber-400/50 p-3 rounded-xl gap-2 transition duration-200">
            <div class="flex-1 w-full">
              <div class="flex items-center gap-2">
                <span class="text-sm font-bold text-amber-400">Escenario ${idx + 1}:</span>
                <span class="text-lg font-bold">${safeHome} ${safeHomeScore} - ${safeAwayScore} ${safeAway}</span>
                <span class="text-xs px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-semibold">${safeProb}% prob.</span>
              </div>
              <p class="text-xs text-gray-300 mt-1">${safeDesc}</p>
            </div>
          </div>
        `;
      }).join('');
    } else {
      // Fallback if no options array
      const estHome = this.escapeHtml(analysis.estimatedScore ? analysis.estimatedScore.home : '-');
      const estAway = this.escapeHtml(analysis.estimatedScore ? analysis.estimatedScore.away : '-');
      optionsHtml = `
        <div class="bg-amber-400/10 border border-amber-400/20 p-4 rounded-xl">
          <span class="text-xs text-amber-400 font-semibold block uppercase">Resultado Sugerido</span>
          <span class="text-lg font-bold">${safeHome} ${estHome} - ${estAway} ${safeAway}</span>
        </div>
      `;
    }

    const playedVal = this.escapeHtml(analysis.h2hRecord ? analysis.h2hRecord.played : '-');
    const homeWinsVal = this.escapeHtml(analysis.h2hRecord ? analysis.h2hRecord.home_wins : '-');
    const awayWinsVal = this.escapeHtml(analysis.h2hRecord ? analysis.h2hRecord.away_wins : '-');
    const drawsVal = this.escapeHtml(analysis.h2hRecord ? analysis.h2hRecord.draws : '-');
    const safeContext = this.escapeHtml(analysis.contextSummary);

    modalContent.innerHTML = `
      <button id="close-modal-btn" class="absolute top-4 right-4 text-gray-400 hover:text-white font-bold text-xl">&times;</button>
      
      <h3 class="text-xl font-bold mb-4 flex items-center gap-2 text-white">
        <span class="text-amber-400">🤖</span> Análisis del Analista
      </h3>

      <div class="mb-4">
        <h4 class="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">Historial Directo (H2H)</h4>
        <div class="grid grid-cols-4 gap-2 text-center text-sm py-2 bg-white/5 rounded-lg">
          <div><div class="font-bold">${playedVal}</div><div class="text-[10px] text-gray-400">Jugados</div></div>
          <div><div class="font-bold text-green-400">${homeWinsVal}</div><div class="text-[10px] text-gray-400">Gana ${safeHome}</div></div>
          <div><div class="font-bold text-red-400">${awayWinsVal}</div><div class="text-[10px] text-gray-400">Gana ${safeAway}</div></div>
          <div><div class="font-bold">${drawsVal}</div><div class="text-[10px] text-gray-400">Empates</div></div>
        </div>
      </div>

      <div class="mb-4">
        <h4 class="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">Resumen del Contexto</h4>
        <p class="text-sm text-gray-200 bg-white/5 p-3 rounded-lg leading-relaxed">${safeContext}</p>
      </div>

      <div class="mb-6">
        <h4 class="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">Opciones de Pronóstico</h4>
        <div class="flex flex-col gap-3">
          ${optionsHtml}
        </div>
      </div>

      <div class="flex justify-end">
        <button id="close-modal-footer-btn" class="px-4 py-2 rounded bg-white/10 hover:bg-white/20 transition text-white font-bold text-sm">Cerrar</button>
      </div>
    `;

    const closeModal = () => {
      this.container.style.display = 'none';
      this.container.innerHTML = '';
    };

    modalContent.querySelector('#close-modal-btn').addEventListener('click', closeModal);
    modalContent.querySelector('#close-modal-footer-btn').addEventListener('click', closeModal);

    this.container.appendChild(modalContent);
  }

  showLoading(homeTeamName, awayTeamName) {
    if (this.loadingInterval) {
      clearInterval(this.loadingInterval);
    }

    this.container.innerHTML = '';
    this.container.className = 'fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50 p-4';
    this.container.style.display = 'flex';

    const modalContent = document.createElement('div');
    modalContent.className = 'glass-panel max-w-lg w-full border border-white/20 relative shadow-2xl animate-fade-in p-6 bg-slate-900 text-white rounded-2xl text-center';

    modalContent.innerHTML = `
      <button id="close-loading-btn" class="absolute top-4 right-4 text-gray-400 hover:text-white font-bold text-xl">&times;</button>
      <div class="flex flex-col items-center justify-center py-8">
        <!-- Spinner -->
        <div class="relative w-20 h-20 mb-6">
          <div class="absolute inset-0 rounded-full border-4 border-white/10"></div>
          <div class="absolute inset-0 rounded-full border-4 border-t-amber-400 border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
          <span class="absolute inset-0 flex items-center justify-center text-2xl animate-pulse">🤖</span>
        </div>
        
        <h3 class="text-xl font-bold mb-2">Consultando al Analista de IA</h3>
        <p class="text-sm text-amber-400 font-medium mb-4">${homeTeamName} vs ${awayTeamName}</p>
        
        <!-- Loading Step text -->
        <div class="bg-white/5 border border-white/10 rounded-xl p-4 w-full max-w-sm mx-auto">
          <p id="loading-step-text" class="text-sm text-gray-300 transition-all duration-300">Iniciando analista de IA...</p>
          <div class="w-full bg-white/10 h-1.5 rounded-full mt-3 overflow-hidden">
            <div id="loading-progress-bar" class="bg-amber-400 h-full rounded-full w-[10%] transition-all duration-500"></div>
          </div>
        </div>
      </div>
    `;

    const closeLoading = () => {
      if (this.loadingInterval) {
        clearInterval(this.loadingInterval);
        this.loadingInterval = null;
      }
      this.container.style.display = 'none';
      this.container.innerHTML = '';
    };

    modalContent.querySelector('#close-loading-btn').addEventListener('click', closeLoading);

    this.container.appendChild(modalContent);

    const steps = [
      { text: "🤖 Iniciando analista de IA...", progress: "15%" },
      { text: "🔍 Buscando historial de partidos y H2H en Google...", progress: "35%" },
      { text: "📊 Analizando el estado de forma reciente de los equipos...", progress: "55%" },
      { text: "⚽ Calculando probabilidades y estimando marcadores posibles...", progress: "75%" },
      { text: "✨ Generando reporte estructurado de predicción...", progress: "95%" }
    ];

    let currentStep = 0;
    this.loadingInterval = setInterval(() => {
      currentStep++;
      if (currentStep < steps.length) {
        const textEl = modalContent.querySelector('#loading-step-text');
        const progressEl = modalContent.querySelector('#loading-progress-bar');
        if (textEl && progressEl) {
          textEl.textContent = steps[currentStep].text;
          progressEl.style.width = steps[currentStep].progress;
        }
      } else {
        clearInterval(this.loadingInterval);
        this.loadingInterval = null;
      }
    }, 3500);
  }

  showError(message, homeTeamName, awayTeamName) {
    if (this.loadingInterval) {
      clearInterval(this.loadingInterval);
      this.loadingInterval = null;
    }

    this.container.innerHTML = '';
    this.container.className = 'fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50 p-4';
    this.container.style.display = 'flex';

    const modalContent = document.createElement('div');
    modalContent.className = 'glass-panel max-w-lg w-full border border-red-500/30 relative shadow-2xl animate-fade-in p-6 bg-slate-900 text-white rounded-2xl text-center';

    modalContent.innerHTML = `
      <button id="close-error-btn" class="absolute top-4 right-4 text-gray-400 hover:text-white font-bold text-xl">&times;</button>
      
      <div class="flex flex-col items-center justify-center py-6">
        <span class="text-4xl mb-4">⚠️</span>
        <h3 class="text-xl font-bold mb-2">No se puede predecir ahora</h3>
        <p class="text-sm text-red-400 font-medium mb-4">${homeTeamName} vs ${awayTeamName}</p>
        <p class="text-sm text-gray-300 leading-relaxed max-w-sm mb-6">${message}</p>
        
        <button id="close-error-footer-btn" class="px-6 py-2.5 rounded bg-white/10 hover:bg-white/20 transition text-white font-bold text-sm">Cerrar</button>
      </div>
    `;

    const closeError = () => {
      this.container.style.display = 'none';
      this.container.innerHTML = '';
    };

    modalContent.querySelector('#close-error-btn').addEventListener('click', closeError);
    modalContent.querySelector('#close-error-footer-btn').addEventListener('click', closeError);

    this.container.appendChild(modalContent);
  }
}
