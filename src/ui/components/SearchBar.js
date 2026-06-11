export class SearchBar {
  constructor(containerElement, onQuerySubmit) {
    this.container = containerElement;
    this.onQuerySubmit = onQuerySubmit;
    this.placeholders = [
      '¿Cuál es la capacidad del Estadio Azteca?',
      '¿Qué partidos se juegan en Monterrey?',
      '¿Cuántos espectadores caben en el SoFi Stadium?'
    ];
    this.currentPlaceholderIdx = 0;
  }

  render() {
    this.container.innerHTML = `
      <div class="glass-panel p-4 mb-6">
        <form id="search-form" class="flex gap-2">
          <input type="text" id="search-input" placeholder="${this.placeholders[0]}" class="flex-1 p-3 rounded-lg bg-black/40 border border-white/10 text-white font-medium focus:outline-none focus:border-amber-400/50">
          <button type="submit" class="px-6 py-3 rounded-lg bg-amber-400 text-black font-bold hover:bg-amber-300 transition shadow">Buscar</button>
        </form>
      </div>
    `;

    const input = this.container.querySelector('#search-input');
    setInterval(() => {
      this.currentPlaceholderIdx = (this.currentPlaceholderIdx + 1) % this.placeholders.length;
      if (input) {
        input.placeholder = this.placeholders[this.currentPlaceholderIdx];
      }
    }, 4000);

    this.container.querySelector('#search-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const val = input.value.trim();
      if (val) {
        this.onQuerySubmit(val);
      }
    });
  }
}
