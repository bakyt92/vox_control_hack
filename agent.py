from dotenv import load_dotenv

from livekit import agents, rtc
from livekit.agents import (
    Agent,
    AgentServer,
    AgentSession,
    AgentTask,
    function_tool,
    get_job_context,
    room_io,
)
from livekit.plugins import noise_cancellation, silero, speechmatics
from livekit.plugins.turn_detector.multilingual import MultilingualModel
import json
from textwrap import dedent

load_dotenv(".env.local")

AllowedOption = str


async def emit_event(event: dict) -> None:
    """
    Send a JSON event to the frontend over LiveKit data (text streams).

    Frontend can subscribe to topic: "agent-events".
    """
    try:
        room = get_job_context().room
        await room.local_participant.send_text(
            json.dumps(event),
            topic="agent-events",
        )
    except Exception:
        # In console mode (or if no room), ignore.
        return


class ExpectOptionsTask(AgentTask[AllowedOption]):
    def __init__(
        self,
        question: str,
        options: list[str],
        chat_ctx=None,
    ) -> None:
        self.question = question
        self.options = options

        # normalize options for validation / matching
        self._option_map = {opt.strip().lower(): opt for opt in options}

        instructions = dedent(
            f"""
            Ask the user: "{question}"

            Interpret their response and determine which value from
            the predefined set it most closely matches: {options}.
            Do not reveal or reference the predefined set in
            conversation.

            If their response is unclear or does not confidently map
            to a single value, ask a natural follow-up question to
            clarify their intent.
            Do not suggest possible answers.

            Continue until you can confidently determine the best match.

            Once confident, call the `select_option` tool with the
            chosen value.
        """
        )

        super().__init__(
            instructions=instructions,
            chat_ctx=chat_ctx,
        )

    async def on_enter(self) -> None:
        await self.session.generate_reply(
            instructions=f'Ask the user: "{self.question}"'
        )

    @function_tool()
    async def select_option(self, option: str) -> None:
        """Call this when you can confidently map the user's intent to one allowed option."""
        normalized = option.strip().lower()
        if normalized not in self._option_map:
            # Don't complete; force clarification.
            from livekit.agents.llm import ToolError

            raise ToolError(
                "Invalid option. Ask a brief follow-up question to clarify."
            )
        self.complete(self._option_map[normalized])


class AcknowledgeInfoTask(AgentTask[bool]):
    def __init__(self, *, info: str, chat_ctx=None, max_repeats: int = 1) -> None:
        self.info = info
        self.max_repeats = max_repeats
        self._repeats_done = 0

        super().__init__(
            instructions=dedent(
                f"""
                You must deliver an important piece of information to the user, then confirm they acknowledged it.

                Information to deliver (say this to the user):
                {info}

                After delivering it, ask for a short acknowledgement like "Got it" or "Okay".

                If the user changes the subject or does not acknowledge they heard it,
                call `not_acknowledged` and you will repeat the information once.

                When the user acknowledges, call `acknowledged`.
                """
            ).strip(),
            chat_ctx=chat_ctx,
        )

    async def on_enter(self) -> None:
        await self.session.generate_reply(
            instructions=dedent(
                f"""
                Tell the user this information, then ask them to confirm they heard it:
                {self.info}
                """
            ).strip()
        )

    @function_tool()
    async def acknowledged(self) -> None:
        """Call this when the user clearly acknowledges they heard/understood the information."""
        self.complete(True)

    @function_tool()
    async def not_acknowledged(self) -> None:
        """Call this when the user changes subject or does not acknowledge they heard it."""
        if self._repeats_done < self.max_repeats:
            self._repeats_done += 1
            await self.session.generate_reply(
                instructions=dedent(
                    f"""
                    Briefly repeat the information one more time, then ask for acknowledgement:
                    {self.info}
                    """
                ).strip()
            )
            return

        # After repeating once, complete even if they didn't acknowledge.
        self.complete(False)


class InformUserCriticalTask(AgentTask[bool]):
    def __init__(self, *, info: str, chat_ctx=None) -> None:
        self.info = info
        super().__init__(
            instructions=dedent(
                f"""
                You need to share a critical message with the user.

                Deliver this clearly and completely:
                {info}

                Make sure the full message is communicated, even if the user briefly interrupts.

                After delivering it, you must verify the user understood.

                If they clearly acknowledge understanding, call `acknowledged`.

                If they change the subject or do not confirm understanding, call `not_acknowledged`.
                (The tool will handle repeating and re-checking.) Continue until they acknowledge.
                """
            ).strip(),
            chat_ctx=chat_ctx,
        )

    async def on_enter(self) -> None:
        # Make this uninterruptible so the message is fully delivered.
        await self.session.say(self.info, allow_interruptions=False)
        await self.session.generate_reply(
            instructions="Ask the user to confirm they understood the critical message."
        )

    @function_tool()
    async def acknowledged(self) -> None:
        """Call this when the user clearly confirms they understood."""
        self.complete(True)

    @function_tool()
    async def not_acknowledged(self) -> None:
        """Call this when the user changes subject or does not confirm understanding."""
        await self.session.say(self.info, allow_interruptions=False)
        await self.session.generate_reply(
            instructions="Ask again for confirmation that they understood."
        )


class InformUserImportantTask(AgentTask[bool]):
    def __init__(self, *, info: str, chat_ctx=None) -> None:
        self.info = info
        self._restated = False
        super().__init__(
            instructions=dedent(
                f"""
                You need to share an important update with the user.

                Deliver this clearly:
                {info}

                After sharing it, briefly check that it was received.

                If the user gives any reasonable sign they understood, call `acknowledged`.

                If their response suggests they missed it, call `not_acknowledged`.
                (The tool will restate the main point once, then end the task.)
                """
            ).strip(),
            chat_ctx=chat_ctx,
        )

    async def on_enter(self) -> None:
        await self.session.generate_reply(
            instructions=dedent(
                f"""
                Tell the user this important update:
                {self.info}

                Then ask a brief check-in question to ensure it was received.
                """
            ).strip()
        )

    @function_tool()
    async def acknowledged(self) -> None:
        """Call this when the user shows they understood."""
        self.complete(True)

    @function_tool()
    async def not_acknowledged(self) -> None:
        """Call this when it seems the user missed the important update."""
        if not self._restated:
            self._restated = True
            await self.session.generate_reply(
                instructions=dedent(
                    f"""
                    Briefly restate the main point once:
                    {self.info}

                    Then continue naturally.
                    """
                ).strip()
            )
        self.complete(False)


class InformUserBasicTask(AgentTask[bool]):
    def __init__(self, *, info: str, chat_ctx=None) -> None:
        self.info = info
        self._restated = False
        super().__init__(
            instructions=dedent(
                f"""
                Share the following information naturally in conversation:
                {info}

                Afterward, lightly check that it was heard.

                If the user acknowledges in any way, call `acknowledged`.

                If it seems overlooked, call `not_acknowledged`.
                (The tool will briefly restate the key point once, then end the task.)
                """
            ).strip(),
            chat_ctx=chat_ctx,
        )

    async def on_enter(self) -> None:
        await self.session.generate_reply(
            instructions=dedent(
                f"""
                Share this information naturally:
                {self.info}

                Then lightly check it was heard.
                """
            ).strip()
        )

    @function_tool()
    async def acknowledged(self) -> None:
        """Call this when the user acknowledges in any way."""
        self.complete(True)

    @function_tool()
    async def not_acknowledged(self) -> None:
        """Call this when it seems overlooked."""
        if not self._restated:
            self._restated = True
            await self.session.generate_reply(
                instructions=dedent(
                    f"""
                    Briefly restate the key point once:
                    {self.info}

                    Then continue without insisting.
                    """
                ).strip()
            )
        self.complete(False)


class Assistant(Agent):
    def __init__(self) -> None:
        super().__init__(
            instructions=(
                "You are a helpful voice AI assistant. "
                "Keep responses concise and natural for spoken audio."
            ),
        )

    async def on_enter(self) -> None:
        question = "Which car would you prefer to drive, SUV or Sedan?"
        options = ["SUV", "Sedan"]
        selected_option = await ExpectOptionsTask(
            question=question,
            options=options,
            chat_ctx=self.chat_ctx,
        )

        await emit_event({"type": "option_collected", "option": selected_option})

        if selected_option == "SUV":
            await AcknowledgeInfoTask(
                info="SUVs are great for space and versatility.",
                chat_ctx=self.chat_ctx,
            )
        else:
            await self.session.generate_reply(
                instructions="Respond positively and mention sedans are smooth and efficient."
            )

        await emit_event({"type": "on_enter_complete"})


server = AgentServer()


@server.rtc_session(agent_name="my-agent")
async def my_agent(ctx: agents.JobContext):
    # STT-LLM-TTS pipeline via LiveKit Inference defaults (no separate model keys required).
    session = AgentSession(
        stt=speechmatics.STT(),
        llm="openai/gpt-4.1-mini",
        tts="cartesia/sonic-3:9626c31c-bec5-4cca-baa8-f8ba9e84c8bc",
        vad=silero.VAD.load(),
        turn_detection=MultilingualModel(),
    )

    await session.start(
        room=ctx.room,
        agent=Assistant(),
        room_options=room_io.RoomOptions(
            audio_input=room_io.AudioInputOptions(
                # Use stronger cancellation for PSTN/SIP callers.
                noise_cancellation=lambda params: (
                    noise_cancellation.BVCTelephony()
                    if params.participant.kind
                    == rtc.ParticipantKind.PARTICIPANT_KIND_SIP
                    else noise_cancellation.BVC()
                ),
            ),
        ),
    )


if __name__ == "__main__":
    agents.cli.run_app(server)
