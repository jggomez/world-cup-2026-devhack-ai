# API Contract: AI Match Prediction Payload

This contract specifies the structured output schema delivered by the Firebase AI Logic service (using Gemini 3 Flash) when the user clicks "Consult the Analyst".

---

## Endpoint / Service Schema

* **Source**: Firebase Function or AI Agent payload.
* **Format**: JSON (Structured Output)

### Schema Definition

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "match_id": { "type": "string" },
    "recent_form": {
      "type": "object",
      "properties": {
        "home": { "type": "array", "items": { "type": "string", "enum": ["W", "D", "L"] } },
        "away": { "type": "array", "items": { "type": "string", "enum": ["W", "D", "L"] } }
      },
      "required": ["home", "away"]
    },
    "h2h_record": {
      "type": "object",
      "properties": {
        "played": { "type": "integer" },
        "home_wins": { "type": "integer" },
        "away_wins": { "type": "integer" },
        "draws": { "type": "integer" }
      },
      "required": ["played", "home_wins", "away_wins", "draws"]
    },
    "suggested_outcome": {
      "type": "string",
      "enum": ["HOME_WIN", "DRAW", "AWAY_WIN"]
    },
    "estimated_score": {
      "type": "object",
      "properties": {
        "home": { "type": "integer", "minimum": 0 },
        "away": { "type": "integer", "minimum": 0 }
      },
      "required": ["home", "away"]
    },
    "context_summary": {
      "type": "string",
      "description": "A well-argued, concise breakdown of the matchup form and context."
    }
  },
  "required": [
    "match_id",
    "recent_form",
    "h2h_record",
    "suggested_outcome",
    "estimated_score",
    "context_summary"
  ]
}
```
