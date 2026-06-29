# Statistical Agent — Monte Carlo Poisson Simulation

## Propósito

El **Statistical Agent** es un agente ADK que se ejecuta en la secuencia del pipeline de predicción de partidos del Mundial 2026. Se ubica **entre** el Research Agent y el Analyst Agent para proporcionar una base estadística cuantitativa a las predicciones basadas en IA.

Utiliza una **simulación Monte Carlo de 100,000 ensayos** con distribuciones de Poisson calibradas a partir de los promedios de goles reales del torneo.

---

## Posición en la cadena de agentes

```
[Researcher Agent]
       ↓
       Research report (form, H2H, group context, injuries)
       ↓
[Statistical Agent]   ← NUEVO
       ↓
       Monte Carlo results (λ params, outcome probabilities, scorelines, scenarios)
       ↓
[Analyst Agent]
       ↓
       Structured prediction (blends qualitative + quantitative evidence)
       ↓
   [Critic Agent] → [Refiner Agent]   ← (si predicción es dudosa)
```

---

## Modelo estadístico

### Calibración de lambdas (Dixon-Coles inspired)

Para cada partido se calculan dos parámetros Poisson (λ):

```
attack_strength  = avg_scored_team / league_avg_goals
defence_strength = avg_conceded_team / league_avg_goals

λ_home = home_attack * away_defence * league_avg * (1 + home_advantage)
λ_away = away_attack * home_defence * league_avg
```

- **`league_avg_goals`**: Promedio del torneo (default 1.35 goles/equipo/partido)
- **`home_advantage`**: Factor multiplicativo de ventaja local (default 0.10 = 10%)
- Lambdas se limitan al rango [0.3, 5.0] para partidos del Mundial

### Simulación Monte Carlo

- **N = 100,000 ensayos** (configurable)
- En cada ensayo se samplea `home_goals ~ Poisson(λ_home)` y `away_goals ~ Poisson(λ_away)` de forma independiente
- Se acumulan contadores de victoria local, empate, victoria visitante y distribución de marcadores exactos

### Métricas producidas

| Métrica | Descripción |
|---|---|
| `lambda_home / lambda_away` | Parámetros Poisson calibrados |
| `home_win_prob` | P(goles_local > goles_visitante) empírica |
| `draw_prob` | P(goles_local = goles_visitante) empírica |
| `away_win_prob` | P(goles_local < goles_visitante) empírica |
| `expected_home_goals` | Media de goles locales en simulación |
| `expected_away_goals` | Media de goles visitantes en simulación |
| `most_likely_scorelines` | Top 10 marcadores exactos con probabilidades |
| `home/away_goal_distribution` | PMF Poisson exacta para 0-7 goles |
| `scenarios` | 3 escenarios estructurados: lógico, disputado, sorpresa |

---

## Archivos clave

```
analyst_service/
└── app/
    └── agents/
        ├── monte_carlo.py      # Motor de simulación (Python puro, sin dependencias externas)
        ├── statistical.py      # ADK Agent wrapper
        └── analyst.py          # Orquestador actualizado con statistician en la secuencia
tests/
└── test_monte_carlo.py         # 28 tests unitarios (todos pasan)
```

---

## Tests

```bash
cd analyst_service
uv run python -m pytest ../tests/test_monte_carlo.py -v
# 28 passed in ~12s
```

Cobertura:
- Propiedades axiomáticas de la PMF Poisson
- Calibración de lambdas (ventaja local, equipos fuertes/débiles)
- Probabilidades suman 1.0 (con tolerancia 1%)
- Reproducibilidad con semilla fija
- Distribución de marcadores ordenada correctamente
- Escenarios generados correctamente
- Serialización JSON
- Escenario realista: Inglaterra vs RD Congo

---

## Ejemplo de salida (Colombia 0-0 Portugal en grupo)

```python
run_monte_carlo_simulation(
    home_avg_scored=1.0,    # Colombia: 3 goles en 3 partidos
    home_avg_conceded=0.33, # Colombia: 1 gol en contra en 3 partidos
    away_avg_scored=1.67,   # Portugal: 5 goles en 3 partidos
    away_avg_conceded=0.67, # Portugal: 2 goles en contra en 3 partidos
    n_simulations=200_000,
)
```

Resultado:
```json
{
  "lambda_home": 0.5459,
  "lambda_away": 0.4082,
  "home_win_prob": 0.310,
  "draw_prob": 0.476,
  "away_win_prob": 0.214,
  "most_likely_scorelines": [
    {"home_score": 0, "away_score": 0, "probability": 0.385},
    {"home_score": 1, "away_score": 0, "probability": 0.211},
    {"home_score": 0, "away_score": 1, "probability": 0.157}
  ]
}
```

Nota: El empate 0-0 del partido real coincide con el escenario "lógico" del modelo. ✅
