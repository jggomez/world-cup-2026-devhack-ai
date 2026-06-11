export class Team {
  constructor(code, name, group, badgeUrl = '', flagSvgUrl = '') {
    this.code = code;
    this.name = name;
    this.group = group;
    this.badgeUrl = badgeUrl;
    this.flagSvgUrl = flagSvgUrl;
  }
}

export class GroupStanding {
  constructor(teamCode) {
    this.teamCode = teamCode;
    this.points = 0;
    this.played = 0;
    this.wins = 0;
    this.draws = 0;
    this.losses = 0;
    this.goalsFor = 0;
    this.goalsAgainst = 0;
    this.goalDifference = 0;
  }

  addMatch(goalsFor, goalsAgainst) {
    this.played += 1;
    this.goalsFor += goalsFor;
    this.goalsAgainst += goalsAgainst;
    this.goalDifference = this.goalsFor - this.goalsAgainst;

    if (goalsFor > goalsAgainst) {
      this.wins += 1;
      this.points += 3;
    } else if (goalsFor === goalsAgainst) {
      this.draws += 1;
      this.points += 1;
    } else {
      this.losses += 1;
    }
  }

  static calculateStandings(teams, matches) {
    const standingsMap = {};
    teams.forEach(team => {
      standingsMap[team.code] = new GroupStanding(team.code);
    });

    matches.forEach(match => {
      if (match.score && typeof match.score.home === 'number' && typeof match.score.away === 'number') {
        const homeCode = (match.home_team && typeof match.home_team === 'object') ? match.home_team.code : (match.home_team || match.home_placeholder);
        const awayCode = (match.away_team && typeof match.away_team === 'object') ? match.away_team.code : (match.away_team || match.away_placeholder);
        
        const homeStanding = standingsMap[homeCode];
        const awayStanding = standingsMap[awayCode];
        
        if (homeStanding && awayStanding) {
          homeStanding.addMatch(match.score.home, match.score.away);
          awayStanding.addMatch(match.score.away, match.score.home);
        }
      }
    });

    return Object.values(standingsMap).sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      return b.goalsFor - a.goalsFor;
    });
  }
}
