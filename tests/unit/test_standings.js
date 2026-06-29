import { DataLoader } from '../../src/infrastructure/db/DataLoader.js';
import { GroupStanding } from '../../src/domain/entities/Team.js';

async function testGroup(groupLetter) {
  const groups = await DataLoader.loadGroups();
  const groupMatches = await DataLoader.loadGroupMatches(groupLetter);
  const group = groups.groups[`Group_${groupLetter}`];
  
  console.log(`\n--- Clasificación del Grupo ${groupLetter} ---`);
  console.log("Equipos:", group.teams.map(t => t.name).join(', '));
  console.log("Cantidad de partidos:", groupMatches.matches.length);
  
  const standings = GroupStanding.calculateStandings(group.teams, groupMatches.matches);
  standings.forEach((s, idx) => {
    const team = group.teams.find(t => t.code === s.teamCode);
    console.log(`${idx + 1}. ${team.name} (${s.teamCode}) - PTS: ${s.points}, PJ: ${s.played}, DG: ${s.goalDifference} (G: ${s.wins}, E: ${s.draws}, P: ${s.losses}, GF: ${s.goalsFor}, GC: ${s.goalsAgainst})`);
  });
}

async function test() {
  try {
    for (const groupLetter of ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']) {
      await testGroup(groupLetter);
    }
  } catch (err) {
    console.error("Test failed:", err);
  }
}

test();
