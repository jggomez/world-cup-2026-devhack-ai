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
      console.error("Failed to initialize Firebase AI Chat session:", e);
    }
  }

  render() {
    const lang = ((typeof document !== 'undefined' && document.documentElement.lang) || 'es') === 'en' ? 'en' : 'es';
    const dict = TRANSLATIONS[lang];

    this.container.innerHTML = `
      <div class="glass-panel p-4 flex flex-col h-[520px]">
        <div class="flex-1 overflow-y-auto mb-4 p-2 flex flex-col gap-3" id="chat-messages-box">
          <!-- Initial message -->
          <div class="flex gap-3 items-start max-w-[85%]">
            <div class="w-8 h-8 rounded-full bg-amber-400 text-black flex items-center justify-center font-bold text-xs shrink-0">AI</div>
            <div class="p-3 rounded-2xl bg-white/5 border border-white/5 text-white text-sm">
              <p class="mb-2">${dict.chat_welcome}</p>
              
              <div class="mt-3 border-t border-white/10 pt-3">
                <p class="text-[10px] text-amber-400 font-bold uppercase tracking-wider mb-2">${dict.chat_sugg_title}</p>
                <div class="flex flex-wrap gap-1.5" id="chat-suggestions">
                  <button type="button" class="chat-suggest-btn text-[11px] bg-white/5 border border-white/10 hover:border-amber-400/50 hover:bg-white/10 text-gray-300 py-1 px-2.5 rounded-full transition text-left">${dict.chat_sugg_winners}</button>
                  <button type="button" class="chat-suggest-btn text-[11px] bg-white/5 border border-white/10 hover:border-amber-400/50 hover:bg-white/10 text-gray-300 py-1 px-2.5 rounded-full transition text-left">${dict.chat_sugg_today}</button>
                  <button type="button" class="chat-suggest-btn text-[11px] bg-white/5 border border-white/10 hover:border-amber-400/50 hover:bg-white/10 text-gray-300 py-1 px-2.5 rounded-full transition text-left">${dict.chat_sugg_scorer}</button>
                  <button type="button" class="chat-suggest-btn text-[11px] bg-white/5 border border-white/10 hover:border-amber-400/50 hover:bg-white/10 text-gray-300 py-1 px-2.5 rounded-full transition text-left">${dict.chat_sugg_roster}</button>
                  <button type="button" class="chat-suggest-btn text-[11px] bg-white/5 border border-white/10 hover:border-amber-400/50 hover:bg-white/10 text-gray-300 py-1 px-2.5 rounded-full transition text-left">${dict.chat_sugg_teams}</button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <form id="chat-input-form" class="flex gap-2 border-t border-white/5 pt-3">
          <input type="text" id="chat-message-input" placeholder="${dict.chat_placeholder}" class="flex-1 p-3 rounded-lg bg-black/40 border border-white/10 text-white font-medium focus:outline-none focus:border-amber-400/50" autocomplete="off">
          <button type="submit" id="chat-send-btn" class="px-6 py-3 rounded-lg bg-amber-400 text-black font-bold hover:bg-amber-300 transition shadow flex items-center gap-1">
            <span>${dict.chat_send}</span>
          </button>
        </form>
      </div>
    `;

    this.initChat();

    const form = this.container.querySelector('#chat-input-form');
    const input = this.container.querySelector('#chat-message-input');
    const messagesBox = this.container.querySelector('#chat-messages-box');

    // Setup suggestion click events
    const suggestions = this.container.querySelectorAll('.chat-suggest-btn');
    suggestions.forEach((btn, index) => {
      btn.addEventListener('click', () => {
        let text = "";
        if (lang === 'en') {
          if (index === 0) text = "Who has won the most World Cups in history?";
          else if (index === 1) text = "What World Cup matches are played today?";
          else if (index === 2) text = "Who is the all-time top scorer of the World Cups?";
          else if (index === 3) text = "What are the squad players for the team of Colombia?";
          else if (index === 4) text = "How many teams will play in the 2026 World Cup?";
        } else {
          if (index === 0) text = "¿Quién ha ganado más Mundiales en la historia?";
          else if (index === 1) text = "¿Qué partidos del mundial se juegan el día de hoy?";
          else if (index === 2) text = "¿Quién es el máximo goleador histórico de los mundiales?";
          else if (index === 3) text = "¿Cuáles son los jugadores más destacados y convocados de la selección de Colombia?";
          else if (index === 4) text = "¿Cuántos equipos jugarán en el Mundial 2026?";
        }
        
        if (text) {
          input.value = text;
          form.dispatchEvent(new Event('submit'));
        }
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
        let reply = "Lo siento, no pude procesar tu mensaje en este momento.";
        if (this.chatSession) {
          const result = await this.chatSession.sendMessage(text);
          reply = result.response.text();
        } else {
          // If SDK fails initialization, fallback to simple generation
          reply = await FirebaseAILogic.searchConversational(text);
        }
        
        this.removeTypingIndicator(messagesBox, typingId);
        this.appendModelMessage(messagesBox, reply);
      } catch (err) {
        console.error("Chat message delivery failed:", err);
        this.removeTypingIndicator(messagesBox, typingId);
        this.appendModelMessage(messagesBox, "Lo siento, ocurrió un error al consultar al asistente del Mundial. Revisa tu conexión.");
      }
      
      messagesBox.scrollTop = messagesBox.scrollHeight;
    });
  }

  appendUserMessage(box, text) {
    const msgEl = document.createElement('div');
    msgEl.className = 'flex gap-3 items-start max-w-[85%] self-end flex-row-reverse';
    msgEl.innerHTML = `
      <div class="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">TÚ</div>
      <div class="p-3 rounded-2xl bg-blue-600/20 border border-blue-500/10 text-white text-sm">
        ${this.escapeHtml(text)}
      </div>
    `;
    box.appendChild(msgEl);
  }

  appendModelMessage(box, text) {
    const msgEl = document.createElement('div');
    msgEl.className = 'flex gap-3 items-start max-w-[85%]';
    msgEl.innerHTML = `
      <div class="w-8 h-8 rounded-full bg-amber-400 text-black flex items-center justify-center font-bold text-xs shrink-0">AI</div>
      <div class="p-3 rounded-2xl bg-white/5 border border-white/5 text-white text-sm">
        ${this.parseMarkdown(text)}
      </div>
    `;
    box.appendChild(msgEl);
  }

  appendTypingIndicator(box) {
    const id = 'typing-' + Date.now();
    const msgEl = document.createElement('div');
    msgEl.id = id;
    msgEl.className = 'flex gap-3 items-start max-w-[85%]';
    msgEl.innerHTML = `
      <div class="w-8 h-8 rounded-full bg-amber-400 text-black flex items-center justify-center font-bold text-xs shrink-0">AI</div>
      <div class="p-3 rounded-2xl bg-white/5 border border-white/5 text-gray-400 text-sm flex items-center gap-1">
        <span class="animate-bounce" style="animation-delay: 0ms">.</span>
        <span class="animate-bounce" style="animation-delay: 150ms">.</span>
        <span class="animate-bounce" style="animation-delay: 300ms">.</span>
      </div>
    `;
    box.appendChild(msgEl);
    return id;
  }

  removeTypingIndicator(box, id) {
    const el = box.querySelector('#' + id);
    if (el) {
      el.remove();
    }
  }

  parseMarkdown(text) {
    let html = this.escapeHtml(text);
    
    // Convert bold: **text** -> <strong>text</strong>
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="text-amber-400 font-bold">$1</strong>');
    
    // Convert italic: *text* -> <em>text</em>
    html = html.replace(/\*(.*?)\*/g, '<em class="text-gray-300">$1</em>');
    
    // Convert bullet points and paragraph structures
    const lines = html.split('\n');
    let inList = false;
    const processedLines = lines.map(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const content = trimmed.substring(2);
        let listPrefix = '';
        if (!inList) {
          inList = true;
          listPrefix = '<ul class="list-disc pl-5 my-2 flex flex-col gap-1.5">';
        }
        return listPrefix + `<li>${content}</li>`;
      } else {
        let suffix = '';
        if (inList) {
          inList = false;
          suffix = '</ul>';
        }
        return suffix + (trimmed ? `<p class="mb-2 leading-relaxed">${trimmed}</p>` : '');
      }
    });
    
    let finalHtml = processedLines.join('');
    if (inList) {
      finalHtml += '</ul>';
    }
    return finalHtml;
  }

  escapeHtml(unsafe) {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}
