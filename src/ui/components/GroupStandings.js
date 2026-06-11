import { GroupStanding } from '../../domain/entities/Team.js';
import { TimezoneUtil } from '../../infrastructure/utils/TimezoneUtil.js';

export class GroupStandings {
  constructor(containerElement, groupsData, matchesData, stadiums) {
    this.container = containerElement;
    this.groupsData = groupsData;
    this.matchesData = matchesData;
    this.stadiums = stadiums || [];
    this.selectedGroup = 'A';
  }

  // Maps team ISO codes to their regional flag emojis
  static getFlagEmoji(code) {
    const flagMap = {
      'MEX': '🇲🇽', 'ZAF': '🇿🇦', 'KOR': '🇰🇷', 'CZE': '🇨🇿',
      'CAN': '🇨🇦', 'BIH': '🇧🇦', 'QAT': '🇶🇦', 'CHE': '🇨🇭',
      'BRA': '🇧🇷', 'MAR': '🇲🇦', 'HTI': '🇭🇹', 'SCO': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
      'USA': '🇺🇸', 'PRY': '🇵🇾', 'AUS': '🇦🇺', 'TUR': '🇹🇷',
      'DEU': '🇩🇪', 'CUW': '🇨🇼', 'CIV': '🇨🇮', 'ECU': '🇪🇨',
      'NLD': '🇳🇱', 'JPN': '🇯🇵', 'SWE': '🇸🇪', 'TUN': '🇹🇳',
      'ARG': '🇦🇷', 'KSA': '🇸🇦', 'SAU': '🇸🇦', 'SLV': '🇸🇻', 'SEN': '🇸🇳',
      'FRA': '🇫🇷', 'EGY': '🇪🇬', 'ROU': '🇷🇴', 'MLI': '🇲🇱',
      'ESP': '🇪🇸', 'IRN': '🇮🇷', 'CRC': '🇨🇷', 'CMR': '🇨🇲',
      'ITA': '🇮🇹', 'IRQ': '🇮🇶', 'JAM': '🇯🇲', 'COD': '🇨🇩',
      'ENG': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'UZB': '🇺🇿', 'PAN': '🇵🇦', 'NGA': '🇳🇬',
      'URU': '🇺🇾', 'URY': '🇺🇾', 'JOR': '🇯🇴', 'HND': '🇭🇳', 'DZA': '🇩🇿',
      'BEL': '🇧🇪', 'NZL': '🇳🇿', 'CPV': '🇨🇻', 'NOR': '🇳🇴',
      'AUT': '🇦🇹', 'PRT': '🇵🇹', 'COL': '🇨🇴', 'HRV': '🇭🇷', 'GHA': '🇬🇭'
    };
    return flagMap[code.toUpperCase()] || '🏳️';
  }

  getStadiumInfo(stadiumId) {
    const stadium = this.stadiums.find(s => s.id === stadiumId);
    return stadium ? { name: stadium.name, city: stadium.city, country: stadium.country } : { name: 'Estadio del Mundial', city: 'Sede oficial', country: '' };
  }

  render() {
    this.container.innerHTML = '';
    
    // 1. Render Group Tabs Selector A-L
    const selectorContainer = document.createElement('div');
    selectorContainer.className = 'group-selector flex flex-wrap gap-1.5 mb-6 justify-center bg-white/5 p-2 rounded-2xl border border-white/5';
    
    const alphabet = 'ABCDEFGHIJKL'.split('');
    const isEn = ((typeof document !== 'undefined' && document.documentElement.lang) || 'es') === 'en';
    alphabet.forEach(letter => {
      const button = document.createElement('button');
      button.className = `px-3.5 py-2 rounded-xl font-bold text-xs border transition duration-200 ${
        this.selectedGroup === letter
          ? 'bg-amber-400 text-black border-amber-400 shadow'
          : 'bg-transparent text-gray-400 border-transparent hover:text-white hover:bg-white/5'
      }`;
      button.innerText = (isEn ? `Group ` : `Grupo `) + letter;
      button.addEventListener('click', () => {
        this.selectedGroup = letter;
        this.render();
      });
      selectorContainer.appendChild(button);
    });
    this.container.appendChild(selectorContainer);

    // 2. Fetch selected group data
    const groupKey = `Group_${this.selectedGroup}`;
    const group = this.groupsData.groups[groupKey];
    if (!group) return;

    // Get matches for selected group
    const groupMatches = this.matchesData[this.selectedGroup] || [];
    const sortedStandings = GroupStanding.calculateStandings(group.teams, groupMatches);

    // 3. Render Standings Table Container
    const tableContainer = document.createElement('div');
    tableContainer.className = 'glass-panel bg-black/40 border border-white/10 rounded-2xl p-5 flex flex-col gap-4';
    
    // Header section with Ver Partidos Button
    const headerSection = document.createElement('div');
    headerSection.className = 'flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/10 pb-4';
    const groupTitleName = isEn ? group.name.replace('Grupo', 'Group') : group.name;
    const statsSubtitle = isEn ? 'Official Standings' : 'Estadísticas Oficiales';
    const viewMatchesBtnText = isEn ? 'View Group Matches' : 'Ver Partidos del Grupo';

    headerSection.innerHTML = `
      <div>
        <h3 class="text-xl font-extrabold tracking-wide text-amber-400">${groupTitleName}</h3>
        <p class="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mt-0.5">${statsSubtitle}</p>
      </div>
      <button id="view-group-matches-btn" class="flex items-center gap-2 px-4 py-2 bg-amber-400/10 hover:bg-amber-400 text-amber-400 hover:text-black border border-amber-400/30 hover:border-amber-400 rounded-xl text-xs font-bold transition duration-300 shadow">
        <span>📅</span> ${viewMatchesBtnText}
      </button>
    `;
    tableContainer.appendChild(headerSection);

    // Bind event for showing matches popup
    const btn = headerSection.querySelector('#view-group-matches-btn');
    if (btn) {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.showMatchesModal(group.name, groupMatches);
      });
    }

    const tableWrapper = document.createElement('div');
    tableWrapper.className = 'overflow-x-auto w-full';
    
    let tableHtml = `
      <table class="w-full text-left border-collapse min-w-[500px]">
        <thead>
          <tr class="border-b border-white/10 text-gray-400 text-xs font-semibold uppercase tracking-wider">
            <th class="py-3 pl-2">Pos</th>
            <th class="py-3">${isEn ? 'Team' : 'Equipo'}</th>
            <th class="py-3 text-center">PTS</th>
            <th class="py-3 text-center">${isEn ? 'GP' : 'PJ'}</th>
            <th class="py-3 text-center">${isEn ? 'W' : 'PG'}</th>
            <th class="py-3 text-center">${isEn ? 'D' : 'PE'}</th>
            <th class="py-3 text-center">${isEn ? 'L' : 'PP'}</th>
            <th class="py-3 text-center">GF</th>
            <th class="py-3 text-center">${isEn ? 'GA' : 'GC'}</th>
            <th class="py-3 text-center">${isEn ? 'GD' : 'DG'}</th>
          </tr>
        </thead>
        <tbody class="text-sm">
    `;

    sortedStandings.forEach((standing, index) => {
      const team = group.teams.find(t => t.code === standing.teamCode);
      const teamName = team ? team.name : standing.teamCode;
      const flag = GroupStandings.getFlagEmoji(standing.teamCode);
      
      // Highlight qualifying slots (Top 2)
      const isQualifying = index < 2;
      const rowClass = isQualifying 
        ? 'border-b border-white/5 bg-green-500/5 hover:bg-green-500/10 transition' 
        : 'border-b border-white/5 hover:bg-white/5 transition';

      tableHtml += `
        <tr class="${rowClass}">
          <td class="py-3.5 pl-3 font-bold ${isQualifying ? 'text-green-400' : 'text-gray-400'}">${index + 1}</td>
          <td class="py-3.5 flex items-center gap-2.5">
            <span class="text-2xl">${flag}</span>
            <div class="flex flex-col">
              <span class="font-bold text-white leading-tight">${teamName}</span>
              <span class="text-[10px] text-gray-500 font-semibold tracking-wider uppercase">${standing.teamCode}</span>
            </div>
          </td>
          <td class="py-3.5 text-center font-extrabold text-amber-400">${standing.points}</td>
          <td class="py-3.5 text-center font-medium">${standing.played}</td>
          <td class="py-3.5 text-center text-green-400 font-semibold">${standing.wins}</td>
          <td class="py-3.5 text-center text-gray-400">${standing.draws}</td>
          <td class="py-3.5 text-center text-red-400">${standing.losses}</td>
          <td class="py-3.5 text-center">${standing.goalsFor}</td>
          <td class="py-3.5 text-center">${standing.goalsAgainst}</td>
          <td class="py-3.5 text-center font-bold ${standing.goalDifference >= 0 ? 'text-green-400' : 'text-red-400'}">
            ${standing.goalDifference > 0 ? '+' : ''}${standing.goalDifference}
          </td>
        </tr>
      `;
    });

    tableHtml += `
        </tbody>
      </table>
      <div class="mt-3 flex items-center gap-2 text-[10px] text-gray-400 font-medium">
        <span class="w-2 h-2 rounded bg-green-500/30 border border-green-500/50"></span>
        <span>${isEn ? 'Direct qualification zone to Round of 32' : 'Zona de clasificación directa a Dieciseisavos (Round of 32)'}</span>
      </div>
    `;
    
    tableWrapper.innerHTML = tableHtml;
    tableContainer.appendChild(tableWrapper);
    this.container.appendChild(tableContainer);
  }

  showMatchesModal(groupName, matches) {
    try {
      // 1. Create Modal Container
      const modalOverlay = document.createElement('div');
      modalOverlay.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4';
      
      const modalContent = document.createElement('div');
      modalContent.className = 'glass-panel bg-[#12151e]/95 border border-white/10 rounded-2xl w-full max-w-4xl flex flex-col p-4 sm:p-6 shadow-2xl relative';
      modalContent.style.maxHeight = '90dvh';
      modalContent.style.overflowY = 'auto';
      modalContent.style.overflowX = 'hidden';
      
      // Header
      const modalHeader = document.createElement('div');
      modalHeader.className = 'flex justify-between items-center border-b border-white/10 pb-4 mb-4';
      const isEn = ((typeof document !== 'undefined' && document.documentElement.lang) || 'es') === 'en';
      const formattedGroupName = isEn ? groupName.replace('Grupo', 'Group') : groupName;
      const subtitleText = isEn ? 'Match Schedule & Venues' : 'Calendario de Partidos y Sedes';
      modalHeader.innerHTML = `
        <div>
          <h3 class="text-xl font-extrabold text-amber-400">${formattedGroupName}</h3>
          <p class="text-xs text-gray-400 uppercase tracking-widest mt-0.5">${subtitleText}</p>
        </div>
        <button id="close-matches-modal-btn" class="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 border border-white/10 hover:border-amber-400 text-gray-400 hover:text-white transition cursor-pointer">
          ✕
        </button>
      `;
      modalContent.appendChild(modalHeader);

      // List of Matches
      const matchesListContainer = document.createElement('div');
      matchesListContainer.className = 'flex flex-col gap-4 overflow-y-auto pr-1';
      
      matches.forEach(match => {
        if (!match) return;

        // Robust data extraction supporting varying models
        const homeCode = (match.home_team && match.home_team.code) || match.home_team || '';
        const homeName = (match.home_team && match.home_team.name) || match.home_team || (isEn ? 'Home Team' : 'Equipo local');
        const awayCode = (match.away_team && match.away_team.code) || match.away_team || '';
        const awayName = (match.away_team && match.away_team.name) || match.away_team || (isEn ? 'Away Team' : 'Equipo visitante');

        const homeFlag = GroupStandings.getFlagEmoji(homeCode);
        const awayFlag = GroupStandings.getFlagEmoji(awayCode);
        const stadium = this.getStadiumInfo(match.stadium_id);
        const browserTime = TimezoneUtil.getBrowserLocalTime(match.date, match.time_local, match.stadium_id);

        const matchCard = document.createElement('div');
        matchCard.className = 'glass-panel bg-white/[0.02] border border-white/5 rounded-xl p-4 flex flex-col md:flex-row justify-between items-center gap-4 hover:border-white/15 transition-all';
        
        matchCard.innerHTML = `
          <div class="flex-1 flex flex-col md:flex-row md:items-center gap-4 w-full">
            <!-- Team vs Team -->
            <div class="flex-1 flex items-center justify-between md:justify-start gap-4">
              <div class="flex items-center gap-2.5 w-[42%] md:justify-end">
                <span class="font-bold text-gray-200 order-1 md:order-2 truncate">${homeName}</span>
                <span class="text-2xl order-2 md:order-1">${homeFlag}</span>
              </div>
              <span class="text-gray-500 font-bold text-xs uppercase bg-white/5 px-2 py-0.5 rounded">VS</span>
              <div class="flex items-center gap-2.5 w-[42%]">
                <span class="text-2xl">${awayFlag}</span>
                <span class="font-bold text-gray-200 truncate">${awayName}</span>
              </div>
            </div>

            <!-- Stadium / Date Info -->
            <div class="border-t md:border-t-0 border-white/5 pt-2.5 md:pt-0 flex flex-col gap-0.5 min-w-[200px] text-xs">
              <div class="flex items-center gap-1.5 text-gray-300">
                <span class="text-amber-400">📅</span>
                <span>${match.date || ''} - ${match.time_local || ''} (${isEn ? 'Venue Time' : 'Sede'})</span>
              </div>
              <div class="flex items-center gap-1.5 text-amber-400 font-extrabold">
                <span>⏰</span>
                <span>${isEn ? 'Your time' : 'Tu hora'}: ${browserTime}</span>
              </div>
              <div class="flex items-center gap-1.5 text-gray-400">
                <span>📍</span>
                <span class="truncate">${stadium.name} (${stadium.city})</span>
              </div>
            </div>
          </div>

          <!-- Predict Action -->
          <button data-match-id="${match.match_id || ''}" data-home="${homeName}" data-away="${awayName}" class="predict-from-modal-btn w-full md:w-auto px-4 py-2 bg-amber-400 text-black font-extrabold rounded-xl hover:bg-amber-300 transition duration-200 shadow text-xs uppercase tracking-wide flex items-center justify-center gap-1.5 cursor-pointer">
            <span>🔮</span> ${isEn ? 'Predict' : 'Pronosticar'}
          </button>
        `;

        // Bind listener to Prediction redirection
        matchCard.querySelector('.predict-from-modal-btn').addEventListener('click', (e) => {
          const btn = e.currentTarget;
          const matchId = btn.getAttribute('data-match-id');
          
          // Remove modal
          document.body.removeChild(modalOverlay);

          // Switch to Predictions Tab
          const tabPredictions = document.getElementById('tab-predictions');
          if (tabPredictions) {
            tabPredictions.click();

            // Wait for rendering transition then highlight card
            setTimeout(() => {
              const predCard = document.getElementById(`prediction-card-${matchId}`);
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

        matchesListContainer.appendChild(matchCard);
      });
      
      modalContent.appendChild(matchesListContainer);
      modalOverlay.appendChild(modalContent);
      document.body.appendChild(modalOverlay);

      // Close Modal Events
      const closeModal = () => {
        document.body.removeChild(modalOverlay);
      };

      modalHeader.querySelector('#close-matches-modal-btn').addEventListener('click', closeModal);
      modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeModal();
      });
    } catch (err) {
      console.error("Error in showMatchesModal:", err);
      alert("No se pudo cargar la ventana de partidos: " + err.message);
    }
  }
}
