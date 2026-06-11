export class SearchResults {
  constructor(containerElement) {
    this.container = containerElement;
  }

  render(result) {
    this.container.innerHTML = '';
    if (!result) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'glass-panel border border-white/10 p-6';

    let contentHtml = `
      <h4 class="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Resultado de la Búsqueda</h4>
      <p class="text-lg font-medium text-white mb-4">${result.answer}</p>
    `;

    if (result.type === 'stadium' && result.data) {
      contentHtml += `
        <div class="mt-4 p-4 rounded-xl bg-white/5 border border-white/10 max-w-sm">
          <div class="font-bold text-lg">${result.data.name}</div>
          <div class="text-xs text-gray-400">${result.data.city}, ${result.data.country}</div>
          <div class="text-sm mt-2 font-semibold text-amber-400">Capacidad: ${result.data.official_capacity.toLocaleString()}</div>
        </div>
      `;
    }

    if (result.type === 'matches' && Array.isArray(result.data)) {
      contentHtml += `
        <div class="mt-4 flex flex-col gap-2">
          ${result.data.map(m => `
            <div class="p-3 rounded-lg bg-white/5 border border-white/5 flex justify-between items-center text-sm">
              <div>
                <span class="font-semibold">${m.home_team || m.home_placeholder} vs ${m.away_team || m.away_placeholder}</span>
                <span class="text-xs text-gray-500 block">${m.description}</span>
              </div>
              <span class="text-xs text-gray-400">${m.date}</span>
            </div>
          `).join('')}
        </div>
      `;
    }

    wrapper.innerHTML = contentHtml;
    this.container.appendChild(wrapper);
  }
}
