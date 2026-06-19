import { DataLoader } from '../../src/infrastructure/db/DataLoader.js';

async function run() {
  try {
    console.log("Loading group matches...");
    const alphabet = 'ABCDEFGHIJKL'.split('');
    const matchesPromises = alphabet.map(letter => DataLoader.loadGroupMatches(letter));
    const allGroupsMatches = await Promise.all(matchesPromises);
    
    let flatGroupMatches = [];
    alphabet.forEach((letter, idx) => {
      flatGroupMatches = flatGroupMatches.concat(allGroupsMatches[idx].matches);
    });
    
    console.log(`Loaded ${flatGroupMatches.length} group stage matches.`);
    
    console.log("Loading knockout stages...");
    const stages = ['round-of-32', 'round-of-16', 'quarterfinals', 'semifinals', 'final'];
    const loadedKnockouts = await Promise.all(
      stages.map(stageId => DataLoader.loadKnockoutStage(stageId))
    );
    
    let allKnockoutMatches = [];
    loadedKnockouts.forEach((stageData, index) => {
      const stageId = stages[index];
      let matches = [];
      
      if (stageData.matches) {
        matches = stageData.matches;
      } else if (stageData.match_details) {
        matches = [stageData.match_details];
      } else if (stageData.tournament_conclusion) {
        const conclusion = stageData.tournament_conclusion;
        if (stageId === 'quarterfinals' && conclusion.quarter_finals) {
          matches = conclusion.quarter_finals.matches || [];
          if (conclusion.third_place && conclusion.third_place.matches) {
            matches = matches.concat(conclusion.third_place.matches);
          }
        } else if (stageId === 'semifinals' && conclusion.semi_finals) {
          matches = conclusion.semi_finals.matches || [];
        } else if (stageId === 'final' && conclusion.final) {
          matches = conclusion.final.matches || [];
        }
      }
      allKnockoutMatches = allKnockoutMatches.concat(matches);
    });
    
    console.log(`Loaded ${allKnockoutMatches.length} knockout stage matches.`);
    
    const allMatches = flatGroupMatches.concat(allKnockoutMatches);
    console.log(`Total matches loaded: ${allMatches.length}`);
    
    // Assertions
    if (allMatches.length !== 104) {
      throw new Error(`Expected exactly 104 matches, but got ${allMatches.length}`);
    }
    
    // Verify group stage matches basic structure
    console.log("Checking group stage matches structures...");
    flatGroupMatches.forEach(m => {
      if (!m.match_id) {
        throw new Error("Group stage match is missing match_id!");
      }
      if (!m.home_team || typeof m.home_team !== 'object' || !m.home_team.name) {
        throw new Error(`Group stage match ${m.match_id} has invalid home_team object!`);
      }
      if (!m.away_team || typeof m.away_team !== 'object' || !m.away_team.name) {
        throw new Error(`Group stage match ${m.match_id} has invalid away_team object!`);
      }
    });

    // Check knockout stage match numbers (73 to 104)
    console.log("Checking knockout match numbers...");
    const knockoutMatchNumbers = allKnockoutMatches.map(m => m.match_number);
    knockoutMatchNumbers.sort((a, b) => a - b);
    
    if (knockoutMatchNumbers.length !== 32) {
      throw new Error(`Expected exactly 32 knockout matches, but got ${knockoutMatchNumbers.length}`);
    }

    for (let i = 73; i <= 104; i++) {
      if (knockoutMatchNumbers[i - 73] !== i) {
        throw new Error(`Missing or duplicated knockout match number: expected ${i}, got ${knockoutMatchNumbers[i - 73]}`);
      }
    }
    
    // Verify specific match details
    const m103 = allMatches.find(m => m.match_number === 103);
    if (!m103) {
      throw new Error("Match 103 (Third-Place play-off) not found!");
    }
    console.log(`Match 103 verified: ${m103.match_id} - ${m103.home_placeholder} vs ${m103.away_placeholder} on ${m103.date} at ${m103.city}`);
    
    const m104 = allMatches.find(m => m.match_number === 104);
    if (!m104) {
      throw new Error("Match 104 (The Final) not found!");
    }
    console.log(`Match 104 verified: ${m104.match_id} - ${m104.home_placeholder} vs ${m104.away_placeholder} on ${m104.date} at ${m104.city}`);

    console.log("\n✅ All calendar export matches verification tests passed successfully!");
  } catch (err) {
    console.error("❌ Test verification failed:", err);
    process.exit(1);
  }
}

run();
