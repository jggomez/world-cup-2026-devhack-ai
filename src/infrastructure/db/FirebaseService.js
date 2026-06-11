import { DataLoader } from './DataLoader.js';

export class FirebaseService {
  constructor() {
    this.listeners = {};
    this.standingsCache = null;
  }

  subscribe(collectionName, callback) {
    if (!this.listeners[collectionName]) {
      this.listeners[collectionName] = [];
    }
    this.listeners[collectionName].push(callback);
    return () => {
      this.listeners[collectionName] = this.listeners[collectionName].filter(cb => cb !== callback);
    };
  }

  async getStandings() {
    if (this.standingsCache) return this.standingsCache;
    const groupsData = await DataLoader.loadGroups();
    this.standingsCache = groupsData;
    return this.standingsCache;
  }

  async getMatchesByGroup(groupLetter) {
    return await DataLoader.loadGroupMatches(groupLetter);
  }

  async getKnockoutStage(stageName) {
    return await DataLoader.loadKnockoutStage(stageName);
  }
}

export const firebaseService = new FirebaseService();
