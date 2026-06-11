import { GroupStandings } from './GroupStandings.js';
import { TimezoneUtil } from '../../infrastructure/utils/TimezoneUtil.js';

export class TodaysMatches {
  constructor(containerElement, matches, stadiums) {
    this.container = containerElement;
    this.matches = matches || [];
    this.stadiums = stadiums || [];
    
    // Extract all unique dates from matches and sort them
    this.availableDates = [...new Set(this.matches.map(m => m.date).filter(Boolean))].sort();
    
    // Default to the first date with matches, or fallback to 2026-06-11
    this.selectedDate = this.availableDates.includes('2026-06-11') 
      ? '2026-06-11' 
      : (this.availableDates[0] || '2026-06-11');
  }

  getStadiumInfo(stadiumId) {
    const stadium = this.stadiums.find(s => s.id === stadiumId);
    return stadium ? { name: stadium.name, city: stadium.city } : { name: 'Sede del Mundial', city: '' };
  }

  changeDate(offset) {
    const currentIndex = this.availableDates.indexOf(this.selectedDate);
    if (currentIndex === -1) return;
    
    const newIndex = currentIndex + offset;
    if (newIndex >= 0 && newIndex < this.availableDates.length) {
      this.selectedDate = this.availableDates[newIndex];
      this.render();
    }
  }

  render() {
    this.container.innerHTML = '';
    const isEn = ((typeof document !== 'undefined' && document.documentElement.lang) || 'es') === 'en';

    if (this.matches.length === 0) {
      this.container.innerHTML = `
        <div class="glass-panel text-center py-6 text-gray-400 text-sm">
          ${isEn ? 'No matches scheduled in the database.' : 'No hay partidos programados en la base de datos.'}
        </div>
      `;
      return;
    }

    // Filter matches for the selected date
    const dayMatches = this.matches.filter(m => m.date === this.selectedDate);
    const hasPrev = this.availableDates.indexOf(this.selectedDate) > 0;
    const hasNext = this.availableDates.indexOf(this.selectedDate) < this.availableDates.length - 1;

    // Outer panel
    const matchesPanel = document.createElement('div');
    matchesPanel.className = 'glass-panel bg-black/40 border border-white/10 rounded-2xl p-5 flex flex-col gap-4 w-full';

    // Header with Navigation Controls
    const headerRow = document.createElement('div');
    headerRow.className = 'flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/10 pb-4';
    
    // Parse the date manually to prevent timezone shifts (UTC vs Local Time bug)
    const parts = this.selectedDate.split('-');
    let visualDate = this.selectedDate;
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const dateObj = new Date(year, month, day);
      
      const dayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
      const monthNames = [
        'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
        'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
      ];
      
      const dayNamesEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const monthNamesEn = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];

      if (isEn) {
        visualDate = `${dayNamesEn[dateObj.getDay()]}, ${monthNamesEn[month]} ${day}, ${year}`;
      } else {
        visualDate = `${dayNames[dateObj.getDay()]}, ${day} de ${monthNames[month]} de ${year}`;
      }
    }

    headerRow.innerHTML = `
      <div>
        <h3 class="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-200 flex items-center gap-2">
          <span>⚽</span> ${isEn ? "Today's Schedule" : 'Cartelera del Día'}
        </h3>
        <p class="text-xs text-gray-400 capitalize mt-0.5">${visualDate}</p>
      </div>
      
      <div class="flex items-center gap-2">
        <button id="prev-date-btn" class="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 hover:border-amber-400 text-white transition disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer" ${!hasPrev ? 'disabled' : ''}>
          ◀
        </button>
        <span class="text-xs font-bold text-gray-300 px-3 bg-white/5 border border-white/5 py-2.5 rounded-xl font-mono">
          ${this.availableDates.indexOf(this.selectedDate) + 1} / ${this.availableDates.length}
        </span>
        <button id="next-date-btn" class="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 hover:border-amber-400 text-white transition disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer" ${!hasNext ? 'disabled' : ''}>
          ▶
        </button>
      </div>
    `;

    // Bind navigation actions
    headerRow.querySelector('#prev-date-btn').addEventListener('click', () => this.changeDate(-1));
    headerRow.querySelector('#next-date-btn').addEventListener('click', () => this.changeDate(1));
    
    matchesPanel.appendChild(headerRow);

    // List of Matches Grid
    const matchesGrid = document.createElement('div');
    matchesGrid.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full';

    if (dayMatches.length === 0) {
      matchesGrid.innerHTML = `
        <div class="col-span-full text-center py-6 text-gray-500 text-xs italic">
          ${isEn ? 'No matches scheduled for this day.' : 'No hay partidos programados para este día.'}
        </div>
      `;
    } else {
      dayMatches.forEach(match => {
        const matchId = match.match_id || match.matchId;
        
        let matchNumber = match.match_number || match.matchNumber;
        if (!matchNumber && matchId) {
          const matchParts = matchId.split('_');
          if (matchParts.length === 3) {
            const grp = matchParts[1].replace('g', isEn ? 'Group ' : 'Grupo ');
            const num = parseInt(matchParts[2].replace('m', ''), 10);
            matchNumber = `${grp} - Match ${num}`;
          } else {
            matchNumber = matchId.toUpperCase();
          }
        }

        const homeCode = (match.home_team && match.home_team.code) || match.homeTeam || '';
        const homeName = (match.home_team && match.home_team.name) || match.homeTeam || match.home_placeholder;
        const awayCode = (match.away_team && match.away_team.code) || match.awayTeam || '';
        const awayName = (match.away_team && match.away_team.name) || match.awayTeam || match.away_placeholder;

        const homeFlag = GroupStandings.getFlagEmoji(homeCode);
        const awayFlag = GroupStandings.getFlagEmoji(awayCode);
        const stadium = this.getStadiumInfo(match.stadium_id);

        const browserTime = TimezoneUtil.getBrowserLocalTime(match.date, match.time_local, match.stadium_id);
        const timeDisplay = match.time_local 
          ? `<span class="opacity-60">${isEn ? 'Venue' : 'Sede'}: ${match.time_local}</span> <span class="text-amber-400 font-extrabold ml-1 bg-amber-400/10 px-1.5 py-0.5 rounded text-[9px]">${isEn ? 'Your time' : 'Local'}: ${browserTime}</span>`
          : (isEn ? 'Time TBD' : 'Hora por definir');

        const matchCard = document.createElement('div');
        matchCard.className = 'glass-panel bg-white/[0.02] border border-white/5 rounded-xl p-4 flex flex-col justify-between gap-3 hover:border-amber-400/40 hover:shadow-[0_0_15px_rgba(251,191,36,0.05)] transition-all duration-300';

        matchCard.innerHTML = `
          <div>
            <div class="flex justify-between items-center text-[10px] text-gray-500 font-mono mb-2">
              <span class="bg-white/5 px-2 py-0.5 rounded text-amber-400 font-bold">${matchNumber}</span>
              <div class="flex items-center gap-1">${timeDisplay}</div>
            </div>
            
            <div class="flex flex-col gap-2 my-2.5">
              <!-- Home -->
              <div class="flex items-center gap-2">
                <span class="text-2xl">${homeFlag}</span>
                <span class="font-bold text-gray-200 text-sm truncate">${homeName}</span>
              </div>
              <div class="text-gray-600 text-[10px] font-bold tracking-wider pl-8">VS</div>
              <!-- Away -->
              <div class="flex items-center gap-2">
                <span class="text-2xl">${awayFlag}</span>
                <span class="font-bold text-gray-200 text-sm truncate">${awayName}</span>
              </div>
            </div>
          </div>

          <div class="border-t border-white/5 pt-2.5 flex flex-col gap-2">
            <div class="text-[10px] text-gray-400 truncate flex items-center gap-1">
              <span>📍</span>
              <span class="truncate">${stadium.name} (${stadium.city})</span>
            </div>
            <button data-match-id="${matchId || ''}" class="predict-today-btn w-full py-2 bg-amber-400 text-black font-extrabold rounded-lg hover:bg-amber-300 transition duration-200 text-xs uppercase tracking-wide flex items-center justify-center gap-1.5 cursor-pointer shadow">
              <span>🔮</span> ${isEn ? 'Predict' : 'Pronosticar'}
            </button>
          </div>
        `;

        // Bind predict handler
        matchCard.querySelector('.predict-today-btn').addEventListener('click', (e) => {
          const mId = e.currentTarget.getAttribute('data-match-id');
          
          // Switch to Predictions Tab
          const tabPredictions = document.getElementById('tab-predictions');
          if (tabPredictions) {
            tabPredictions.click();

            // Wait for tab rendering then scroll/highlight card
            setTimeout(() => {
              const predCard = document.getElementById(`prediction-card-${mId}`);
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

        matchesGrid.appendChild(matchCard);
      });
    }

    matchesPanel.appendChild(matchesGrid);
    this.container.appendChild(matchesPanel);
  }
}
