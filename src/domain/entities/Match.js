export class Match {
  constructor(matchId, matchNumber, date, stadiumId, city, homeTeam, awayTeam, score = null, description = '', stage = 'Group Stage') {
    this.matchId = matchId;
    this.matchNumber = matchNumber;
    this.date = date;
    this.stadiumId = stadiumId;
    this.city = city;
    this.homeTeam = homeTeam;
    this.awayTeam = awayTeam;
    this.score = score || { home: null, away: null, status: 'SCHEDULED' };
    this.description = description;
    this.stage = stage;
  }

  isCompleted() {
    return this.score && this.score.status === 'COMPLETED';
  }

  getWinner() {
    if (!this.isCompleted()) return null;
    if (this.score.home > this.score.away) return this.homeTeam;
    if (this.score.away > this.score.home) return this.awayTeam;
    return null;
  }
}
