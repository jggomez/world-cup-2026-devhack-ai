import { DataLoader } from './infrastructure/db/DataLoader.js';
import { GroupStanding } from './domain/entities/Team.js';

async function test() {
  try {
    const groups = await DataLoader.loadGroups();
    const groupMatches = await DataLoader.loadGroupMatches('A');
    const groupA = groups.groups.Group_A;
    
    console.log("Loading Group A Teams:", groupA.teams.map(t => t.name));
    console.log("Loading Group A Matches count:", groupMatches.matches.length);

    const standings = GroupStanding.calculateStandings(groupA.teams, groupMatches.matches);
    console.log("Calculated Standings:");
    standings.forEach((s, idx) => {
      const team = groupA.teams.find(t => t.code === s.teamCode);
      console.log(`${idx + 1}. ${team.name} (${s.teamCode}) - PTS: ${s.points}, PJ: ${s.played}, DG: ${s.goalDifference}`);
    });
  } catch (err) {
    console.error("Test failed:", err);
  }
}

test();
