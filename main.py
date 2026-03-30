import asyncio
import mlflow
import chainlit as cl
from nps_agent import run_nps_agent
from eval import score_trace


@cl.on_chat_start
async def on_chat_start():
    await cl.Message(
        content=(
            "Welcome! I'm the **National Parks Service Agent**.\n\n"
            "Ask me about parks, campgrounds, alerts, events, or visitor centers."
        )
    ).send()


@cl.on_message
async def on_message(message: cl.Message):
    msg = cl.Message(content="")
    await msg.send()

    response = await run_nps_agent(message.content)

    msg.content = response
    await msg.update()

    trace_id = mlflow.get_last_active_trace_id()
    if trace_id:
        trace = mlflow.get_trace(trace_id)
        asyncio.get_event_loop().run_in_executor(None, score_trace, trace)
