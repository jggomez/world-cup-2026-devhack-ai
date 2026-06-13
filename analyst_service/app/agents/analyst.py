from google.adk.agents import Agent, BaseAgent
from google.adk.agents.callback_context import CallbackContext
from google.adk.agents.invocation_context import InvocationContext
from google.adk.events import Event
from typing import AsyncGenerator
from google.genai import types as genai_types
from app.schemas.prediction import MatchPredictionResponse
from app.agents.researcher import create_research_agent

def create_structured_output_agent() -> Agent:
    return Agent(
        name="structured_output_agent",
        model="gemini-3-flash-preview",
        instruction="""
You are a professional football analyst. Read the research report provided about the match between {home_team} and {away_team} (match ID: {match_id}), including the World Cup group standings, group match results so far, and the results/points of the other teams in the same group.
Based on the research, compile the final analysis and provide:
1. The recent form as a list of 'W', 'D', or 'L'. If exact details are missing, make a realistic estimate based on recent status.
2. The H2H records (number of matches played, home wins, away wins, draws).
3. The overall suggested outcome and estimated score.
4. A concise context summary in the requested language (target language: {language}). In this summary, explicitly discuss the World Cup group situation (points, standings, math/qualification status) and how it affects the motivation, pressure, and tactical approach of both teams (e.g., if a team must win to qualify, or if they can play for a draw, or if they are already qualified and might rotate key players).
5. Exactly three distinct score scenarios (options) with their probability scores. The sum of probabilities for the three options must equal 1.0.

CRITICAL INSTRUCTION FOR UNPREDICTABILITY / SURPRISE:
Football is unpredictable and full of unexpected turns (e.g. red cards, late-minute penalties, underdog victories, tactical masterclasses, weather extremes).
The three score scenarios (options) must NOT be variations of the exact same outcome. Instead, provide:
- Scenario 1 (Logical): The most statistically probable, standard, and logical outcome based on recent form, group standings, and stats.
- Scenario 2 (Contested / Alternative): A tight draw or a highly contested counter-scenario.
- Scenario 3 (Surprising Upset / Drama): A surprising but realistic underdog victory, a dramatic late comeback, or a chaotic high-scoring match.
Distribute the probability scores realistically among these three scenarios to reflect this unpredictability, specifically tailoring them to the urgency/math of the group stage (e.g., if a desperate team must attack, they might expose themselves to a surprise counter-attack defeat).

Write the values for all text properties (such as 'context_summary' and 'description' inside options) in the requested language (target language: {language}).
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
You are an expert critic and sports evaluator. Review the research report and the candidate prediction for the match between {home_team} and {away_team}.
The prediction has been flagged as "doubtful" because the probabilities for the scenarios are too close and uncertain.
Analyze if there is a bias, if we are underestimating the home/away advantage, or if the group standings/qualification motivation has been overlooked.
Point out specifically:
1. If the suggested outcome is too conservative.
2. If any team has a clear motivation advantage (e.g. must win) that should push their probability higher.
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
You are a professional football analyst. Read the original research, the candidate prediction, and the critic's feedback.
Your goal is to refine the match prediction for {home_team} vs {away_team} using the critic's recommendations to produce a more decisive and accurate forecast.
Provide:
1. The refined recent form.
2. The refined H2H records.
3. The refined suggested outcome and estimated score.
4. A concise context summary that incorporates the critic's observations and group dynamics.
5. Exactly three distinct score scenarios (options) with their probability scores, making sure the probabilities are refined based on the critique. The sum of probabilities must equal 1.0.

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
    analyst: BaseAgent
    critic: BaseAgent
    refiner: BaseAgent

    async def _run_async_impl(
        self, ctx: InvocationContext
    ) -> AsyncGenerator[Event, None]:
        # 1. Run researcher
        async for event in self.researcher.run_async(ctx):
            yield event

        # 2. Run analyst (candidate prediction)
        async for event in self.analyst.run_async(ctx):
            yield event

        # 3. Check if prediction is doubtful (max prob <= 0.40)
        prediction_result = ctx.session.state.get("prediction_result")
        if not prediction_result:
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
                # If the highest probability is > 0.40, it is confident
                if max_prob > 0.60:
                    is_doubtful = False

        if is_doubtful:
            print("[ORCHESTRATOR] Prediction is doubtful (max prob <= 0.40). Running critic and refiner...")
            # 4. Run critic
            async for event in self.critic.run_async(ctx):
                yield event
            # 5. Run refiner
            async for event in self.refiner.run_async(ctx):
                yield event
        else:
            print("[ORCHESTRATOR] Prediction is confident (max prob > 0.40). Skipping critic and refiner.")

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
        analyst=create_structured_output_agent(),
        critic=create_critic_agent(),
        refiner=create_refiner_agent(),
        after_agent_callback=auto_save_session_to_memory_callback
    )
