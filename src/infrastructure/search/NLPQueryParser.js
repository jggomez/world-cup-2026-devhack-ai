import { FirebaseClient } from '../firebase/FirebaseClient.js';

export class NLPQueryParser {
  constructor(stadiums, groupsData, matchesData) {
    this.stadiums = stadiums;
    this.groupsData = groupsData;
    this.matchesData = matchesData;
  }

  async parse(query) {
    const q = query.toLowerCase();
    
    if (q.includes('capacidad') || q.includes('capacidad oficial') || q.includes('capacity')) {
      const matchStadium = this.stadiums.find(s => q.includes(s.name.toLowerCase()) || q.includes(s.city.toLowerCase()));
      if (matchStadium) {
        FirebaseClient.logAnalyticsEvent('stadium_query', { stadium: matchStadium.name });
        return {
          type: 'stadium',
          answer: `La capacidad oficial de ${matchStadium.name} en ${matchStadium.city} es de ${matchStadium.official_capacity.toLocaleString()} espectadores.`,
          data: matchStadium
        };
      }
    }

    if (q.includes('partidos en') || q.includes('matches in') || q.includes('juegan en')) {
      const matchStadium = this.stadiums.find(s => q.includes(s.name.toLowerCase()) || q.includes(s.city.toLowerCase()) || q.includes(s.id.toLowerCase()));
      if (matchStadium) {
        const matchingMatches = this.matchesData.filter(m => m.stadium_id === matchStadium.id);
        FirebaseClient.logAnalyticsEvent('stadium_matches_query', { stadium: matchStadium.name });
        return {
          type: 'matches',
          answer: `Se juegan ${matchingMatches.length} partidos en ${matchStadium.name}.`,
          data: matchingMatches
        };
      }
    }

    // Call conversational Search Agent using ADK
    FirebaseClient.logAnalyticsEvent('conversational_search', { query: query });
    const answer = await FirebaseClient.searchConversational(query);
    return {
      type: 'conversational',
      answer: answer,
      data: null
    };
  }
}
