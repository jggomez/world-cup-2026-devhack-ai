import { FirebaseAILogic } from '../../infrastructure/ai/FirebaseAILogic.js';
import { TRANSLATIONS } from '../../infrastructure/lang/TranslationDict.js';

export class WorldCupChat {
  constructor(containerElement) {
    this.container = containerElement;
    this.chatSession = null;
    this.messages = [];
  }

  initChat() {
    try {
      this.chatSession = FirebaseAILogic.startChatSession([]);
    } catch (e) {
      console.error('Failed to initialize Firebase AI Chat session:', e);
    }
  }

  render() {
    const lang = ((typeof document !== 'undefined' && document.documentElement.lang) || 'es') === 'en' ? 'en' : 'es';
    const dict = TRANSLATIONS[lang];

    // Suggestion chips: icon + short label for mobile legibility
    const suggestions = lang === 'en'
      ? [
          { icon: '🏆', label: 'Most winners',     query: 'Who has won the most World Cups in history?' },
          { icon: '📅', label: "Today's matches",  query: 'What World Cup matches are played today?' },
          { icon: '⚽', label: 'Top scorer',       query: 'Who is the all-time top scorer of the World Cups?' },
          { icon: '🏃', label: 'Squad players',    query: 'What are the squad players for the team of Colombia?' },
          { icon: '👥', label: '2026 teams',       query: 'How many teams will play in the 2026 World Cup?' },
        ]
      : [
          { icon: '🏆', label: 'Más ganadores',    query: '¿Quién ha ganado más Mundiales en la historia?' },
          { icon: '📅', label: 'Hoy',              query: '¿Qué partidos del mundial se juegan el día de hoy?' },
          { icon: '⚽', label: 'Goleador',         query: '¿Quién es el máximo goleador histórico de los mundiales?' },
          { icon: '🏃', label: 'Jugadores',        query: '¿Cuáles son los jugadores más destacados de Colombia?' },
          { icon: '👥', label: 'Equipos 2026',     query: '¿Cuántos equipos jugarán en el Mundial 2026?' },
        ];

    const chipsHtml = suggestions.map((s, i) => `
      <button type="button"
        data-idx="${i}"
        class="chat-suggest-btn flex items-center gap-1.5 text-[11px] sm:text-xs
               bg-white/5 border border-white/15 hover:border-amber-400/60 hover:bg-amber-400/10
               text-gray-300 hover:text-white py-1.5 px-3 rounded-full transition-all duration-200
               whitespace-nowrap shrink-0 font-medium">
        <span>${s.icon}</span><span>${s.label}</span>
      </button>
    `).join('');

    this.container.innerHTML = `
      <!-- Chat section header -->
      <div class="mb-4 sm:mb-6 text-center">
        <h3 id="chat-section-title"
            class="text-lg sm:text-2xl font-bold flex items-center justify-center gap-2">
          <span>💬</span>
          <span>${dict.chat_title ?? 'Chatea con el mundial'}</span>
        </h3>
        <p id="chat-section-subtitle"
           class="text-gray-400 text-xs sm:text-sm mt-1 max-w-md mx-auto">
          ${dict.chat_subtitle ?? 'Pregunta sobre sedes, campeones históricos o estadísticas.'}
        </p>
      </div>

      <!-- Chat panel — height adapts to viewport on mobile -->
      <div class="glass-panel flex flex-col"
           style="height: clamp(360px, calc(100dvh - 300px), 580px);">

        <!-- Messages area -->
        <div class="flex-1 overflow-y-auto p-2 sm:p-3 flex flex-col gap-3 scroll-smooth"
             id="chat-messages-box">

          <!-- Welcome bubble -->
          <div class="flex gap-2 sm:gap-3 items-start max-w-[90%] sm:max-w-[85%]">
            <div class="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-amber-400 text-black
                        flex items-center justify-center font-bold text-[10px] sm:text-xs shrink-0">
              AI
            </div>
            <div class="p-3 rounded-2xl bg-white/5 border border-white/5 text-white text-xs sm:text-sm min-w-0">
              <p class="mb-3 leading-relaxed">${dict.chat_welcome}</p>

              <!-- Suggestion chips — horizontal scroll on very small screens -->
              <div class="border-t border-white/10 pt-3">
                <p class="text-[10px] text-amber-400 font-bold uppercase tracking-wider mb-2">
                  ${dict.chat_sugg_title}
                </p>
                <div class="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1" id="chat-suggestions">
                  ${chipsHtml}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Input bar — sticky at bottom -->
        <div class="border-t border-white/10 p-2 sm:p-3">
          <form id="chat-input-form" class="flex gap-2 items-center">
            <input
              type="text"
              id="chat-message-input"
              placeholder="${dict.chat_placeholder}"
              autocomplete="off"
              class="flex-1 min-w-0 px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl
                     bg-black/40 border border-white/10 text-white text-sm font-medium
                     focus:outline-none focus:border-amber-400/60 transition"
            >
            <button
              type="submit"
              id="chat-send-btn"
              class="shrink-0 w-10 h-10 sm:w-auto sm:h-auto sm:px-5 sm:py-2.5
                     rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-95
                     text-black font-bold transition-all duration-200 shadow
                     flex items-center justify-center gap-1.5">
              <!-- Arrow icon on mobile, text on sm+ -->
              <span class="sm:hidden text-base">➤</span>
              <span class="hidden sm:inline text-sm">${dict.chat_send}</span>
            </button>
          </form>
        </div>
      </div>
    `;

    this.initChat();

    const form        = this.container.querySelector('#chat-input-form');
    const input       = this.container.querySelector('#chat-message-input');
    const messagesBox = this.container.querySelector('#chat-messages-box');

    // Suggestion chip click → inject query and submit
    this.container.querySelectorAll('.chat-suggest-btn').forEach((btn) => {
      const idx = parseInt(btn.dataset.idx, 10);
      btn.addEventListener('click', () => {
        input.value = suggestions[idx].query;
        form.dispatchEvent(new Event('submit'));
      });
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;

      input.value = '';
      this.appendUserMessage(messagesBox, text);

      const typingId = this.appendTypingIndicator(messagesBox);
      messagesBox.scrollTop = messagesBox.scrollHeight;

      try {
        let reply = lang === 'en'
          ? "Sorry, I couldn't process your message right now."
          : 'Lo siento, no pude procesar tu mensaje en este momento.';

        if (this.chatSession) {
          const result = await this.chatSession.sendMessage(text);
          reply = result.response.text();
        } else {
          // Fallback: Cloud Run search agent if Firebase SDK failed to initialize
          reply = await FirebaseAILogic.searchConversational(text);
        }

        this.removeTypingIndicator(messagesBox, typingId);
        this.appendModelMessage(messagesBox, reply);
      } catch (err) {
        console.error('Chat message delivery failed:', err);
        this.removeTypingIndicator(messagesBox, typingId);
        this.appendModelMessage(
          messagesBox,
          lang === 'en'
            ? 'Sorry, an error occurred. Please check your connection.'
            : 'Lo siento, ocurrió un error al consultar al asistente del Mundial. Revisa tu conexión.'
        );
      }

      messagesBox.scrollTop = messagesBox.scrollHeight;
    });
  }

  appendUserMessage(box, text) {
    const msgEl = document.createElement('div');
    msgEl.className = 'flex gap-2 sm:gap-3 items-start max-w-[88%] sm:max-w-[85%] self-end flex-row-reverse';
    msgEl.innerHTML = `
      <div class="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-blue-600 text-white
                  flex items-center justify-center font-bold text-[10px] sm:text-xs shrink-0">TÚ</div>
      <div class="px-3 py-2.5 rounded-2xl rounded-tr-sm bg-blue-600/25 border border-blue-500/20
                  text-white text-xs sm:text-sm leading-relaxed break-words min-w-0">
        ${this.escapeHtml(text)}
      </div>
    `;
    box.appendChild(msgEl);
  }

  appendModelMessage(box, text) {
    const msgEl = document.createElement('div');
    msgEl.className = 'flex gap-2 sm:gap-3 items-start max-w-[90%] sm:max-w-[85%]';
    msgEl.innerHTML = `
      <div class="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-amber-400 text-black
                  flex items-center justify-center font-bold text-[10px] sm:text-xs shrink-0">AI</div>
      <div class="px-3 py-2.5 rounded-2xl rounded-tl-sm bg-white/5 border border-white/10
                  text-white text-xs sm:text-sm leading-relaxed min-w-0">
        ${this.parseMarkdown(text)}
      </div>
    `;
    box.appendChild(msgEl);
  }

  appendTypingIndicator(box) {
    const id = 'typing-' + Date.now();
    const msgEl = document.createElement('div');
    msgEl.id = id;
    msgEl.className = 'flex gap-2 sm:gap-3 items-start max-w-[85%]';
    msgEl.innerHTML = `
      <div class="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-amber-400 text-black
                  flex items-center justify-center font-bold text-[10px] sm:text-xs shrink-0">AI</div>
      <div class="px-3 py-2.5 rounded-2xl rounded-tl-sm bg-white/5 border border-white/10
                  text-gray-400 text-sm flex items-center gap-1">
        <span class="animate-bounce" style="animation-delay:0ms">·</span>
        <span class="animate-bounce" style="animation-delay:150ms">·</span>
        <span class="animate-bounce" style="animation-delay:300ms">·</span>
      </div>
    `;
    box.appendChild(msgEl);
    return id;
  }

  removeTypingIndicator(box, id) {
    const el = box.querySelector('#' + id);
    if (el) el.remove();
  }

  parseMarkdown(text) {
    let html = this.escapeHtml(text);
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="text-amber-400 font-bold">$1</strong>');
    html = html.replace(/\*(.*?)\*/g,     '<em class="text-gray-300">$1</em>');

    const lines = html.split('\n');
    let inList = false;
    const processed = lines.map(line => {
      const t = line.trim();
      if (t.startsWith('- ') || t.startsWith('* ')) {
        const content = t.substring(2);
        let prefix = '';
        if (!inList) { inList = true; prefix = '<ul class="list-disc pl-5 my-2 flex flex-col gap-1">'; }
        return prefix + `<li>${content}</li>`;
      } else {
        let suffix = '';
        if (inList) { inList = false; suffix = '</ul>'; }
        return suffix + (t ? `<p class="mb-1.5 leading-relaxed">${t}</p>` : '');
      }
    });

    let final = processed.join('');
    if (inList) final += '</ul>';
    return final;
  }

  escapeHtml(unsafe) {
    if (!unsafe) return '';
    return String(unsafe)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
