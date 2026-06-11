import { GroupStandings } from './GroupStandings.js';

export class PredictionForm {
  constructor(containerElement, matches, onConsultAnalyst, onSavePrediction) {
    this.container = containerElement;
    this.matches = matches || [];
    this.onConsultAnalyst = onConsultAnalyst;
    this.onSavePrediction = onSavePrediction;
  }

  render() {
    this.container.innerHTML = '';
    
    const isEn = ((typeof document !== 'undefined' && document.documentElement.lang) || 'es') === 'en';
    const titleText = isEn ? '🔮 Match Forecasts & Predictions' : '🔮 Pronósticos y Predicciones de Partidos';
    const btnText = isEn ? 'Consult AI' : 'Consultar IA';
    const groupLabel = isEn ? 'Group ' : 'Grupo ';

    const title = document.createElement('h3');
    title.className = 'text-xl font-bold mb-4 flex items-center gap-2 text-amber-400';
    title.innerHTML = `<span>🔮</span> ${titleText}`;
    this.container.appendChild(title);

    const formGrid = document.createElement('div');
    formGrid.className = 'grid grid-cols-1 md:grid-cols-2 gap-4';

    this.matches.forEach(match => {
      const matchId = match.matchId || match.match_id;
      
      let matchNumber = match.matchNumber || match.match_number;
      if (!matchNumber && matchId) {
        const matchParts = matchId.split('_');
        if (matchParts.length === 3) {
          const grp = matchParts[1].replace('g', groupLabel);
          const num = parseInt(matchParts[2].replace('m', ''), 10);
          matchNumber = `${grp} - Match ${num}`;
        } else {
          matchNumber = matchId.toUpperCase();
        }
      }
      const homeName = (match.home_team && match.home_team.name) || match.homeTeam || match.home_placeholder;
      const awayName = (match.away_team && match.away_team.name) || match.awayTeam || match.away_placeholder;
      
      const homeCode = (match.home_team && match.home_team.code) || '';
      const awayCode = (match.away_team && match.away_team.code) || '';
      
      const homeFlag = homeCode ? GroupStandings.getFlagEmoji(homeCode) : '';
      const awayFlag = awayCode ? GroupStandings.getFlagEmoji(awayCode) : '';

      const card = document.createElement('div');
      card.className = 'glass-panel bg-black/40 border border-white/5 rounded-2xl p-4 flex flex-col justify-between gap-4 transition-all duration-300 hover:border-white/10';
      card.id = `prediction-card-${matchId}`;

      card.innerHTML = `
        <div>
          <div class="text-[10px] text-gray-500 font-mono flex justify-between">
            <span>Partido #${matchNumber}</span>
            <span>${match.date || ''}</span>
          </div>
          <div class="flex flex-col gap-2.5 mt-2.5">
            <!-- Home Team -->
            <div class="flex justify-between items-center">
              <div class="flex items-center gap-2 font-bold text-gray-200">
                <span class="text-2xl">${homeFlag}</span>
                <span>${homeName}</span>
              </div>
            </div>
            
            <div class="text-center text-xs text-gray-500 font-bold tracking-wider">- VS -</div>
 
            <!-- Away Team -->
            <div class="flex justify-between items-center">
              <div class="flex items-center gap-2 font-bold text-gray-200">
                <span class="text-2xl">${awayFlag}</span>
                <span>${awayName}</span>
              </div>
            </div>
          </div>
        </div>
 
        <div class="flex gap-2.5 pt-2 border-t border-white/5">
          <button id="btn-analyst-${matchId}" class="w-full py-2 px-3 rounded-xl bg-amber-400 text-black font-extrabold hover:bg-amber-300 transition duration-200 text-xs flex items-center justify-center gap-1.5 shadow">
            <span>🤖</span> ${btnText}
          </button>
        </div>
      `;

      const btnAnalyst = card.querySelector(`#btn-analyst-${matchId}`);
      btnAnalyst.addEventListener('click', () => {
        this.onConsultAnalyst(matchId, homeName, awayName);
      });

      formGrid.appendChild(card);
    });

    this.container.appendChild(formGrid);
  }

  autofill(matchId, homeScore, awayScore) {
    // Stubbed since manual score entry was removed
  }
}
