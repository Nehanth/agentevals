# NPS Agent — National Parks Service Chat Agent

A Chainlit-powered chat agent that answers questions about U.S. National Parks using the NPS API, with full MLflow tracing via OpenAI autolog and automatic evaluation using MLflow scorers.

## Prerequisites

- Python 3.13 (3.14 is not yet supported by Chainlit)
- An OpenAI API key — [get one here](https://platform.openai.com/api-keys)
- An NPS API key (free) — [sign up here](https://www.nps.gov/subjects/developer/get-started.htm)

## Setup

### 1. Clone and enter the repo

```sh
git clone <your-repo-url>
cd agentevals
```

### 2. Create a virtual environment

```sh
python3.13 -m venv .venv
source .venv/bin/activate
```

### 3. Install dependencies

```sh
pip install -r requirements.txt
```

### 4. Configure environment variables

```sh
cp .env.sample .env
```

Then fill in your keys:

```
OPENAI_API_KEY=sk-proj-your-openai-key-here
NPS_API_KEY=your-nps-api-key-here
```

Optional variables:

```
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL_NAME=gpt-4o
MLFLOW_TRACKING_URI=http://localhost:5001
MLFLOW_EXPERIMENT_NAME=nps-agent
```

## Running

### Start the MLflow server (in a separate terminal)

```sh
mlflow server --port 5001
```

Open [http://localhost:5001](http://localhost:5001) to view traces and evaluation results.

### Start the Chainlit app

```sh
chainlit run main.py
```

Open [http://localhost:8000](http://localhost:8000) and start chatting.

Every message is automatically traced by MLflow and scored in the background by 8 judges (see below).

## Evaluation Scorers

Every agent response is automatically evaluated using these MLflow scorers (no ground-truth required):

| Scorer | What it evaluates |
|---|---|
| RelevanceToQuery | Does the response address the user's question? |
| Completeness | Are all parts of the question answered? |
| Fluency | Is the response grammatically correct and natural? |
| Safety | Is the response free of harmful content? |
| Summarization | Is the response faithful, comprehensive, and concise? |
| Length (custom) | Labels the response as short, medium, or long |
| ToolCallCorrectness | Are the right tools called with correct arguments? |
| ToolCallEfficiency | Are tool calls free of redundancy? |

View all scores in the MLflow UI under **Traces > Assessments**.

## Project Structure

| File | Description |
|---|---|
| `main.py` | Chainlit UI entry point |
| `nps_agent.py` | Agent definition with MLflow autolog + MCP tool wiring |
| `eval.py` | MLflow scorers and `score_trace()` function |
| `nps_mcp_server.py` | MCP server exposing NPS API tools (parks, alerts, campgrounds, events, visitor centers) |
| `requirements.txt` | Python dependencies |
| `.env.sample` | Template for environment variables |
