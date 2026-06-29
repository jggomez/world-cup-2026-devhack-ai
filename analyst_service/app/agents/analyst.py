from google.adk.agents import Agent, BaseAgent
from google.adk.agents.callback_context import CallbackContext
from google.adk.agents.invocation_context import InvocationContext
from google.adk.events import Event
from typing import AsyncGenerator
from google.genai import types as genai_types
from app.schemas.prediction import MatchPredictionResponse
from app.agents.researcher import create_research_agent
from app.agents.statistical import create_statistical_agent


def create_structured_output_agent() -> Agent:
    return Agent(
        name="structured_output_agent",
        model="gemini-3-flash-preview",
        instruction="""
You are a professional football analyst. Read the research report and the Monte Carlo simulation
results provided for the match between {home_team} and {away_team} (match ID: {match_id}).

The research report covers: World Cup group standings, match results so far, team form, H2H,
injuries, and key context.

The Monte Carlo simulation results (stored under [MONTE CARLO SIMULATION RESULTS] in the
conversation) provide:
- Poisson λ parameters (expected goals per team based on 100,000 simulation trials)
- Statistical outcome probabilities: home win %, draw %, away win %
- Top most-likely exact scorelines with their empirical probabilities
- Three structured scenarios (logical, contested, surprise) derived from the simulation

INSTRUCTIONS:
1. Use the Monte Carlo probabilities as your PRIMARY statistical anchor for probability
   calibration. Blend them with the qualitative research context (motivation, pressure,
   group math, injuries).
2. The recent form as a list of 'W', 'D', or 'L'. Use realistic estimates if exact details
   are unavailable.
3. The H2H records (matches played, home wins, away wins, draws).
4. The overall suggested outcome and estimated score — these MUST be consistent with the
   Monte Carlo most-likely outcome unless the qualitative research strongly justifies deviation.
5. A concise context summary in the requested language (target language: {language}).
   Explicitly reference: (a) group qualification situation, (b) key motivation/pressure factors,
   (c) how the Monte Carlo stats align with or differ from qualitative expectations.
6. Exactly THREE distinct score scenarios (options) with probabilities summing to 1.0:
   - Scenario 1 (Logical): Align with Monte Carlo "logical" scenario, adjusted for context.
   - Scenario 2 (Contested): Align with Monte Carlo "contested" scenario.
   - Scenario 3 (Surprising Upset): Align with Monte Carlo "surprise" scenario.
   
   ADJUST the Monte Carlo raw probabilities using qualitative factors (e.g. team must win,
   star player injured, historic rivalry). The sum must still equal 1.0.

CRITICAL: Football is unpredictable. Do NOT make all three scenarios variations of the same
outcome. Write all text properties in the requested language (target language: {language}).
Format your response strictly adhering to the output schema.
""",
        generate_content_config=genai_types.GenerateContentConfig(
            temperature=1.0,
        ),
        output_schema=MatchPredictionResponse,
        output_key="prediction_result"
    )


def create_critic_agent() -> Agent:
    return Agent(
        name="critic_agent",
        model="gemini-3-flash-preview",
        instruction="""
You are an expert critic and sports evaluator. Review the research report, the Monte Carlo
simulation results, and the candidate prediction for the match between {home_team} and {away_team}.

The prediction has been flagged as "doubtful" because the probabilities for the scenarios are
too close and uncertain.

Analyze:
1. Whether the predicted probabilities deviate too much from the Monte Carlo statistical baseline.
2. If there is a bias — are we underestimating home/away advantage?
3. If group standings/qualification motivation has been overlooked.
4. If the Monte Carlo simulation's top scorelines were properly considered.

Point out specifically:
1. If the suggested outcome is too conservative relative to the simulation.
2. If any team has a clear motivation advantage (e.g. must win) that should push their
   probability higher than what the pure stats suggest.
3. Suggest concrete adjustments to the probabilities and score scenarios.

Write your critique in the requested language (target language: {language}).
""",
        output_key="critic_feedback"
    )


def create_refiner_agent() -> Agent:
    return Agent(
        name="refiner_agent",
        model="gemini-3-flash-preview",
        instruction="""
You are a professional football analyst. Read the original research, the Monte Carlo simulation
results, the candidate prediction, and the critic's feedback.

Your goal is to produce a refined, decisive, and statistically grounded forecast for
{home_team} vs {away_team}.

Key requirements:
1. Refined recent form (W/D/L list for each team).
2. Refined H2H records.
3. Refined suggested outcome and estimated score — must be consistent with both Monte Carlo
   probabilities and qualitative context.
4. A concise context summary incorporating Monte Carlo evidence and critic's observations.
5. Exactly THREE distinct score scenarios with probabilities summing to 1.0.
   Use the Monte Carlo "logical", "contested", "surprise" scaffolding as starting points,
   then apply critic's recommended adjustments.

Write all text values in the requested language (target language: {language}).
Format your response strictly adhering to the output schema.
""",
        generate_content_config=genai_types.GenerateContentConfig(
            temperature=1.0,
        ),
        output_schema=MatchPredictionResponse,
        output_key="prediction_result"
    )


class ConditionalAnalystOrchestrator(BaseAgent):
    researcher: BaseAgent
    statistician: BaseAgent
    analyst: BaseAgent
    critic: BaseAgent
    refiner: BaseAgent

    async def _run_async_impl(
        self, ctx: InvocationContext
    ) -> AsyncGenerator[Event, None]:
        # 1. Run researcher — gathers qualitative context, form, H2H, group math
        print("[ORCHESTRATOR] Step 1/5: Running Research Agent...")
        async for event in self.researcher.run_async(ctx):
            yield event

        # 2. Run statistical agent — Monte Carlo Poisson simulation
        print("[ORCHESTRATOR] Step 2/5: Running Statistical Agent (Monte Carlo)...")
        async for event in self.statistician.run_async(ctx):
            yield event

        # 3. Run analyst — blends research + Monte Carlo into structured prediction
        print("[ORCHESTRATOR] Step 3/5: Running Analyst Agent...")
        async for event in self.analyst.run_async(ctx):
            yield event

        # 4. Check if prediction is doubtful (max prob <= 0.60)
        prediction_result = ctx.session.state.get("prediction_result")
        if not prediction_result:
            print("[ORCHESTRATOR] No prediction_result in state. Stopping.")
            return

        options = []
        if hasattr(prediction_result, "options"):
            options = prediction_result.options
        elif isinstance(prediction_result, dict) and "options" in prediction_result:
            options = prediction_result["options"]

        is_doubtful = True
        if options:
            probabilities = []
            for opt in options:
                if hasattr(opt, "probability"):
                    probabilities.append(opt.probability)
                elif isinstance(opt, dict) and "probability" in opt:
                    probabilities.append(opt["probability"])

            if probabilities:
                max_prob = max(probabilities)
                if max_prob > 0.60:
                    is_doubtful = False

        if is_doubtful:
            print("[ORCHESTRATOR] Step 4/5: Prediction doubtful. Running Critic Agent...")
            async for event in self.critic.run_async(ctx):
                yield event
            print("[ORCHESTRATOR] Step 5/5: Running Refiner Agent...")
            async for event in self.refiner.run_async(ctx):
                yield event
        else:
            print(
                "[ORCHESTRATOR] Prediction confident (max prob > 0.60). "
                "Skipping critic and refiner."
            )


async def auto_save_session_to_memory_callback(callback_context: CallbackContext) -> None:
    session = callback_context._invocation_context.session
    memory_service = callback_context._invocation_context.memory_service
    if memory_service:
        print("[CALLBACK] Auto-saving session to memory...")
        await memory_service.add_session_to_memory(session)
        print("[CALLBACK] Session saved successfully!")


def create_analyst_agent() -> ConditionalAnalystOrchestrator:
    return ConditionalAnalystOrchestrator(
        name="analyst_agent",
        researcher=create_research_agent(),
        statistician=create_statistical_agent(),
        analyst=create_structured_output_agent(),
        critic=create_critic_agent(),
        refiner=create_refiner_agent(),
        after_agent_callback=auto_save_session_to_memory_callback
    )
