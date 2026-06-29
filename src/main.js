import './ui/index.css';
import { SceneManager } from './ui/animations/SceneManager.js';
import { DataLoader } from './infrastructure/db/DataLoader.js';
import { GroupStanding } from './domain/entities/Team.js';
import { GroupStandings } from './ui/components/GroupStandings.js';
import { TodaysMatches } from './ui/components/TodaysMatches.js';
import { KnockoutBracket } from './ui/components/KnockoutBracket.js';
import { PredictionForm } from './ui/components/PredictionForm.js';
import { AnalystModal } from './ui/components/AnalystModal.js';
import { FirebaseClient } from './infrastructure/firebase/FirebaseClient.js';
import { StickerView } from './ui/views/StickerView.js';
import { WorldCupChat } from './ui/components/WorldCupChat.js';
import { TRANSLATIONS } from './infrastructure/lang/TranslationDict.js';
import { NotificationUtil } from './infrastructure/utils/NotificationUtil.js';
import { CalendarUtil } from './infrastructure/utils/CalendarUtil.js';

// Global state container
const state = {
  teams: [],
  stadiums: [],
  matches: [],
  sceneManager: null,
  analystModal: null,
  predictionForm: null,
  todaysMatchesTable: null,
  standingsTable: null,
  bracketView: null,
  stickerView: null,
  chatComponent: null,
};

// 1. Boot the Awesome 3D Soccer Ball Hero Entry effect!
function initHeroEffect() {
  const canvasElement = document.getElementById('hero-canvas');
  const heroContainer = document.getElementById('hero-webgl-container');
  const appContainer = document.getElementById('app-container');
  const skipBtn = document.getElementById('skip-intro-btn');
  
  const heroSceneManager = new SceneManager();
  heroSceneManager.init(canvasElement);
  
  const finishIntro = () => {
    console.log("Fading in main UI...");
    appContainer.classList.remove('opacity-0');
    appContainer.classList.add('opacity-100');
    heroSceneManager.stop();
    heroContainer.style.display = 'none';
    heroContainer.innerHTML = '';
  };

  // Start the 3D Soccer Ball entry animation and specify the burst completion callback
  heroSceneManager.startSoccerHero(finishIntro);

  if (skipBtn) {
    skipBtn.addEventListener('click', () => {
      console.log("Intro skipped by user.");
      if (heroSceneManager.soccerBallHero) {
        heroSceneManager.soccerBallHero.cleanup();
      }
      finishIntro();
    });
  }
}

// 2. Load schedule and database resources
async function loadData() {
  try {
    const stadiumsData = await DataLoader.loadStadiums();
    state.stadiums = stadiumsData.stadiums || [];
    const groupsData = await DataLoader.loadGroups();
    
    // Extract list of all teams from groups
    const teamsList = [];
    Object.keys(groupsData.groups).forEach(key => {
      groupsData.groups[key].teams.forEach(team => {
        teamsList.push(team);
      });
    });
    state.teams = teamsList;

    // Load matches from all groups A-L in parallel
    const alphabet = 'ABCDEFGHIJKL'.split('');
    const matchesPromises = alphabet.map(letter => DataLoader.loadGroupMatches(letter));
    const allGroupsMatches = await Promise.all(matchesPromises);
    
    const matchesMap = {};
    let flatMatches = [];
    alphabet.forEach((letter, idx) => {
      matchesMap[letter] = allGroupsMatches[idx].matches;
      flatMatches = flatMatches.concat(allGroupsMatches[idx].matches);
    });

    // Load knockout stage (16avos/Round of 32) matches and add them to the flat list
    // so they appear in TodaysMatches and PredictionForm
    try {
      const knockoutStages = ['round-of-32', 'round-of-16', 'quarterfinals', 'semifinals', 'final'];
      const stageLabels = {
        'round-of-32': '16avos de Final',
        'round-of-16': 'Octavos de Final',
        'quarterfinals': 'Cuartos de Final',
        'semifinals': 'Semifinal',
        'final': 'Final'
      };
      const loadedKnockouts = await Promise.all(
        knockoutStages.map(stageId => DataLoader.loadKnockoutStage(stageId))
      );
      loadedKnockouts.forEach((stageData, idx) => {
        const stageId = knockoutStages[idx];
        let knockoutMatches = [];
        if (stageData.matches) {
          knockoutMatches = stageData.matches;
        } else if (stageData.match_details) {
          knockoutMatches = [stageData.match_details];
        } else if (stageData.tournament_conclusion) {
          const conclusion = stageData.tournament_conclusion;
          if (stageId === 'quarterfinals' && conclusion.quarter_finals) {
            knockoutMatches = conclusion.quarter_finals.matches || [];
          } else if (stageId === 'semifinals' && conclusion.semi_finals) {
            knockoutMatches = conclusion.semi_finals.matches || [];
          } else if (stageId === 'final' && conclusion.final) {
            knockoutMatches = conclusion.final.matches || [];
          }
        }
        // Tag each knockout match with its stage label for display
        knockoutMatches.forEach(m => {
          m._stageLabel = stageLabels[stageId];
        });
        flatMatches = flatMatches.concat(knockoutMatches);
      });
    } catch (knockoutErr) {
      console.warn('Could not load knockout matches for schedule:', knockoutErr);
    }
    
    state.matches = flatMatches;

    return { groupsData, matchesMap };
  } catch (e) {
    console.error("Failed to load initial tournament data:", e);
    return null;
  }
}

// 3. Initialize components and setup view layouts
function initAppComponents(data) {
  if (!data) return;

  const { groupsData, matchesMap } = data;

  // Initialize Tab Navigation
  initNavigation();

  // View 1: Todays Matches Carousel
  const todaysMatchesContainer = document.getElementById('todays-matches-carousel');
  const targetMatchesContainer = todaysMatchesContainer || document.getElementById('todays-matches-container');
  state.todaysMatchesTable = new TodaysMatches(targetMatchesContainer, state.matches, state.stadiums);
  state.todaysMatchesTable.render();

  // View 1: Group Standings Dashboard
  const standingsContainer = document.getElementById('standings-tables-container');
  state.standingsTable = new GroupStandings(standingsContainer, groupsData, matchesMap, state.stadiums);
  state.standingsTable.render();

  // View 1: Knockout Bracket View
  const bracketContainer = document.getElementById('knockout-bracket-container');
  state.bracketView = new KnockoutBracket(bracketContainer);
  state.bracketView.render();

  // View 2: Match Predictions & Analyst modal
  const analystModalContainer = document.getElementById('analyst-modal-container');
  const modalComponent = new AnalystModal(analystModalContainer, (matchId, homeScore, awayScore) => {
    // Fill the prediction inputs
    state.predictionForm.autofill(matchId, homeScore, awayScore);
  });
  state.analystModal = modalComponent;

  const predictionsContainer = document.getElementById('predictions-container');
  state.predictionForm = new PredictionForm(
    predictionsContainer,
    state.matches,
    async (matchId, homeTeam, awayTeam) => {
      // Trigger prediction modal with loading indicators
      modalComponent.showLoading(homeTeam, awayTeam);

      try {
        FirebaseClient.logAnalyticsEvent('request_ai_analysis', {
          match_id: matchId,
          home_team: homeTeam,
          away_team: awayTeam
        });
        // Query the ADK agent via FirebaseClient service
        const analysis = await FirebaseClient.analyzeMatch(matchId, homeTeam, awayTeam);
        modalComponent.show(analysis, homeTeam, awayTeam);
      } catch (err) {
        console.error("Analyst consultation error:", err);
        modalComponent.showError(err.message, homeTeam, awayTeam);
      }
    },
    (matchId, homeScore, awayScore) => {
      FirebaseClient.logAnalyticsEvent('save_prediction', {
        match_id: matchId,
        prediction: `${homeScore}-${awayScore}`
      });
      alert(`¡Predicción guardada exitosamente para el partido ${matchId}! (${homeScore} - ${awayScore})`);
    }
  );
  state.predictionForm.render();

  // View 3: Sticker Generator Screen
  const stickersContainer = document.getElementById('stickers-container');
  state.stickerView = new StickerView(stickersContainer, state.teams);
  state.stickerView.render();

  // View 4: Conversational Chat Assistant
  const chatViewContainer = document.getElementById('chat-view-container');
  if (chatViewContainer) {
    state.chatComponent = new WorldCupChat(chatViewContainer);
    state.chatComponent.render();
  }
}

// Tabs switcher controller
function initNavigation() {
  const tabs = {
    'tab-dashboard': 'view-dashboard',
    'tab-predictions': 'view-predictions',
    'tab-stickers': 'view-stickers',
    'tab-search': 'view-search'
  };

  const buttons = document.querySelectorAll('.tab-btn');
  const panels = document.querySelectorAll('.view-panel');

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      // Toggle button styles
      buttons.forEach(b => {
        b.classList.remove('bg-gradient-to-r', 'from-emerald-500', 'to-teal-600', 'text-white', 'shadow-[0_0_15px_rgba(16,185,129,0.35)]');
        b.classList.add('text-gray-400', 'hover:text-white');
      });
      btn.classList.remove('text-gray-400', 'hover:text-white');
      btn.classList.add('bg-gradient-to-r', 'from-emerald-500', 'to-teal-600', 'text-white', 'shadow-[0_0_15px_rgba(16,185,129,0.35)]');

      // Toggle visibility panels
      const targetId = tabs[btn.id];
      
      // Log screen view event in Firebase Analytics
      FirebaseClient.logAnalyticsEvent('screen_view', {
        screen_name: targetId,
        screen_class: 'main'
      });

      panels.forEach(panel => {
        if (panel.id === targetId) {
          panel.classList.remove('hidden');
          panel.classList.add('block');
        } else {
          panel.classList.remove('block');
          panel.classList.add('hidden');
        }
      });

      // Redraw default card sample when the tab becomes active to ensure correct canvas sizing
      if (btn.id === 'tab-stickers' && state.stickerView) {
        setTimeout(() => {
          state.stickerView.drawDefaultSample();
        }, 50);
      }
    });
  });
}

// Dynamically update UI texts based on current document language
function updateLanguageUI() {
  const lang = document.documentElement.lang || 'es';
  const dict = TRANSLATIONS[lang];

  // Update flags style
  const esBtn = document.getElementById('lang-es-btn');
  const enBtn = document.getElementById('lang-en-btn');
  if (esBtn && enBtn) {
    if (lang === 'en') {
      esBtn.classList.remove('opacity-100');
      esBtn.classList.add('opacity-40');
      enBtn.classList.remove('opacity-40');
      enBtn.classList.add('opacity-100');
    } else {
      esBtn.classList.remove('opacity-40');
      esBtn.classList.add('opacity-100');
      enBtn.classList.remove('opacity-100');
      enBtn.classList.add('opacity-40');
    }
  }

  // Translate header
  const mainTitle = document.getElementById('app-title-text');
  if (mainTitle) mainTitle.innerText = dict.title_main;
  const mainSub = document.getElementById('app-subtitle-text');
  if (mainSub) mainSub.innerText = dict.subtitle_main;

  // Translate tab buttons
  const tabDashboard = document.getElementById('tab-dashboard');
  if (tabDashboard) {
    tabDashboard.innerHTML = `<span>📊</span> <span class="sm:hidden">${lang === 'en' ? 'Groups' : 'Grupos'}</span><span class="hidden sm:inline">${dict.nav_dashboard}</span>`;
  }
  const tabPredictions = document.getElementById('tab-predictions');
  if (tabPredictions) {
    tabPredictions.innerHTML = `<span>🤖</span> <span class="sm:hidden">${lang === 'en' ? 'Predictions' : 'Pronósticos'}</span><span class="hidden sm:inline">${dict.nav_predictions}</span>`;
  }
  const tabStickers = document.getElementById('tab-stickers');
  if (tabStickers) {
    tabStickers.innerHTML = `<span>⚽</span> <span>${dict.nav_stickers}</span>`;
  }
  const tabSearch = document.getElementById('tab-search');
  if (tabSearch) {
    tabSearch.innerHTML = `
      <span>💬</span>
      <span class="sm:hidden">${lang === 'en' ? 'Chat IA' : 'Chat IA'}</span>
      <span class="hidden sm:inline">${dict.nav_search}</span>
      <span class="relative flex h-2 w-2 ml-1 shrink-0">
        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
        <span class="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
      </span>
    `;
  }
  const knockoutTitle = document.getElementById('knockout-title-text');
  if (knockoutTitle) knockoutTitle.innerHTML = `<span>⚔️</span> ${dict.knockout_title}`;

  const exportAllBtnText = document.getElementById('export-all-btn-text');
  if (exportAllBtnText) exportAllBtnText.innerText = dict.btn_export_all_cal;

  const alertsBtnText = document.getElementById('match-alerts-btn-text');
  if (alertsBtnText) {
    const permission = NotificationUtil.getStoredPermission();
    if (permission === 'granted') {
      alertsBtnText.innerText = dict.btn_alerts_enabled;
    } else if (permission === 'denied') {
      alertsBtnText.innerText = dict.btn_alerts_blocked;
    } else {
      alertsBtnText.innerText = dict.btn_alerts_enable;
    }
  }

  // Translate AcaDevHack Promo Banner
  const headerPromoBtnText = document.getElementById('header-acadevhack-btn-text');
  if (headerPromoBtnText) headerPromoBtnText.innerText = dict.promo_btn;
  
  const promoTitle = document.getElementById('promo-title');
  if (promoTitle) promoTitle.innerText = dict.promo_title;
  const promoText = document.getElementById('promo-text');
  if (promoText) promoText.innerHTML = dict.promo_text;
  const promoBtnText = document.getElementById('promo-btn-text');
  if (promoBtnText) promoBtnText.innerText = dict.promo_btn;

  // Translate AcaDevHack Floating Widget
  const widgetPromoTitle = document.getElementById('widget-promo-title');
  if (widgetPromoTitle) widgetPromoTitle.innerText = dict.widget_promo_title;
  const widgetPromoText = document.getElementById('widget-promo-text');
  if (widgetPromoText) widgetPromoText.innerHTML = dict.widget_promo_text;
  const widgetPromoBtnText = document.getElementById('widget-promo-btn-text');
  if (widgetPromoBtnText) widgetPromoBtnText.innerText = dict.widget_promo_btn;

  // Trigger re-renders
  if (state.todaysMatchesTable) state.todaysMatchesTable.render();
  if (state.standingsTable) state.standingsTable.render();
  if (state.bracketView) state.bracketView.render();
  if (state.predictionForm) state.predictionForm.render();
  if (state.stickerView) state.stickerView.render();
  if (state.chatComponent) state.chatComponent.render();
}

// Bootstrap entrypoint
window.addEventListener('DOMContentLoaded', async () => {
  // Start the 3D soccer ball intro immediately
  initHeroEffect();
  
  // Set up language buttons
  const esBtn = document.getElementById('lang-es-btn');
  const enBtn = document.getElementById('lang-en-btn');
  if (esBtn) {
    esBtn.addEventListener('click', () => {
      if (document.documentElement.lang !== 'es') {
        document.documentElement.lang = 'es';
        updateLanguageUI();
      }
    });
  }
  if (enBtn) {
    enBtn.addEventListener('click', () => {
      if (document.documentElement.lang !== 'en') {
        document.documentElement.lang = 'en';
        updateLanguageUI();
      }
    });
  }

  // Load data and setup components in parallel
  const data = await loadData();
  initAppComponents(data);

  // Set up global calendar export button listener
  const exportAllBtn = document.getElementById('export-all-matches-btn');
  if (exportAllBtn) {
    exportAllBtn.addEventListener('click', async () => {
      try {
        const originalText = exportAllBtn.innerHTML;
        exportAllBtn.disabled = true;
        exportAllBtn.innerHTML = `<span>⏳</span> <span>${document.documentElement.lang === 'en' ? 'Exporting...' : 'Exportando...'}</span>`;
        
        // Load all knockout stage matches in parallel
        const stages = ['round-of-32', 'round-of-16', 'quarterfinals', 'semifinals', 'final'];
        const loadedKnockouts = await Promise.all(
          stages.map(stageId => DataLoader.loadKnockoutStage(stageId))
        );
        
        let allKnockoutMatches = [];
        loadedKnockouts.forEach((stageData, index) => {
          const stageId = stages[index];
          let matches = [];
          
          if (stageData.matches) {
            matches = stageData.matches;
          } else if (stageData.match_details) {
            matches = [stageData.match_details];
          } else if (stageData.tournament_conclusion) {
            const conclusion = stageData.tournament_conclusion;
            if (stageId === 'quarterfinals' && conclusion.quarter_finals) {
              matches = conclusion.quarter_finals.matches || [];
              if (conclusion.third_place && conclusion.third_place.matches) {
                matches = matches.concat(conclusion.third_place.matches);
              }
            } else if (stageId === 'semifinals' && conclusion.semi_finals) {
              matches = conclusion.semi_finals.matches || [];
            } else if (stageId === 'final' && conclusion.final) {
              matches = conclusion.final.matches || [];
            }
          }
          allKnockoutMatches = allKnockoutMatches.concat(matches);
        });

        // Combine group matches and knockout matches
        const allMatches = state.matches.concat(allKnockoutMatches);
        
        // Export to iCalendar using pre-imported CalendarUtil
        CalendarUtil.exportAllToICS(allMatches, state.stadiums);
        
        exportAllBtn.innerHTML = originalText;
        exportAllBtn.disabled = false;

        // Show helper instructions on how to import to Google Calendar / Apple Calendar
        const isEn = document.documentElement.lang === 'en';
        alert(isEn 
          ? "World Cup 2026 Calendar (.ics) downloaded successfully!\n\nTo import this schedule into Google Calendar:\n1. Open calendar.google.com\n2. Click on Settings (gear icon) -> Settings.\n3. In the left sidebar, click 'Import & export'.\n4. Upload the downloaded .ics file and select your target calendar.\n5. Click Import." 
          : "¡Calendario de la Copa Mundial 2026 (.ics) descargado con éxito!\n\nPara importar este calendario a Google Calendar:\n1. Entra a calendar.google.com\n2. Haz clic en el ícono de Configuración (engranaje) -> Configuración.\n3. En el menú de la izquierda, haz clic en 'Importar y exportar'.\n4. Selecciona el archivo .ics descargado y el calendario de destino.\n5. Haz clic en Importar.");
      } catch (err) {
        console.error("Failed to export all matches:", err);
        alert(document.documentElement.lang === 'en' ? "Failed to export calendar." : "Error al exportar el calendario.");
        exportAllBtn.disabled = false;
      }
    });
  }

  // Set up match alerts button listener
  const alertsBtn = document.getElementById('match-alerts-btn');
  if (alertsBtn) {
    alertsBtn.addEventListener('click', async () => {
      const permission = await NotificationUtil.requestPermission();
      updateLanguageUI();
      if (permission === 'granted') {
        try {
          const originalText = alertsBtn.innerHTML;
          alertsBtn.disabled = true;
          alertsBtn.innerHTML = `<span>⏳</span> <span>${document.documentElement.lang === 'en' ? 'Scheduling...' : 'Programando...'}</span>`;

          // Load all matches (group stage is already loaded in state.matches)
          const stages = ['round-of-32', 'round-of-16', 'quarterfinals', 'semifinals', 'final'];
          const loadedKnockouts = await Promise.all(
            stages.map(stageId => DataLoader.loadKnockoutStage(stageId))
          );
          let allKnockoutMatches = [];
          loadedKnockouts.forEach((stageData, index) => {
            const stageId = stages[index];
            let matches = [];
            if (stageData.matches) {
              matches = stageData.matches;
            } else if (stageData.match_details) {
              matches = [stageData.match_details];
            } else if (stageData.tournament_conclusion) {
              const conclusion = stageData.tournament_conclusion;
              if (stageId === 'quarterfinals' && conclusion.quarter_finals) {
                matches = conclusion.quarter_finals.matches || [];
                if (conclusion.third_place && conclusion.third_place.matches) {
                  matches = matches.concat(conclusion.third_place.matches);
                }
              } else if (stageId === 'semifinals' && conclusion.semi_finals) {
                matches = conclusion.semi_finals.matches || [];
              } else if (stageId === 'final' && conclusion.final) {
                matches = conclusion.final.matches || [];
              }
            }
            allKnockoutMatches = allKnockoutMatches.concat(matches);
          });
          const allMatches = state.matches.concat(allKnockoutMatches);
          NotificationUtil.scheduleAllAlerts(allMatches, state.stadiums);
          
          alertsBtn.innerHTML = originalText;
          alertsBtn.disabled = false;
          updateLanguageUI();

          alert(document.documentElement.lang === 'en'
            ? "Alerts scheduled! You will receive a notification 10 minutes and 5 minutes before each kickoff."
            : "¡Alertas programadas! Recibirás una notificación 10 y 5 minutos antes de cada inicio de partido.");
        } catch (err) {
          console.error("Failed to load matches for notification alerts:", err);
          alertsBtn.innerHTML = originalText;
          alertsBtn.disabled = false;
        }
      } else if (permission === 'denied') {
        alert(document.documentElement.lang === 'en'
          ? "Notifications are blocked. Please enable them in your browser settings to receive alerts."
          : "Las notificaciones están bloqueadas. Por favor, actívalas en la configuración de tu navegador para recibir alertas.");
      }
    });
  }

  // Auto-schedule if permissions are already granted from a previous session
  if (NotificationUtil.getStoredPermission() === 'granted') {
    (async () => {
      try {
        const stages = ['round-of-32', 'round-of-16', 'quarterfinals', 'semifinals', 'final'];
        const loadedKnockouts = await Promise.all(
          stages.map(stageId => DataLoader.loadKnockoutStage(stageId))
        );
        let allKnockoutMatches = [];
        loadedKnockouts.forEach((stageData, index) => {
          const stageId = stages[index];
          let matches = [];
          if (stageData.matches) {
            matches = stageData.matches;
          } else if (stageData.match_details) {
            matches = [stageData.match_details];
          } else if (stageData.tournament_conclusion) {
            const conclusion = stageData.tournament_conclusion;
            if (stageId === 'quarterfinals' && conclusion.quarter_finals) {
              matches = conclusion.quarter_finals.matches || [];
              if (conclusion.third_place && conclusion.third_place.matches) {
                matches = matches.concat(conclusion.third_place.matches);
              }
            } else if (stageId === 'semifinals' && conclusion.semi_finals) {
              matches = conclusion.semi_finals.matches || [];
            } else if (stageId === 'final' && conclusion.final) {
              matches = conclusion.final.matches || [];
            }
          }
          allKnockoutMatches = allKnockoutMatches.concat(matches);
        });
        const allMatches = state.matches.concat(allKnockoutMatches);
        NotificationUtil.scheduleAllAlerts(allMatches, state.stadiums);
      } catch (err) {
        console.error("Background notification schedule failure:", err);
      }
    })();
  }

  // Handle AcaDevHack floating widget dismissal
  const floatingWidget = document.getElementById('devhack-floating-widget');
  const closeWidgetBtn = document.getElementById('close-promo-widget-btn');
  if (floatingWidget && closeWidgetBtn) {
    if (sessionStorage.getItem('devhack-promo-dismissed') === 'true') {
      floatingWidget.classList.add('hidden');
    }
    closeWidgetBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      floatingWidget.classList.add('hidden');
      sessionStorage.setItem('devhack-promo-dismissed', 'true');
    });
  }

  // Sync language labels once components are initialized
  updateLanguageUI();
});
