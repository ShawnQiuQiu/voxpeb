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

GEMINI_LIVE_MODEL = "gemini-2.0-flash-exp"
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
    def __init__(self, in_queue: asyncio.Queue, loop: asyncio.AbstractEventLoop):
        self.p = pyaudio.PyAudio()
        self.in_queue = in_queue
        self.loop = loop
        
        # Capture from Microphone (16kHz PCM mono)
        self.micro = self.p.open(
            format=pyaudio.paInt16,
            channels=1,
            rate=16000,
            input=True,
            frames_per_buffer=2048,
            stream_callback=self._mic_callback
        )
        # Play out to Speaker (24kHz PCM mono from Gemini)
        self.speaker = self.p.open(
            format=pyaudio.paInt16,
            channels=1,
            rate=24000,
            output=True,
            frames_per_buffer=2048
        )

    def _mic_callback(self, in_data, frame_count, time_info, status):
        try:
            self.loop.call_soon_threadsafe(self.in_queue.put_nowait, in_data)
        except Exception:
            pass
        return (None, pyaudio.paContinue)

    def play(self, data: bytes):
        if self.speaker and self.speaker.is_active():
            self.speaker.write(data)

    def close(self):
        self.micro.stop_stream()
        self.speaker.stop_stream()
        self.micro.close()
        self.speaker.close()
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


async def run_client():
    if not GEMINI_API_KEY:
        print("Mssing GEMINI_API_KEY environment variable.")
        return

    agent = TOEFLCoachAgent(user_id=DEFAULT_USER_ID)
    loop = asyncio.get_running_loop()
    in_queue = asyncio.Queue()
    audio_dev = AudioDevice(in_queue, loop)

    host = "generativelanguage.googleapis.com"
    ws_url = f"wss://{host}/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key={GEMINI_API_KEY}"

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
            print("=> Sent agent setup payload. You can now start speaking...\n")

            # Initial turn
            await ws.send(json.dumps({
                "clientContent": {
                    "turns": [{"parts": [{"text": "Hello! I'm ready to practice TOEFL speaking."}]}],
                    "turnComplete": True
                }
            }))

            async def send_mic_loop():
                while True:
                    data = await in_queue.get()
                    # Send raw PCM 16kHz audio out to Gemini
                    msg = {
                        "realtimeInput": {
                            "mediaChunks": [
                                {
                                    "mimeType": "audio/pcm;rate=16000",
                                    "data": base64.b64encode(data).decode('ascii')
                                }
                            ]
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
                                            # Execute blocking audio in thread
                                            loop.run_in_executor(None, audio_dev.play, base64.b64decode(b64))

                                    if "functionCall" in part:
                                        call = part["functionCall"]
                                        name = call.get("name")
                                        args = call.get("args", {})
                                        call_id = call.get("id", "")
                                        
                                        print(f"\n\n[Agent executing tool: {name}]")
                                        result_str = ""
                                        
                                        if name == "start_toefl_practice":
                                            result_str = await agent.start_toefl_practice(args.get("task_type", "random"))
                                        elif name == "evaluate_response":
                                            print(f"-> Evaluating transcript:\n'{args.get('response_text')}'")
                                            result_str = await agent.evaluate_response(
                                                args.get("response_text", ""),
                                                args.get("audio_duration", 0)
                                            )
                                            
                                        # Provide result back to agent
                                        tool_resp = {
                                            "clientContent": {
                                                "turns": [{
                                                    "parts": [{
                                                        "functionResponse": {
                                                            "name": name,
                                                            "id": call_id,
                                                            "response": {"result": result_str}
                                                        }
                                                    }]
                                                }],
                                                "turnComplete": True
                                            }
                                        }
                                        await ws.send(json.dumps(tool_resp))
                                        
                    except websockets.exceptions.ConnectionClosed:
                        print("\n=> Connection closed by server.")
                        break

            await asyncio.gather(send_mic_loop(), receive_gemini_loop())

    except Exception as e:
        print(f"Error: {e}")
    finally:
        audio_dev.close()
        print("Cleaned up audio devices.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Voxpeb TOEFL Speaking Coach")
    parser.add_argument("--user", type=str, default=DEFAULT_USER_ID, help="Supabase user id")
    args = parser.parse_args()

    os.environ["USER_ID"] = args.user

    try:
        asyncio.run(run_client())
    except KeyboardInterrupt:
        print("\nExiting...")
