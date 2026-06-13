import { DataLoader } from '../../infrastructure/db/DataLoader.js';
import { GroupStandings } from './GroupStandings.js';
import { TimezoneUtil } from '../../infrastructure/utils/TimezoneUtil.js';

export class KnockoutBracket {
  constructor(containerElement) {
    this.container = containerElement;
    this.stadiums = [];
  }

  static getFlagByTeamNameOrCode(teamStr) {
    if (!teamStr) return '🏳️';
    const cleanStr = teamStr.trim().toUpperCase();
    if (cleanStr.length === 3) {
      return GroupStandings.getFlagEmoji(cleanStr);
    }
    const countries = {
      'MEXICO': '🇲🇽', 'MÉXICO': '🇲🇽', 'SUDAFRICA': '🇿🇦', 'SUDÁFRICA': '🇿🇦', 'COREA': '🇰🇷', 'REP. CHECA': '🇨🇿', 'REPÚBLICA CHECA': '🇨🇿',
      'CANADA': '🇨🇦', 'CANADÁ': '🇨🇦', 'BOSNIA': '🇧🇦', 'QATAR': '🇶🇦', 'SUIZA': '🇨🇭', 'BRASIL': '🇧🇷', 'MARRUECOS': '🇲🇦',
      'HAITI': '🇭🇹', 'HAITÍ': '🇭🇹', 'ESCOCIA': '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'USA': '🇺🇸', 'ESTADOS UNIDOS': '🇺🇸', 'PARAGUAY': '🇵🇾', 'AUSTRALIA': '🇦🇺',
      'TURQUIA': '🇹🇷', 'TURQUÍA': '🇹🇷', 'ALEMANIA': '🇩🇪', 'CURAZAO': '🇨🇼', 'COSTA DE MARFIL': '🇨🇮', 'CIV': '🇨🇮', 'ECUADOR': '🇪🇨',
      'PAISES BAJOS': '🇳🇱', 'PAÍSES BAJOS': '🇳🇱', 'JAPON': '🇯🇵', 'JAPÓN': '🇯🇵', 'SUECIA': '🇸🇪', 'TUNEZ': '🇹🇳', 'TÚNEZ': '🇹🇳',
      'ARGENTINA': '🇦🇷', 'ARABIA': '🇸🇦', 'EL SALVADOR': '🇸🇻', 'SENEGAL': '🇸🇳', 'FRANCIA': '🇫🇷', 'EGIPTO': '🇪🇬', 'RUMANIA': '🇷🇴',
      'MALI': '🇲🇱', 'MALÍ': '🇲🇱', 'ESPAÑA': '🇪🇸', 'ESPANA': '🇪🇸', 'IRAN': '🇮🇷', 'IRÁN': '🇮🇷', 'COSTA RICA': '🇨🇷', 'CAMERUN': '🇨🇲',
      'CAMERÚN': '🇨🇲', 'ITALIA': '🇮🇹', 'IRAQ': '🇮🇶', 'JAMAICA': '🇯🇲', 'CONGO': '🇨🇩', 'INGLATERRA': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'UZBEKISTAN': '🇺🇿',
      'UZBEKISTÁN': '🇺🇿', 'PANAMA': '🇵🇦', 'PANAMÁ': '🇵🇦', 'NIGERIA': '🇳🇬', 'URUGUAY': '🇺🇾', 'JORDANIA': '🇯🇴', 'HONDURAS': '🇭🇳',
      'ARGELIA': '🇩🇿'
    };
    for (const key of Object.keys(countries)) {
      if (cleanStr.includes(key)) {
        return countries[key];
      }
    }
    return '🏳️';
  }

  getStadiumInfo(stadiumId) {
    const stadium = this.stadiums.find(s => s.id === stadiumId);
    return stadium ? { name: stadium.name, city: stadium.city, country: stadium.country } : { name: 'Estadio del Mundial', city: 'Sede oficial', country: '' };
  }

  async render() {
    const isEn = ((typeof document !== 'undefined' && document.documentElement.lang) || 'es') === 'en';
    this.container.innerHTML = `
      <div class="flex items-center justify-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400"></div>
        <span class="ml-3 text-gray-400 text-sm">${isEn ? 'Loading knockout stages...' : 'Cargando fase de eliminación...'}</span>
      </div>
    `;

    const stages = [
      { id: 'round-of-32', name: isEn ? 'Round of 32' : '16avos' },
      { id: 'round-of-16', name: isEn ? 'Round of 16' : '8avos' },
      { id: 'quarterfinals', name: isEn ? 'Quarterfinals' : 'Cuartos' },
      { id: 'semifinals', name: isEn ? 'Semifinals' : 'Semifinales' },
      { id: 'final', name: isEn ? 'Final' : 'Final' }
    ];

    try {
      if (this.stadiums.length === 0) {
        this.stadiums = await DataLoader.loadStadiums().then(res => res.stadiums || []);
      }

      // Load all stages in parallel
      const loadedStages = await Promise.all(
        stages.map(async (stage) => {
          try {
            const data = await DataLoader.loadKnockoutStage(stage.id);
            let matches = [];
            
            if (data.matches) {
              matches = data.matches;
            } else if (data.match_details) {
              matches = [data.match_details];
            } else if (data.tournament_conclusion) {
              const conclusion = data.tournament_conclusion;
              if (stage.id === 'quarterfinals' && conclusion.quarter_finals) {
                matches = conclusion.quarter_finals.matches || [];
              } else if (stage.id === 'semifinals' && conclusion.semi_finals) {
                matches = conclusion.semi_finals.matches || [];
              } else if (stage.id === 'final' && conclusion.final) {
                matches = conclusion.final.matches || [];
              }
            }
            return { id: stage.id, name: stage.name, matches };
          } catch (e) {
            console.error(`Error loading knockout stage ${stage.id}:`, e);
            return { id: stage.id, name: stage.name, matches: [] };
          }
        })
      );

      this.container.innerHTML = '';

      // Main container with clean scrollbar and responsiveness
      const bracketWrapper = document.createElement('div');
      bracketWrapper.className = 'bracket-wrapper flex flex-col lg:flex-row gap-6 overflow-x-auto py-4 px-2 select-none w-full scrollbar-thin scrollbar-thumb-white/10';

      loadedStages.forEach(stage => {
        const stageColumn = document.createElement('div');
        stageColumn.className = 'flex flex-col gap-4 min-w-[250px] lg:flex-1 bg-white/[0.01] border border-white/5 rounded-2xl p-4';

        const columnHeader = document.createElement('div');
        columnHeader.className = 'flex justify-between items-center mb-3 border-b border-white/10 pb-2';
        columnHeader.innerHTML = `
          <h4 class="font-bold text-gray-300 text-xs uppercase tracking-wider">${stage.name}</h4>
          <span class="bg-amber-400/10 text-amber-400 border border-amber-400/20 px-2 py-0.5 rounded text-[10px] font-bold">${stage.matches.length}</span>
        `;
        stageColumn.appendChild(columnHeader);

        const cardsContainer = document.createElement('div');
        
        // Custom spacing layout according to tournament flow hierarchy
        let spacingClass = 'flex flex-col gap-3 justify-center h-full';
        if (stage.id === 'round-of-32') spacingClass += ' lg:gap-4';
        else if (stage.id === 'round-of-16') spacingClass += ' lg:gap-14';
        else if (stage.id === 'quarterfinals') spacingClass += ' lg:gap-32';
        else if (stage.id === 'semifinals') spacingClass += ' lg:gap-64';
        else if (stage.id === 'final') spacingClass += ' lg:justify-center';
        
        cardsContainer.className = spacingClass;

        stage.matches.forEach(match => {
          const matchCard = document.createElement('div');
          matchCard.className = 'glass-panel bg-black/40 border border-white/5 hover:border-amber-400/50 rounded-xl p-3 hover:shadow-[0_0_15px_rgba(251,191,36,0.1)] transition-all duration-300 cursor-pointer text-sm flex flex-col gap-2 relative';
          
          const homeTeam = match.home_team || match.home_placeholder;
          const awayTeam = match.away_team || match.away_placeholder;
          
          const homeScore = match.score.home;
          const awayScore = match.score.away;
          
          const homeScoreText = homeScore !== null ? homeScore : '-';
          const awayScoreText = awayScore !== null ? awayScore : '-';
          
          let isHomeWinner = false;
          let isAwayWinner = false;
          if (homeScore !== null && awayScore !== null) {
            if (homeScore > awayScore) isHomeWinner = true;
            else if (awayScore > homeScore) isAwayWinner = true;
          }

          const homeFlag = KnockoutBracket.getFlagByTeamNameOrCode(homeTeam);
          const awayFlag = KnockoutBracket.getFlagByTeamNameOrCode(awayTeam);

          matchCard.innerHTML = `
            <div class="text-[9px] text-gray-500 font-mono flex justify-between">
              <span class="font-semibold text-amber-400/80">${isEn ? 'Match' : 'Partido'} #${match.match_number}</span>
              <span>${match.date}</span>
            </div>
            <div class="flex flex-col gap-1.5 mt-1">
              <!-- Home Team Row -->
              <div class="flex justify-between items-center">
                <div class="flex items-center gap-1.5 min-w-0">
                  <span class="text-lg flex-shrink-0">${homeFlag}</span>
                  <span class="truncate font-semibold ${isHomeWinner ? 'text-amber-400 font-bold' : isAwayWinner ? 'text-gray-500 line-through' : 'text-gray-200'}">${homeTeam}</span>
                </div>
                <span class="font-mono font-extrabold text-xs px-2 py-0.5 rounded ${isHomeWinner ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20' : 'bg-white/5 text-gray-400'}">${homeScoreText}</span>
              </div>
              
              <!-- Away Team Row -->
              <div class="flex justify-between items-center">
                <div class="flex items-center gap-1.5 min-w-0">
                  <span class="text-lg flex-shrink-0">${awayFlag}</span>
                  <span class="truncate font-semibold ${isAwayWinner ? 'text-amber-400 font-bold' : isHomeWinner ? 'text-gray-500 line-through' : 'text-gray-200'}">${awayTeam}</span>
                </div>
                <span class="font-mono font-extrabold text-xs px-2 py-0.5 rounded ${isAwayWinner ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20' : 'bg-white/5 text-gray-400'}">${awayScoreText}</span>
              </div>
            </div>
            <div class="text-[9px] text-gray-500 mt-1 border-t border-white/5 pt-1 truncate text-center italic">${match.description || ''}</div>
          `;

          // Add click event to open details popup
          matchCard.addEventListener('click', () => {
            this.showMatchDetailModal(match);
          });

          cardsContainer.appendChild(matchCard);
        });

        stageColumn.appendChild(cardsContainer);
        bracketWrapper.appendChild(stageColumn);
      });

      this.container.appendChild(bracketWrapper);

    } catch (err) {
      console.error("Failed to render knockout bracket:", err);
      this.container.innerHTML = `
        <div class="text-red-400 text-xs py-4 text-center glass-panel border border-red-500/20 bg-red-500/5">
          ${isEn ? '⚠️ Error loading knockout bracket. Please reload the page.' : '⚠️ Error al cargar la fase de eliminación. Por favor, recarga la página.'}
        </div>
      `;
    }
  }

  showMatchDetailModal(match) {
    const isEn = ((typeof document !== 'undefined' && document.documentElement.lang) || 'es') === 'en';
    const homeTeam = match.home_team || match.home_placeholder;
    const awayTeam = match.away_team || match.away_placeholder;
    
    const homeFlag = KnockoutBracket.getFlagByTeamNameOrCode(homeTeam);
    const awayFlag = KnockoutBracket.getFlagByTeamNameOrCode(awayTeam);
    
    const stadium = this.getStadiumInfo(match.stadium_id);
    const browserTime = TimezoneUtil.getBrowserLocalTime(match.date, match.time_local, match.stadium_id);

    const homeScore = match.score ? match.score.home : null;
    const awayScore = match.score ? match.score.away : null;
    const isCompleted = homeScore !== null && awayScore !== null && (typeof homeScore === 'number' && typeof awayScore === 'number');
    const isLive = TimezoneUtil.isMatchLive(match.date, match.time_local, match.stadium_id);
    const isPast = TimezoneUtil.isMatchPast(match.date, match.time_local, match.stadium_id) && !isLive;
    const shouldHidePredict = isCompleted || isLive || isPast;

    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4';

    const modalContent = document.createElement('div');
    modalContent.className = 'glass-panel bg-[#12151e]/90 border border-white/10 rounded-2xl w-full max-w-lg flex flex-col gap-5 p-4 sm:p-6 shadow-2xl relative';
    modalContent.style.maxHeight = '90dvh';
    modalContent.style.overflowY = 'auto';
    modalContent.style.overflowX = 'hidden';

    modalContent.innerHTML = `
      <div class="flex justify-between items-center border-b border-white/10 pb-3">
        <div>
          <h4 class="font-extrabold text-amber-400 text-md">${isEn ? 'Knockout Match Details' : 'Detalles del Partido Eliminatorio'}</h4>
          <p class="text-[9px] text-gray-400 uppercase tracking-widest font-bold mt-0.5">${isEn ? 'Match' : 'Partido'} #${match.match_number}</p>
        </div>
        <button id="close-detail-modal-btn" class="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 border border-white/10 hover:border-amber-400 text-gray-400 hover:text-white transition cursor-pointer">
          ✕
        </button>
      </div>

      <!-- Match Visuals -->
      <div class="flex justify-around items-center bg-white/[0.02] border border-white/5 rounded-xl p-4 my-2 text-sm">
        <div class="flex flex-col items-center gap-1.5 w-[38%] text-center">
          <span class="text-4xl">${homeFlag}</span>
          <span class="font-bold text-gray-200 text-sm truncate w-full">${homeTeam}</span>
        </div>
        <div class="flex flex-col items-center justify-center">
          ${isCompleted 
            ? `<span class="text-amber-400 font-extrabold text-xl bg-amber-400/10 px-3 py-1 rounded shadow-sm whitespace-nowrap">${homeScore} - ${awayScore}</span>`
            : `<span class="text-gray-500 font-extrabold text-lg whitespace-nowrap">VS</span>`
          }
        </div>
        <div class="flex flex-col items-center gap-1.5 w-[38%] text-center">
          <span class="text-4xl">${awayFlag}</span>
          <span class="font-bold text-gray-200 text-sm truncate w-full">${awayTeam}</span>
        </div>
      </div>

      <!-- Match Info List -->
      <div class="flex flex-col gap-2 text-xs">
        <div class="flex justify-between border-b border-white/5 py-1.5">
          <span class="text-gray-400">${isEn ? 'Match Date' : 'Fecha del Partido'}</span>
          <span class="text-gray-200 font-semibold">${match.date}</span>
        </div>
        <div class="flex justify-between border-b border-white/5 py-1.5">
          <span class="text-gray-400">${isEn ? 'Venue Time' : 'Hora de Sede'}</span>
          <span class="text-gray-200 font-semibold">${match.time_local} (${isEn ? 'Local' : 'Local'})</span>
        </div>
        <div class="flex justify-between border-b border-white/5 py-1.5 text-amber-400 font-extrabold">
          <span>${isEn ? 'Your local time' : 'Tu hora local'}</span>
          <span>${browserTime}</span>
        </div>
        <div class="flex justify-between border-b border-white/5 py-1.5">
          <span class="text-gray-400">${isEn ? 'Venue Stadium' : 'Estadio Sede'}</span>
          <span class="text-gray-200 font-semibold text-right">${stadium.name}</span>
        </div>
        <div class="flex justify-between border-b border-white/5 py-1.5">
          <span class="text-gray-400">${isEn ? 'City / Country' : 'Ciudad / País'}</span>
          <span class="text-gray-200 font-semibold">${stadium.city}${stadium.country ? `, ${stadium.country}` : ''}</span>
        </div>
        <div class="flex justify-between py-1.5">
          <span class="text-gray-400">${isEn ? 'Bracket Stage' : 'Estructura de Llaves'}</span>
          <span class="text-gray-200 font-semibold italic text-right">${match.description || (isEn ? 'Knockout Round' : 'Fase definitoria')}</span>
        </div>
      </div>

      <div class="flex gap-3 pt-3 border-t border-white/10 w-full">
        ${isCompleted
          ? `<div class="w-full py-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-extrabold rounded-xl text-xs uppercase tracking-wider text-center select-none shadow">
               ✅ ${isEn ? 'Completed' : 'Finalizado'}
             </div>`
          : isLive
          ? `<div class="w-full py-3 bg-red-500/10 text-red-400 border border-red-500/20 font-extrabold rounded-xl text-xs uppercase tracking-wider text-center select-none shadow animate-pulse">
               🔴 ${isEn ? 'Live / In Play' : 'En Juego'}
             </div>`
          : isPast
          ? `<div class="w-full py-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-extrabold rounded-xl text-xs uppercase tracking-wider text-center select-none shadow">
               ✅ ${isEn ? 'Completed' : 'Finalizado'}
             </div>`
          : `<button id="modal-predict-btn" class="flex-1 py-3 bg-amber-400 hover:bg-amber-300 text-black font-extrabold rounded-xl transition duration-200 text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer">
               <span>🔮</span> ${isEn ? 'Predict' : 'Pronosticar'}
             </button>`
        }
      </div>
    `;

    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);

    const closeModal = () => {
      document.body.removeChild(modalOverlay);
    };

    modalContent.querySelector('#close-detail-modal-btn').addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeModal();
    });

    const modalPredictBtn = modalContent.querySelector('#modal-predict-btn');
    if (modalPredictBtn) {
      modalPredictBtn.addEventListener('click', () => {
        closeModal();
        
        const tabPredictions = document.getElementById('tab-predictions');
        if (tabPredictions) {
          tabPredictions.click();
          
          // Wait for tab switch rendering
          setTimeout(() => {
            const predCard = document.getElementById(`prediction-card-${match.match_id}`);
            if (predCard) {
              predCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
              predCard.classList.add('ring-2', 'ring-amber-400', 'shadow-[0_0_20px_rgba(251,191,36,0.3)]');
              setTimeout(() => {
                predCard.classList.remove('ring-2', 'ring-amber-400', 'shadow-[0_0_20px_rgba(251,191,36,0.3)]');
              }, 3000);
            }
          }, 150);
        }
      });
    }
  }
}
