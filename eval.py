import os
from typing import Literal

from mlflow.genai import evaluate as mlflow_evaluate
from mlflow.genai.scorers import (
    RelevanceToQuery,
    Completeness,
    Fluency,
    Safety,
    Summarization,
    ToolCallCorrectness,
    ToolCallEfficiency,
)
from mlflow.genai.judges import make_judge

judge_model = f'openai:/{os.getenv("OPENAI_MODEL_NAME")}' if os.getenv("OPENAI_MODEL_NAME") else "openai:/gpt-4o"

#Custom Judge
length_judge = make_judge(
    name="Length",
    model=judge_model,
    instructions=(
        "Determine if the response in the output object below is short, medium, or long.\n\n"
        "## Output Object\n\n{{ outputs }}\n\n"
        "Respond 'short' if the response is 1-3 sentences, 'medium' if 1-2 paragraphs, "
        "and 'long' if more than 2 paragraphs."
    ),
    feedback_value_type=Literal["short", "medium", "long"],
)

SCORERS = [
    RelevanceToQuery(model=judge_model),
    Completeness(model=judge_model),
    Fluency(model=judge_model),
    Safety(model=judge_model),
    Summarization(model=judge_model),
    length_judge,
    ToolCallCorrectness(model=judge_model),
    ToolCallEfficiency(model=judge_model),
]


def score_trace(trace):
    """Run all scorers against a captured trace."""
    mlflow_evaluate(data=[trace], scorers=SCORERS)
