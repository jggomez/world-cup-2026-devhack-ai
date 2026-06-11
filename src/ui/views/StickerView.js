import { Sticker } from '../../domain/entities/Sticker.js';
import { CameraService } from '../../infrastructure/media/CameraService.js';
import { StickerCardRenderer } from '../../resources/StickerCardRenderer.js';
import { FirebaseAILogic } from '../../infrastructure/ai/FirebaseAILogic.js';
import { TRANSLATIONS } from '../../infrastructure/lang/TranslationDict.js';

export class StickerView {
  constructor(containerElement, teamsList) {
    this.container = containerElement;
    this.teamsList = teamsList;
    this.cameraService = new CameraService();
    this.stickerCanvas = null;
  }

  render() {
    const lang = ((typeof document !== 'undefined' && document.documentElement.lang) || 'es') === 'en' ? 'en' : 'es';
    const dict = TRANSLATIONS[lang];

    this.container.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div class="glass-panel">
          <h3 class="text-xl font-bold mb-4">${dict.stick_title}</h3>
          
          <div class="flex flex-col gap-4">
            <div>
              <label class="block text-xs text-gray-400 font-semibold mb-1">${dict.stick_alias}</label>
              <input type="text" id="sticker-alias" placeholder="${dict.stick_alias_placeholder}" class="w-full p-3 rounded bg-black/40 border border-white/10 text-white">
            </div>
            
            <div>
              <label class="block text-xs text-gray-400 font-semibold mb-1">${dict.stick_team}</label>
              <select id="sticker-team" class="w-full p-3 rounded bg-black/40 border border-white/10 text-white">
                ${this.teamsList.map(team => `<option value="${team.code}">${team.name}</option>`).join('')}
              </select>
            </div>

            <div>
              <label class="block text-xs text-gray-400 font-semibold mb-1">${dict.stick_pos}</label>
              <select id="sticker-pos" class="w-full p-3 rounded bg-black/40 border border-white/10 text-white">
                <option value="DEL">${dict.stick_pos_del}</option>
                <option value="MED">${dict.stick_pos_med}</option>
                <option value="DEF">${dict.stick_pos_def}</option>
                <option value="POR">${dict.stick_pos_por}</option>
              </select>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs text-gray-400 font-semibold mb-1">${dict.stick_height}</label>
                <input type="text" id="sticker-height" placeholder="e.g. 1.80 m" class="w-full p-3 rounded bg-black/40 border border-white/10 text-white">
              </div>
              
              <div>
                <label class="block text-xs text-gray-400 font-semibold mb-1">${dict.stick_weight}</label>
                <input type="text" id="sticker-weight" placeholder="e.g. 75 kg" class="w-full p-3 rounded bg-black/40 border border-white/10 text-white">
              </div>
            </div>

            <div>
              <label class="block text-xs text-gray-400 font-semibold mb-1">${dict.stick_photo}</label>
              <input type="file" id="file-photo" accept="image/*" class="w-full text-sm text-gray-400">
            </div>

            <button id="generate-sticker-btn" class="w-full py-3 rounded-xl bg-amber-400 text-black font-bold hover:bg-amber-300 transition">${dict.stick_btn_gen}</button>
          </div>
        </div>

        <div class="glass-panel flex flex-col items-center justify-center">
          <div id="preview-canvas-container" class="w-full max-w-[320px] aspect-[2/3] bg-black/40 rounded-xl relative overflow-hidden flex items-center justify-center p-2">
            <canvas id="sticker-canvas" width="480" height="720" class="max-w-full max-h-full object-contain rounded-lg shadow-lg"></canvas>
            <div id="preview-loading" class="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-3 opacity-0 pointer-events-none transition-opacity duration-300">
              <div class="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
              <p class="text-xs text-amber-400 font-bold uppercase tracking-wider animate-pulse">${dict.stick_btn_loading}</p>
            </div>
          </div>
          <button id="download-sticker-btn" class="mt-4 px-6 py-2 rounded bg-blue-600 text-white font-bold hover:bg-blue-500 transition shadow hidden">${dict.stick_btn_dl}</button>
        </div>
      </div>
    `;

    this.stickerCanvas = this.container.querySelector('#sticker-canvas');
    this.container.querySelector('#generate-sticker-btn').addEventListener('click', () => this.generate());
    this.container.querySelector('#download-sticker-btn').addEventListener('click', () => this.download());
    
    // Draw default sample preview on load
    this.drawDefaultSample();
  }

  async drawDefaultSample() {
    const isEn = ((typeof document !== 'undefined' && document.documentElement.lang) || 'es') === 'en';
    // Use empty alias so no placeholder text is drawn on top of the card template image.
    // The user will see a clean template until they fill in the form and generate their card.
    const sampleSticker = new Sticker(
      "sample",
      "MEX",
      "", // Empty photo shows the card template layout
      "", // Empty alias — avoids "TU NOMBRE" text rendering over the template image
      "DEL",
      "1.80 m",
      "75 kg"
    );
    await StickerCardRenderer.drawSticker(this.stickerCanvas, sampleSticker, isEn ? "Mexico" : "México", "", "");
  }

  async generate() {
    const generateBtn = this.container.querySelector('#generate-sticker-btn');
    const previewLoading = this.container.querySelector('#preview-loading');
    const originalBtnText = generateBtn.textContent;
    generateBtn.disabled = true;
    generateBtn.textContent = 'Transformando foto con IA...';
    
    previewLoading.classList.remove('opacity-0', 'pointer-events-none');
    previewLoading.classList.add('opacity-100');

    try {
      const alias = this.container.querySelector('#sticker-alias').value || 'Fanático';
      const teamCode = this.container.querySelector('#sticker-team').value;
      const position = this.container.querySelector('#sticker-pos').value;
      const height = this.container.querySelector('#sticker-height').value || '1.80 m';
      const weight = this.container.querySelector('#sticker-weight').value || '75 kg';
      const photoInput = this.container.querySelector('#file-photo');

      const team = this.teamsList.find(t => t.code === teamCode);
      const teamName = team ? team.name : teamCode;

      let photoUrl = '';
      if (photoInput.files && photoInput.files[0]) {
        try {
          photoUrl = await FirebaseAILogic.transformUserPhoto(photoInput.files[0], {
            alias,
            teamName,
            position,
            height,
            weight
          });
        } catch (aiErr) {
          console.error("AI photo transformation failed, falling back to local photo preview:", aiErr);
          photoUrl = URL.createObjectURL(photoInput.files[0]);
        }
      }

      const sticker = new Sticker(Date.now().toString(), teamCode, photoUrl, alias, position, height, weight);
      
      await StickerCardRenderer.drawSticker(this.stickerCanvas, sticker, teamName, '', '');

      this.container.querySelector('#download-sticker-btn').classList.remove('hidden');
    } catch (e) {
      console.error("Error generating sticker:", e);
      alert("Error al generar la estampa: " + e.message);
    } finally {
      generateBtn.disabled = false;
      generateBtn.textContent = originalBtnText;
      previewLoading.classList.remove('opacity-100');
      previewLoading.classList.add('opacity-0', 'pointer-events-none');
    }
  }

  download() {
    const link = document.createElement('a');
    link.download = `sticker_${Date.now()}.png`;
    link.href = this.stickerCanvas.toDataURL('image/png');
    link.click();
  }
}
