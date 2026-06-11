import { Analysis } from '../../domain/entities/Prediction.js';
import { CONFIG } from '../AppConfig.js';
import { initializeApp } from 'firebase/app';
import { getAI, getGenerativeModel, GoogleAIBackend, ResponseModality, InferenceMode } from 'firebase/ai';

let clientApp = null;
let clientAI = null;
let clientModel = null;
let chatModel = null;
let activeChatLang = null;

function getClientModel() {
  if (!clientModel) {
    clientApp = initializeApp(CONFIG.firebase);
    clientAI = getAI(clientApp, { backend: new GoogleAIBackend() });
    clientModel = getGenerativeModel(clientAI, {
      model: "gemini-3.1-flash-image-preview",
      generationConfig: {
        responseModalities: [ResponseModality.TEXT, ResponseModality.IMAGE],
      },
    });
  }
  return clientModel;
}

function getChatModel() {
  const currentLang = (typeof document !== 'undefined' && document.documentElement.lang) || 'es';
  if (!chatModel || activeChatLang !== currentLang) {
    if (!clientApp) {
      clientApp = initializeApp(CONFIG.firebase);
      clientAI = getAI(clientApp, { backend: new GoogleAIBackend() });
    }
    activeChatLang = currentLang;
    const systemPrompt = currentLang === 'en' ?
      "You are an expert assistant for the FIFA Soccer World Cup. You are only allowed to answer questions about soccer world cup topics, historic players, teams, and tournament news. If the user's query is not related to the soccer world cup or soccer/football in general, you must respond politely explaining that you are only allowed to answer topics related to the soccer world cup. Respond in English." :
      "Eres un asistente experto en el Mundial de Fútbol de la FIFA. Solo tienes permitido responder preguntas sobre temas del mundial de fútbol, jugadores históricos, equipos y últimas noticias del mundial. Si la consulta del usuario no está relacionada con el mundial de fútbol o fútbol en general, debes responder de manera amable explicando que solo tienes permitido responder sobre temas del mundial de fútbol. Responde en Español.";

    chatModel = getGenerativeModel(clientAI, {
      mode: InferenceMode.PREFER_IN_CLOUD,
      inCloudParams: {
        model: "gemini-3.5-flash",
        systemInstruction: systemPrompt,
        tools: [{ googleSearch: {} }]
      },
      onDeviceParams: {
        model: "gemini-3.5-flash",
        systemInstruction: systemPrompt
      }
    });
  }
  return chatModel;
}

export class FirebaseAILogic {
  static startChatSession(history = []) {
    const model = getChatModel();
    return model.startChat({
      history,
      generationConfig: {
        maxOutputTokens: 2048,
      }
    });
  }

  static async urlToBase64(url) {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  static async transformUserPhoto(file, { alias, teamName, position, height, weight }) {
    const model = getClientModel();
    const currentLang = (typeof document !== 'undefined' && document.documentElement.lang) || 'es';
    
    // Map position code to jersey number
    let jerseyNumber = "10";
    if (position === "DEF") {
      jerseyNumber = "2";
    } else if (position === "MED") {
      jerseyNumber = "10";
    } else if (position === "DEL") {
      jerseyNumber = "9";
    } else if (position === "POR") {
      jerseyNumber = "1";
    }

    // Choose labels dynamically based on selected language
    const isEn = currentLang === 'en';
    const labelStyle = isEn ? 
      "High-resolution professional sports graphic with clean digital UI/UX elements, metallic gold framing, and a deep red and gold color palette." : 
      "High-resolution professional sports graphic with clean digital UI/UX elements, metallic gold framing, and a deep blue color palette.";
    const labelPosition = isEn ? "POSITION" : "POSICIÓN";
    const labelHeight = isEn ? "HEIGHT" : "ESTATURA";
    const labelWeight = isEn ? "WEIGHT" : "PESO";
    const labelSelection = isEn ? "TEAM" : "SELECCIÓN";

    // Map position to role label and icon
    let labelScorer = "GOLEADOR";
    let roleIcon = "a small goal net icon";
    if (position === "DEF") {
      labelScorer = isEn ? "ENFORCER" : "LEÑADOR";
      roleIcon = "a small shield icon";
    } else if (position === "MED") {
      labelScorer = isEn ? "PLAYMAKER" : "CRACK";
      roleIcon = "a small magic spark icon";
    } else if (position === "DEL") {
      labelScorer = isEn ? "SCORER" : "GOLEADOR";
      roleIcon = "a small goal net icon";
    } else if (position === "POR") {
      labelScorer = isEn ? "SHOT STOPPER" : "ATAJADOR";
      roleIcon = "a small goalkeeper gloves icon";
    }

    // Load the base card template image
    let baseImgB64 = '';
    try {
      baseImgB64 = await this.urlToBase64('resources/foto-card.png');
    } catch (e) {
      console.warn("Could not fetch resources/foto-card.png for AI editing, proceeding with player photo only:", e);
    }

    const userImgB64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const prompt = `### High-End Football Player Profile - ${teamName}

A premium digital social media asset for a high-end football player card.

**Style:** ${labelStyle}

**Subject:** A photorealistic central figure of the person from image_1 (preserving their exact facial features, hair, skin tone, facial structure, expression, gender, and likeness with absolute fidelity). The face must be extremely faithful to the source portrait in image_1, making the player instantly recognizable as the exact same person. The face should be seamlessly integrated into the base template card shown in image_0, replacing the placeholder player face. The person must be wearing the official jersey of ${teamName} in its official national colors (or goalkeeper jersey if the position is Goalkeeper), with the jersey number "${jerseyNumber}" clearly and cleanly printed on the center of the chest. The jersey must also feature the official national football team crest of ${teamName} and a modern sports brand logo (like Nike or Adidas) on the chest. The player is in an identical arms-crossed pose, but with a bare wrist and forearm (no watch).

**Background:** A detailed, packed football stadium background with blurred spectators, large ${teamName} flags in their official national colors, and bright floodlights.

**Data Panels & UI (with all specific data and logos):**
* **Top Left (Metallic Gold Frame):** A highly detailed FIFA World Cup trophy with clear "FIFA WORLD CUP" text.
* **Top Right:** The official national football team crest of ${teamName}, and stylized brushstroke text "${teamName}" below it.
* **Left Vertical Panel (Metallic Gold Trim):** Detailed icon graphics:
    * Tactical diagram for "${labelPosition} ${position}" with jersey number "${jerseyNumber}".
    * Ruler icon for "${labelHeight} ${height}".
    * Weight scale icon for "${labelWeight} ${weight}".
    * The official national flag of ${teamName}.
* **Bottom Left:** Text: "${labelScorer}" with ${roleIcon}, above a larger "FIFA® OFFICIAL PLAYER" logo.
* **Bottom Central Panel (Pronounced Metallic Shield):**
    * Main name in large, bold text: "${alias.toUpperCase()}".
    * Below it, title text: "${position} / ${labelSelection} ${teamName} #${jerseyNumber}".
    * At the base, an elegant gold script signature: "${alias}".
* **Bottom Right:** A close-up of a tactical whiteboard with detailed diagrams and a marker pen.

**Details:** Clean edge work, premium textures (shirt fabric, metal, screen), and high-fidelity rendering for all text and numbers. Make sure the color theme of the card UI accentuates and matches the official primary colors of the country of ${teamName}.`;

    const parts = [prompt];
    if (baseImgB64) {
      parts.push({
        inlineData: {
          data: baseImgB64,
          mimeType: 'image/png'
        }
      });
    }
    parts.push({
      inlineData: {
        data: userImgB64,
        mimeType: file.type
      }
    });

    const result = await model.generateContent(parts);

    try {
      const inlineDataParts = result.response.inlineDataParts();
      if (inlineDataParts?.[0]) {
        const image = inlineDataParts[0].inlineData;
        return `data:${image.mimeType};base64,${image.data}`;
      }
    } catch (err) {
      console.error('Prompt or candidate was blocked:', err);
      throw err;
    }
    throw new Error("No image was returned from the generative model.");
  }


  static async analyzeMatch(matchId, homeTeamCode, awayTeamCode) {
    try {
      // 1. Try to fetch from the Cloud Run analyst service URL
      const response = await fetch(`${CONFIG.analystServiceUrl}/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          match_id: matchId,
          home_team: homeTeamCode,
          away_team: awayTeamCode,
          language: (typeof document !== 'undefined' && document.documentElement.lang) || 'es'
        })
      });

      if (response.ok) {
        const data = await response.json();
        const analysis = new Analysis(
          data.match_id,
          data.recent_form,
          data.h2h_record,
          data.suggested_outcome,
          data.estimated_score,
          data.context_summary
        );
        analysis.options = data.options; // Attach 3 options with scores
        return analysis;
      }
      throw new Error(`Servicio respondió con código: ${response.status}`);
    } catch (e) {
      console.error("AI analyst service error:", e);
      throw new Error("No se puede realizar la predicción en este momento. Inténtalo más tarde.");
    }
  }

  static async searchConversational(query) {
    try {
      // 1. Try to fetch from the Cloud Run search service URL
      const response = await fetch(`${CONFIG.analystServiceUrl}/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query,
          language: (typeof document !== 'undefined' && document.documentElement.lang) || 'es'
        })
      });

      if (response.ok) {
        const data = await response.json();
        return data.answer;
      }
      console.warn("Cloud Run search service responded with error status:", response.status);
    } catch (e) {
      console.warn("Could not reach Cloud Run search service:", e.message);
    }

    // 2. Local fallback: Run the local Python ADK search agent if in Node.js
    if (typeof window === 'undefined') {
      return new Promise((resolve) => {
        import('child_process').then(({ execFile }) => {
          import('path').then(({ resolve: pathResolve }) => {
            const scriptPath = pathResolve('analyst_service/run_agent.py');
            const env = {
              ...process.env
            };

            execFile('uv', ['run', 'python3', scriptPath, 'search', query], { env }, (error, stdout, stderr) => {
              if (error) {
                console.error("Search local agent error:", stderr);
                resolve("Lo siento, hubo un error al procesar tu búsqueda mundialista.");
                return;
              }
              resolve(stdout.trim());
            });
          });
        });
      });
    }

    // 3. Fallback to mock answer in the browser
    return `[Conversational Search Mock] Has buscado: "${query}". Para respuestas reales, ejecuta en un entorno habilitado para Node.js o despliega la micro-api.`;
  }
}
