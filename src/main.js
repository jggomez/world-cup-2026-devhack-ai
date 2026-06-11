import './ui/index.css';
import { SceneManager } from './ui/animations/SceneManager.js';
import { DataLoader } from './infrastructure/db/DataLoader.js';
import { GroupStanding } from './domain/entities/Team.js';
import { GroupStandings } from './ui/components/GroupStandings.js';
import { TodaysMatches } from './ui/components/TodaysMatches.js';
import { KnockoutBracket } from './ui/components/KnockoutBracket.js';
import { PredictionForm } from './ui/components/PredictionForm.js';
import { AnalystModal } from './ui/components/AnalystModal.js';
import { FirebaseAILogic } from './infrastructure/ai/FirebaseAILogic.js';
import { StickerView } from './ui/views/StickerView.js';
import { WorldCupChat } from './ui/components/WorldCupChat.js';
import { TRANSLATIONS } from './infrastructure/lang/TranslationDict.js';

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
        // Query the ADK agent via FirebaseAILogic service
        const analysis = await FirebaseAILogic.analyzeMatch(matchId, homeTeam, awayTeam);
        modalComponent.show(analysis, homeTeam, awayTeam);
      } catch (err) {
        console.error("Analyst consultation error:", err);
        modalComponent.showError(err.message, homeTeam, awayTeam);
      }
    },
    (matchId, homeScore, awayScore) => {
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

  // Sync language labels once components are initialized
  updateLanguageUI();
});
