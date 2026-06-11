export class Sticker {
  constructor(stickerId, teamCode, userPhotoUrl, userAlias, position, height, weight, nationality = '', stats = null) {
    this.stickerId = stickerId;
    this.teamCode = teamCode;
    this.userPhotoUrl = userPhotoUrl;
    this.userAlias = userAlias;
    this.position = position;
    this.height = height; // e.g. "1.80 m"
    this.weight = weight; // e.g. "75 kg"
    this.nationality = nationality; // e.g. "México"
    this.stats = stats || this.generateFictionalStats();
  }

  generateFictionalStats() {
    return {
      ritmo: Math.floor(Math.random() * 30) + 70,
      tiro: Math.floor(Math.random() * 30) + 70,
      pase: Math.floor(Math.random() * 30) + 70,
      regate: Math.floor(Math.random() * 30) + 70,
      defensa: Math.floor(Math.random() * 30) + 70,
      fisico: Math.floor(Math.random() * 30) + 70
    };
  }
}
