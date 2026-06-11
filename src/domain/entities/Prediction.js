export class Prediction {
  constructor(predictionId, matchId, userId, predictedHomeScore, predictedAwayScore) {
    this.predictionId = predictionId;
    this.matchId = matchId;
    this.userId = userId;
    this.predictedHomeScore = predictedHomeScore;
    this.predictedAwayScore = predictedAwayScore;
  }
}

export class Analysis {
  constructor(matchId, recentForm, h2hRecord, suggestedOutcome, estimatedScore, contextSummary) {
    this.matchId = matchId;
    this.recentForm = recentForm;
    this.h2hRecord = h2hRecord;
    this.suggestedOutcome = suggestedOutcome;
    this.estimatedScore = estimatedScore;
    this.contextSummary = contextSummary;
  }
}
