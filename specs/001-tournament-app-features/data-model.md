# Data Model: World Cup Tournament Application

This document outlines the core domain entities, fields, relationships, and state transitions.

---

## Entities

### 1. Match
Represents a fixture in the tournament.
* **Fields**:
  - `match_id` (string, unique): Primary Key (e.g., `wc2026_r32_m73`).
  - `match_number` (int): Sequence order.
  - `date` (string): Date in `YYYY-MM-DD` format.
  - `stadium_id` (string): Reference to Stadium.
  - `city` (string): Host city name.
  - `home_team` (string, nullable): Team code (e.g. `MEX`) or placeholder slug (e.g. `2A`).
  - `away_team` (string, nullable): Team code or placeholder slug.
  - `home_score` (int, nullable): Goals scored by home team.
  - `away_score` (int, nullable): Goals scored by away team.
  - `status` (string): `SCHEDULED`, `LIVE`, `COMPLETED`.
  - `stage` (string): `Group Stage`, `Round of 32`, `Round of 16`, `Quarterfinals`, `Semifinals`, `Final`.

---

### 2. Team
A participating national team.
* **Fields**:
  - `code` (string, unique): Primary Key (3-letter ISO code, e.g. `MEX`, `BRA`).
  - `name` (string): Localized name (e.g., "México", "Canada").
  - `group` (string): Group letter (A to L).
  - `badge_url` (string): Path to SVG/vector badge asset.
  - `flag_svg_url` (string): Path to the flag SVG vector asset.

---

### 3. Group Standing
Calculated standings for a team in its group.
* **Fields**:
  - `team_code` (string): Foreign key referencing Team.
  - `points` (int): Total points.
  - `played` (int): Matches played.
  - `wins` (int): Total wins.
  - `draws` (int): Total draws.
  - `losses` (int): Total losses.
  - `goals_for` (int): Goals scored.
  - `goals_against` (int): Goals conceded.
  - `goal_difference` (int): goals_for - goals_against.

---

### 4. Prediction
A user's score forecast.
* **Fields**:
  - `prediction_id` (string, unique): Primary Key.
  - `match_id` (string): Reference to Match.
  - `user_id` (string): Reference to User.
  - `predicted_home_score` (int): User predicted home goals.
  - `predicted_away_score` (int): User predicted away goals.

---

### 5. Analysis
An AI-generated matchup prediction report.
* **Fields**:
  - `match_id` (string): Primary Key / Reference to Match.
  - `recent_form` (object): Recent stats of both rivals.
  - `h2h_record` (object): Historical head-to-head records.
  - `suggested_outcome` (string): `HOME_WIN`, `DRAW`, `AWAY_WIN`.
  - `predicted_home_score` (int): Estimated score.
  - `predicted_away_score` (int): Estimated score.
  - `context_summary` (string): Commentary breakdown.

---

### 6. Sticker
A personalized digital card artifact.
* **Fields**:
  - `sticker_id` (string, unique): Primary Key.
  - `team_code` (string): Reference to Team.
  - `user_photo_url` (string): URL to uploaded photo.
  - `user_alias` (string): Fan's name.
  - `position` (string): pitch position (e.g., "FW", "MF", "DF", "GK").
  - `stats` (object): Key stats (Speed, Shooting, Passing, Dribbling, Defending, Physicality).
