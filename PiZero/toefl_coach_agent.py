"""
Voxpeb TOEFL Speaking Coach Agent. (Direct Gemini Live API Version)

This script runs on the hardware device/client. It captures local audio,
sends it directly to the Gemini Live API via WebSockets (without LiveKit),
handles function calls to evaluate responses, and uploads the scoring 
result to the Supabase REST API documented in API.md.

Dependencies required:
pip install websockets pyaudio python-dotenv
"""

import argparse
import asyncio
import base64
import json
import os
import sys
import threading
import struct
import queue
import urllib.error
import urllib.request
from datetime import datetime, timezone
from typing import Any, Dict, Optional, Tuple

import pyaudio
import websockets
from dotenv import load_dotenv

# Ensure modules are discoverable depending on how the script is run
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from modules.evaluation import SpeechEvaluator
from modules.toefl_knowledge import TOEFLKnowledgeBase

load_dotenv(".env.local")

GEMINI_LIVE_MODEL = "gemini-3.1-flash-live-preview"
DEFAULT_USER_ID = os.getenv("USER_ID", "anonymous")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

class TOEFLSessionBackend:
    """Minimal Supabase REST client for the API.md /toefl_sessions contract."""
    def __init__(self) -> None:
        self.supabase_url = os.getenv("SUPABASE_URL", "").rstrip("/")
        self.supabase_key = (
            os.getenv("SUPABASE_KEY")
            or os.getenv("SUPABASE_ANON_KEY")
            or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
            or ""
        )
        self.access_token = os.getenv("SUPABASE_ACCESS_TOKEN") or self.supabase_key

    async def upload_toefl_session(self, payload: Dict[str, Any]) -> Tuple[bool, str]:
        if not self.supabase_url or not self.supabase_key or not self.access_token:
            return False, "Supabase upload skipped: SUPABASE_URL/SUPABASE_KEY not configured."

        endpoint = self._rest_base_url() + "/toefl_sessions"
        body = json.dumps(payload).encode("utf-8")

        def post() -> Tuple[bool, str]:
            request = urllib.request.Request(
                endpoint,
                data=body,
                method="POST",
                headers={
                    "apikey": self.supabase_key,
                    "Authorization": f"Bearer {self.access_token}",
                    "Content-Type": "application/json",
                    "Prefer": "return=representation",
                },
            )

            try:
                with urllib.request.urlopen(request, timeout=15) as response:
                    return True, response.read().decode("utf-8")
            except urllib.error.HTTPError as exc:
                detail = exc.read().decode("utf-8", errors="replace")
                return False, f"Supabase upload failed: HTTP {exc.code} {detail}"
            except Exception as exc:
                return False, f"Supabase upload failed: {exc}"

        return await asyncio.get_event_loop().run_in_executor(None, post)

    def _rest_base_url(self) -> str:
        if self.supabase_url.endswith("/rest/v1"):
            return self.supabase_url
        return self.supabase_url + "/rest/v1"


class AudioDevice:
    """Manages PyAudio for capturing mic and playing speaker audio."""
    def __init__(
        self,
        in_queue: asyncio.Queue,
        loop: asyncio.AbstractEventLoop,
        input_device_index: Optional[int] = None,
        output_device_index: Optional[int] = None,
        input_channels: int = 1,
        input_rate: int = 16000,
        input_chunk_ms: int = 40,
        output_channels: int = 2,
        mute_input_while_playing: bool = True,
    ):
        self.p = pyaudio.PyAudio()
        self.in_queue = in_queue
        self.loop = loop
        self.input_channels = input_channels
        self.input_rate = input_rate
        self.input_chunk_frames = max(160, int(input_rate * input_chunk_ms / 1000))
        self.output_channels = output_channels
        self.mute_input_while_playing = mute_input_while_playing
        self.out_queue: queue.Queue[Optional[bytes]] = queue.Queue()
        self.playing_output = threading.Event()
        self.closed = False
        self.mic_thread: Optional[threading.Thread] = None
        self.speaker_thread: Optional[threading.Thread] = None
        
        try:
            # Capture from Microphone (16kHz PCM mono)
            self.micro = self.p.open(
                format=pyaudio.paInt16,
                channels=input_channels,
                rate=input_rate,
                input=True,
                input_device_index=input_device_index,
                frames_per_buffer=self.input_chunk_frames,
            )
            # Gemini outputs 24kHz PCM mono. Default to stereo output for headphones.
            self.speaker = self.p.open(
                format=pyaudio.paInt16,
                channels=output_channels,
                rate=24000,
                output=True,
                output_device_index=output_device_index,
                frames_per_buffer=1024
            )
            self.mic_thread = threading.Thread(target=self._mic_read_loop, daemon=True)
            self.speaker_thread = threading.Thread(target=self._speaker_write_loop, daemon=True)
            self.mic_thread.start()
            self.speaker_thread.start()
        except OSError as e:
            print(f"\n[Error] Failed to initialize audio devices: {e}")
            print("\nAvailable Audio Devices:")
            for i in range(self.p.get_device_count()):
                dev = self.p.get_device_info_by_index(i)
                input_ch = dev.get('maxInputChannels', 0)
                output_ch = dev.get('maxOutputChannels', 0)
                default_rate = dev.get("defaultSampleRate", "?")
                print(f"Index {i}: {dev['name']} (In: {input_ch}, Out: {output_ch}, Default rate: {default_rate})")
            print("\nPlease specify correct devices using --input-device, --output-device, and --input-channels arguments.")
            self.p.terminate()
            sys.exit(1)

    def _mic_read_loop(self):
        while not self.closed:
            try:
                data = self.micro.read(self.input_chunk_frames, exception_on_overflow=False)
                if self.mute_input_while_playing and self.playing_output.is_set():
                    continue
                self.loop.call_soon_threadsafe(self._enqueue_audio, self._to_mono(data))
            except OSError as e:
                if not self.closed:
                    print(f"\n[Audio input error] {e}")
                break
            except Exception as e:
                if not self.closed:
                    print(f"\n[Audio input thread error] {e}")
                break

    def _enqueue_audio(self, data: bytes):
        try:
            self.in_queue.put_nowait(data)
        except asyncio.QueueFull:
            pass

    def _to_mono(self, data: bytes) -> bytes:
        if self.input_channels == 1:
            return data
        if self.input_channels == 2:
            return self._stereo_to_mono(data)
        return self._first_channel_to_mono(data)

    def _stereo_to_mono(self, data: bytes) -> bytes:
        output = bytearray()
        frame_size = 4
        for offset in range(0, len(data) - frame_size + 1, frame_size):
            left, right = struct.unpack_from("<hh", data, offset)
            mixed = int((left + right) / 2)
            output.extend(struct.pack("<h", mixed))
        return bytes(output)

    def _first_channel_to_mono(self, data: bytes) -> bytes:
        output = bytearray()
        frame_size = self.input_channels * 2
        for offset in range(0, len(data) - frame_size + 1, frame_size):
            sample = struct.unpack_from("<h", data, offset)[0]
            output.extend(struct.pack("<h", sample))
        return bytes(output)

    def play(self, data: bytes):
        if self.closed:
            return
        self.out_queue.put(data)

    def clear_output(self):
        while True:
            try:
                self.out_queue.get_nowait()
            except queue.Empty:
                break

    def _speaker_write_loop(self):
        while not self.closed:
            try:
                data = self.out_queue.get(timeout=0.1)
            except queue.Empty:
                self.playing_output.clear()
                continue

            if data is None:
                self.playing_output.clear()
                continue

            try:
                self.playing_output.set()
                self.speaker.write(self._format_output(data))
            except OSError as e:
                if not self.closed:
                    print(f"\n[Audio output error] {e}")
                break
            except Exception as e:
                if not self.closed:
                    print(f"\n[Audio output thread error] {e}")
                break

    def _format_output(self, data: bytes) -> bytes:
        if self.output_channels == 1:
            return data
        if self.output_channels == 2:
            return self._mono_to_stereo(data)
        return self._mono_to_n_channels(data, self.output_channels)

    def _mono_to_stereo(self, data: bytes) -> bytes:
        output = bytearray()
        for offset in range(0, len(data) - 1, 2):
            sample = data[offset:offset + 2]
            output.extend(sample)
            output.extend(sample)
        return bytes(output)

    def _mono_to_n_channels(self, data: bytes, channels: int) -> bytes:
        output = bytearray()
        for offset in range(0, len(data) - 1, 2):
            sample = data[offset:offset + 2]
            for _ in range(channels):
                output.extend(sample)
        return bytes(output)

    def close(self):
        self.closed = True
        self.out_queue.put(None)
        if self.mic_thread and self.mic_thread.is_alive():
            self.mic_thread.join(timeout=1)
        if self.speaker_thread and self.speaker_thread.is_alive():
            self.speaker_thread.join(timeout=1)
        for stream in (getattr(self, "micro", None), getattr(self, "speaker", None)):
            if not stream:
                continue
            try:
                if stream.is_active():
                    stream.stop_stream()
                stream.close()
            except Exception:
                pass
        self.p.terminate()


class TOEFLCoachAgent:
    """TOEFL speaking coach with native Gemini Websocket API."""
    def __init__(self, user_id: Optional[str] = None) -> None:
        self.user_id = user_id or DEFAULT_USER_ID
        self.knowledge_base = TOEFLKnowledgeBase()
        self.evaluator = SpeechEvaluator()
        self.backend = TOEFLSessionBackend()
        self.current_practice: Dict[str, Any] = {}

    def get_system_instructions(self) -> str:
        return """
You are Voxpeb, a warm and precise TOEFL Speaking coach.

Your job is to run TOEFL Speaking practice, listen to the student's full answer,
score it, upload the result, and then coach the student toward a stronger next
attempt.

Practice flow:
1. Ask which TOEFL Speaking task the student wants, or offer Task 1, Task 2,
   Task 3, Task 4, or random practice.
2. Use start_toefl_practice(task_type) before giving a practice prompt.
3. Let the student answer without interruption.
4. When the student finishes a TOEFL response, call evaluate_response with the
   student's transcript (transcribe exactly what you heard) and the best available 
   response duration in seconds.
5. Read back the scores and coaching feedback in a concise, encouraging way.

Scoring criteria:
- Delivery: pronunciation, fluency, pace, clarity.
- Language Use: grammar, vocabulary, accuracy, sentence control.
- Topic Development: relevance, organization, support, coherence.

Important:
- The evaluation tool automatically uploads the scoring result to the backend.
- Do not claim an upload succeeded unless the tool result says it was uploaded.
- Keep feedback practical: one strength, two priority fixes, and one next drill.
"""

    async def start_toefl_practice(self, task_type: str = "random") -> str:
        question_data = self.knowledge_base.get_question(task_type)
        if not question_data:
            return "I couldn't load a TOEFL question. Please try another task type."

        self.current_practice = {
            "question": question_data["question"],
            "question_type": question_data["type"],
            "task_number": question_data["task_number"],
            "prep_time": question_data["prep_time"],
            "response_time": question_data["response_time"],
            "started_at": datetime.now(timezone.utc).isoformat(),
            "transcript": "",
        }

        # Return prompt text to LLM context
        return (
            f"TOEFL Speaking {question_data['task_number']} "
            f"({question_data['type'].title()})\n\n"
            f"Question:\n{question_data['question']}\n\n"
            f"Preparation time: {question_data['prep_time']} seconds\n"
            f"Response time: {question_data['response_time']} seconds"
        )

    async def evaluate_response(self, response_text: str, audio_duration: float = 0) -> str:
        if not self.current_practice:
            return "No active TOEFL practice. Start a practice question before scoring."

        response_text = response_text.strip()
        if not response_text:
            return "I need the student's response transcript before I can score it."

        duration_seconds = self._duration_or_estimate(response_text, audio_duration)
        
        evaluation = self.evaluator.evaluate(
            question=self.current_practice["question"],
            response_text=response_text,
            audio_duration=duration_seconds,
            task_type=self.current_practice["question_type"],
        )

        scores = evaluation["scores"]
        raw_average = (
            scores["delivery"]
            + scores["language_use"]
            + scores["topic_development"]
        ) / 3
        overall_score = self._toefl_30_point_score(raw_average)
        feedback_text = self._feedback_to_text(evaluation["feedback"])
        
        payload = self._build_upload_payload(
            response_text=response_text,
            duration_seconds=duration_seconds,
            overall_score=overall_score,
            scores=scores,
            feedback_text=feedback_text,
        )

        uploaded, upload_message = await self.backend.upload_toefl_session(payload)
        self.current_practice["transcript"] = response_text
        self.current_practice["last_evaluation"] = payload
        self.current_practice["uploaded"] = uploaded

        upload_status = "Uploaded to backend." if uploaded else upload_message
        return (
            "Evaluation complete.\n\n"
            f"TOEFL Speaking score estimate: {overall_score}/30\n"
            f"Delivery: {scores['delivery']:.1f}/4\n"
            f"Language Use: {scores['language_use']:.1f}/4\n"
            f"Topic Development: {scores['topic_development']:.1f}/4\n"
            f"Duration: {duration_seconds:.1f} seconds\n\n"
            f"{feedback_text}\n\n"
            f"{upload_status}"
        )

    # --- Utility Methods ---
    def _build_upload_payload(
        self, response_text: str, duration_seconds: float, overall_score: int, 
        scores: Dict[str, float], feedback_text: str,
    ) -> Dict[str, Any]:
        return {
            "user_id": self.user_id,
            "date": datetime.now(timezone.utc).isoformat(),
            "task_type": "Independent" if self.current_practice["question_type"].lower() == "independent" else "Integrated",
            "duration_minutes": round(duration_seconds / 60, 2),
            "overall_score": overall_score,
            "delivery_score": round(scores["delivery"], 1),
            "language_use_score": round(scores["language_use"], 1),
            "topic_development_score": round(scores["topic_development"], 1),
            "feedback": feedback_text,
            "transcript": response_text,
        }

    def _feedback_to_text(self, feedback: Dict[str, Any]) -> str:
        parts = [
            str(feedback.get("strengths", "")).strip(),
            str(feedback.get("improvements", "")).strip(),
            str(feedback.get("suggestions", "")).strip(),
            str(feedback.get("encouragement", "")).strip(),
        ]
        return "\n".join(part for part in parts if part)

    def _duration_or_estimate(self, response_text: str, audio_duration: float) -> float:
        if audio_duration and audio_duration > 0:
            return float(audio_duration)
        word_count = len(response_text.split())
        if word_count == 0: return 1.0
        return max(1.0, (word_count / 140) * 60)

    def _toefl_30_point_score(self, average_score: float) -> int:
        return max(0, min(30, round((average_score / 4.0) * 30)))


async def run_client(
    input_device: Optional[int] = None,
    output_device: Optional[int] = None,
    input_channels: int = 1,
    input_rate: int = 16000,
    input_chunk_ms: int = 40,
    output_channels: int = 2,
    mute_input_while_playing: bool = True,
):
    if not GEMINI_API_KEY:
        print("Missing GEMINI_API_KEY environment variable.")
        return

    agent = TOEFLCoachAgent(user_id=DEFAULT_USER_ID)
    loop = asyncio.get_running_loop()
    in_queue = asyncio.Queue(maxsize=10)
    audio_dev = AudioDevice(
        in_queue,
        loop,
        input_device_index=input_device,
        output_device_index=output_device,
        input_channels=input_channels,
        input_rate=input_rate,
        input_chunk_ms=input_chunk_ms,
        output_channels=output_channels,
        mute_input_while_playing=mute_input_while_playing,
    )

    host = "generativelanguage.googleapis.com"
    ws_url = f"wss://{host}/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key={GEMINI_API_KEY}"

    setup_payload = {
        "setup": {
            "model": f"models/{GEMINI_LIVE_MODEL}",
            "generationConfig": {
                "responseModalities": ["AUDIO"],
                "speechConfig": {
                    "voiceConfig": {
                        "prebuiltVoiceConfig": {"voiceName": "Puck"}
                    }
                }
            },
            "systemInstruction": {
                "parts": [{"text": agent.get_system_instructions()}]
            },
            "inputAudioTranscription": {},
            "outputAudioTranscription": {},
            "tools": [
                {
                    "functionDeclarations": [
                        {
                            "name": "start_toefl_practice",
                            "description": "Start a TOEFL speaking practice.",
                            "parameters": {
                                "type": "OBJECT",
                                "properties": {"task_type": {"type": "STRING"}}
                            }
                        },
                        {
                            "name": "evaluate_response",
                            "description": "Score a TOEFL speaking response and upload result to backend.",
                            "parameters": {
                                "type": "OBJECT",
                                "properties": {
                                    "response_text": {"type": "STRING", "description": "Student's exact answer transcript"},
                                    "audio_duration": {"type": "NUMBER", "description": "Duration in seconds (0 if unknown)"}
                                },
                                "required": ["response_text", "audio_duration"]
                            }
                        }
                    ]
                }
            ]
        }
    }

    try:
        async with websockets.connect(ws_url) as ws:
            print("=> Connected to Gemini Live API over WebSockets")
            await ws.send(json.dumps(setup_payload))
            print("=> Sent agent setup payload.")

            setup_response = json.loads(await ws.recv())
            if "error" in setup_response:
                print(f"=> Gemini setup error: {setup_response['error']}")
                return
            print("=> Gemini setup complete. You can now start speaking...\n")

            # Initial turn
            await ws.send(json.dumps({
                "clientContent": {
                    "turns": [
                        {
                            "role": "user",
                            "parts": [{"text": "Hello! I'm ready to practice TOEFL speaking."}]
                        }
                    ],
                    "turnComplete": True
                }
            }))

            async def send_mic_loop():
                while True:
                    try:
                        data = await asyncio.wait_for(in_queue.get(), timeout=1.0)
                    except asyncio.TimeoutError:
                        continue

                    # Send raw PCM 16kHz audio out to Gemini
                    msg = {
                        "realtimeInput": {
                            "audio": {
                                "mimeType": f"audio/pcm;rate={input_rate}",
                                "data": base64.b64encode(data).decode("ascii"),
                            }
                        }
                    }
                    await ws.send(json.dumps(msg))

            async def receive_gemini_loop():
                while True:
                    try:
                        resp = await ws.recv()
                        data = json.loads(resp)
                        if "serverContent" in data:
                            content = data["serverContent"]

                            if content.get("interrupted"):
                                print("\n[Gemini interrupted: clearing local playback]")
                                audio_dev.clear_output()
                                continue

                            if content.get("generationComplete"):
                                audio_dev.playing_output.clear()

                            input_transcription = content.get("inputTranscription")
                            if input_transcription and input_transcription.get("text"):
                                print(f"\n[Heard] {input_transcription['text']}")

                            output_transcription = content.get("outputTranscription")
                            if output_transcription and output_transcription.get("text"):
                                print(f"\n[Coach transcript] {output_transcription['text']}")
                            
                            # Log basic text to console
                            model_turn = content.get("modelTurn")
                            if model_turn:
                                for part in model_turn.get("parts", []):
                                    if "text" in part:
                                        sys.stdout.write(part["text"])
                                        sys.stdout.flush()

                                    if "inlineData" in part:
                                        # Audio from Gemini
                                        b64 = part["inlineData"].get("data")
                                        if b64:
                                            audio_dev.play(base64.b64decode(b64))

                        if "toolCall" in data:
                            await handle_tool_call(ws, data["toolCall"], agent)
                                        
                    except websockets.exceptions.ConnectionClosed:
                        print("\n=> Connection closed by server.")
                        break

            await asyncio.gather(send_mic_loop(), receive_gemini_loop())

    except Exception as e:
        print(f"Error: {e}")
    finally:
        audio_dev.close()
        print("Cleaned up audio devices.")


def list_audio_devices() -> None:
    p = pyaudio.PyAudio()
    try:
        print("Available Audio Devices:")
        for i in range(p.get_device_count()):
            dev = p.get_device_info_by_index(i)
            input_ch = dev.get("maxInputChannels", 0)
            output_ch = dev.get("maxOutputChannels", 0)
            print(f"Index {i}: {dev['name']} (In: {input_ch}, Out: {output_ch})")
    finally:
        p.terminate()


async def handle_tool_call(ws, tool_call: Dict[str, Any], agent: TOEFLCoachAgent) -> None:
    function_responses = []
    for call in tool_call.get("functionCalls", []):
        name = call.get("name")
        args = call.get("args", {})
        call_id = call.get("id", "")

        print(f"\n\n[Agent executing tool: {name}]")

        try:
            if name == "start_toefl_practice":
                result = await agent.start_toefl_practice(args.get("task_type", "random"))
            elif name == "evaluate_response":
                print(f"-> Evaluating transcript:\n'{args.get('response_text')}'")
                result = await agent.evaluate_response(
                    args.get("response_text", ""),
                    args.get("audio_duration", 0),
                )
            else:
                result = f"Unknown tool: {name}"
        except Exception as exc:
            result = f"Tool execution failed: {exc}"

        function_responses.append({
            "name": name,
            "id": call_id,
            "response": {"result": result},
        })

    if function_responses:
        await ws.send(json.dumps({
            "toolResponse": {
                "functionResponses": function_responses,
            }
        }))

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Voxpeb TOEFL Speaking Coach")
    parser.add_argument("--user", type=str, default=DEFAULT_USER_ID, help="Supabase user id")
    parser.add_argument("--input-device", type=int, default=None, help="Input device index for PyAudio")
    parser.add_argument("--output-device", type=int, default=None, help="Output device index for PyAudio")
    parser.add_argument("--input-channels", type=int, default=1, help="Input channel count. ReSpeaker 2-Mics HAT often needs 2.")
    parser.add_argument("--input-rate", type=int, default=16000, help="Input sample rate in Hz")
    parser.add_argument("--input-chunk-ms", type=int, default=40, help="Microphone chunk size in milliseconds. Gemini recommends 20-40.")
    parser.add_argument("--output-channels", type=int, default=2, help="Output channel count. Use 2 for headphones, 1 for mono speakers.")
    parser.add_argument("--full-duplex", action="store_true", help="Keep sending microphone audio while the model is speaking.")
    parser.add_argument("--list-devices", action="store_true", help="List PyAudio input/output devices and exit")
    args = parser.parse_args()

    os.environ["USER_ID"] = args.user

    if args.list_devices:
        list_audio_devices()
        sys.exit(0)

    try:
        asyncio.run(run_client(
            input_device=args.input_device,
            output_device=args.output_device,
            input_channels=args.input_channels,
            input_rate=args.input_rate,
            input_chunk_ms=args.input_chunk_ms,
            output_channels=args.output_channels,
            mute_input_while_playing=not args.full_duplex,
        ))
    except KeyboardInterrupt:
        print("\nExiting...")