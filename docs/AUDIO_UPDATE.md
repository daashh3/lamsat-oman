# Audio after voiceover removal

Automatic commentary has been removed from chapter entry, pouring, success and failure events. Its toggle was removed from both HTML and XR menus, and AudioManager no longer exposes a voiceover channel or voiceover methods.

Music and requested TTS remain independently controlled. Music is the original two-minute looping WAV, started only after user interaction. TTS reads labels or discovered cultural facts when interacted with; it uses SpeechSynthesisUtterance with lang='ar-SA', preferring Saudi/Arabic voices. Voice availability and pronunciation depend on the browser/OS.

NarrationManager now handles only requested TTS: user activation, voice refresh, duplicate suppression, delayed hover, cancellation, pause/resume and disposal. No chapter event calls speech synthesis. Challenge messages in src/audio/ArabicScripts.js are visual text (CHALLENGE_MESSAGES); TRIVIA_FACTS supplies the optional cultural readings.

Unit tests cover music/TTS independence, deferred playback, Arabic voice selection, debounce and lifecycle cleanup. The browser test checks the voiceover button and automatic welcome narration are absent while completing the game.
