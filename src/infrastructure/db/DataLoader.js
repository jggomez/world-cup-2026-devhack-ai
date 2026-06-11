import { CONFIG } from '../config.js';

export class DataLoader {
  static async loadJSON(filename) {
    const path = `${CONFIG.resourcesPath}${filename}`;
    if (typeof window === 'undefined') {
      // Node.js environment (for tests/development)
      const fs = await import('fs/promises');
      const pathModule = await import('path');
      const absolutePath = pathModule.resolve(path);
      const data = await fs.readFile(absolutePath, 'utf8');
      return JSON.parse(data);
    } else {
      // Browser environment
      const response = await fetch(path);
      if (!response.ok) {
        throw new Error(`Failed to load ${filename}: ${response.statusText}`);
      }
      return await response.json();
    }
  }

  static async loadGroups() {
    return this.loadJSON('groups.json');
  }

  static async loadStadiums() {
    return this.loadJSON('stadiums.json');
  }

  static async loadGroupMatches(groupLetter) {
    const lowerLetter = groupLetter.toLowerCase();
    return this.loadJSON(`matches_group_${lowerLetter}.json`);
  }

  static async loadKnockoutStage(stageName) {
    const filenameMap = {
      'round-of-32': '16avos.json',
      'round-of-16': '8avos.json',
      'quarterfinals': '4avos.json',
      'semifinals': 'semifinals.json',
      'final': 'final.json'
    };
    const file = filenameMap[stageName.toLowerCase().replace(/_/g, '-')];
    if (!file) throw new Error(`Unknown stage name: ${stageName}`);
    return this.loadJSON(file);
  }
}
