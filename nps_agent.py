import os
from dotenv import load_dotenv, find_dotenv

load_dotenv(find_dotenv())

import mlflow

os.environ.setdefault("MLFLOW_TRACKING_URI", "http://localhost:5001")
os.environ.setdefault("MLFLOW_EXPERIMENT_NAME", "nps-agent")
os.environ.setdefault("MLFLOW_TRACKING_AUTH", "")

mlflow.openai.autolog()

from agents import Agent, Runner, set_default_openai_client
from agents.mcp import MCPServerStdio
from openai import AsyncClient

AGENT_INSTRUCTIONS = (
    "You are a helpful National Parks Service assistant. "
    "Use the available tools to answer questions about national parks, "
    "events, activities, campgrounds, and visitor information. "
)

MODEL = os.getenv("OPENAI_MODEL_NAME", "gpt-4o")


async def run_nps_agent(prompt: str) -> str:
    """Run the NPS agent with MCP tools and return the text response."""
    command = "python"
    args = ["nps_mcp_server.py"]
    env = {**os.environ, "NPS_API_KEY": os.environ.get("NPS_API_KEY", "")}

    async with MCPServerStdio(params={"command": command, "args": args, "env": env}) as mcp_server:
        async_client = AsyncClient(
            base_url=os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1"),
            api_key=os.environ.get("OPENAI_API_KEY", ""),
        )
        set_default_openai_client(client=async_client)

        agent = Agent(
            name="NPS Agent",
            instructions=AGENT_INSTRUCTIONS,
            mcp_servers=[mcp_server],
            model=MODEL,
        )

        result = await Runner.run(agent, prompt)
        return result.final_output
