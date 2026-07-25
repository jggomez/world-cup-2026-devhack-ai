/**
 * Represents a FIFA World Cup match domain entity.
 */
export class Match {
  /**
   * @param {string} matchId - Unique match identifier
   * @param {number|string} matchNumber - Sequential match number
   * @param {string} date - ISO date string (YYYY-MM-DD)
   * @param {string} stadiumId - Identifier for the venue
   * @param {string} city - Host city name
   * @param {object|string} homeTeam - Home team entity or name
   * @param {object|string} awayTeam - Away team entity or name
   * @param {object|null} [score=null] - Match score state
   * @param {string} [description=''] - Optional match metadata description
   * @param {string} [stage='Group Stage'] - Tournament stage (e.g. Group Stage, Round of 32, Final)
   */
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

  /**
   * Checks whether the match is completed with valid recorded scores.
   * @returns {boolean}
   */
  isCompleted() {
    return Boolean(
      this.score &&
      this.score.status === 'COMPLETED' &&
      typeof this.score.home === 'number' &&
      typeof this.score.away === 'number'
    );
  }

  /**
   * Checks whether the match ended in a draw.
   * @returns {boolean}
   */
  isDraw() {
    return this.isCompleted() && this.score.home === this.score.away;
  }

  /**
   * Checks if the match has not yet started.
   * @returns {boolean}
   */
  isScheduled() {
    return !this.score || this.score.status === 'SCHEDULED';
  }

  /**
   * Gets the winning team entity/name if the match is completed.
   * @returns {object|string|null} Winning team or null if draw / not completed.
   */
  getWinner() {
    if (!this.isCompleted()) return null;
    if (this.score.home > this.score.away) return this.homeTeam;
    if (this.score.away > this.score.home) return this.awayTeam;
    return null;
  }

  /**
   * Safely update the match score and status.
   * @param {number} home 
   * @param {number} away 
   * @param {string} [status='COMPLETED'] 
   */
  updateScore(home, away, status = 'COMPLETED') {
    if (typeof home !== 'number' || home < 0 || typeof away !== 'number' || away < 0) {
      throw new TypeError('Scores must be non-negative numbers.');
    }
    this.score = { home, away, status };
  }
}
