const state = {
  challenges: [],
  selected: null,
  audioContext: null,
  stream: null,
  source: null,
  processor: null,
  analyser: null,
  chunks: [],
  mediaRecorder: null,
  mediaChunks: [],
  sampleRate: 44100,
  recordedBlob: null,
  recording: false,
  currentCharacter: null,
  referenceProfile: null,
  referenceProfilePromise: null,
  referenceFeedbackScheduled: false,
  subtitleTimer: null,
  refGraphTimer: null,
  liveGraphTimer: null,
  recordStopTimer: null,
  recordStartTime: 0,
  livePoints: [],
  liveSmooth: 0,
  livePitchSmooth: 0,
  feedbackDelayTimer: null,
  referenceFeedbackTimer: null,
  resultFeedbackItems: [],
};

const els = {
  status: document.getElementById("status"),
  characterScreen: document.getElementById("characterScreen"),
  practiceScreen: document.getElementById("practiceScreen"),
  characterList: document.getElementById("characterList"),
  challengeList: document.getElementById("challengeList"),
  backBtn: document.getElementById("backBtn"),
  faceImage: document.getElementById("faceImage"),
  characterName: document.getElementById("characterName"),
  phraseTitle: document.getElementById("phraseTitle"),
  nativeTitle: document.getElementById("nativeTitle"),
  referenceAudio: document.getElementById("referenceAudio"),
  playRefBtn: document.getElementById("playRefBtn"),
  recordBtn: document.getElementById("recordBtn"),
  scoreValue: document.getElementById("scoreValue"),
  inlineScoreValue: document.getElementById("inlineScoreValue"),
  recordStatus: document.getElementById("recordStatus"),
  subtitleBar: document.getElementById("subtitleBar"),
  pitchScore: document.getElementById("pitchScore"),
  durationScore: document.getElementById("durationScore"),
  intensityScore: document.getElementById("intensityScore"),
  pronunciationScore: document.getElementById("pronunciationScore"),
  resultScoreValue: document.getElementById("resultScoreValue"),
  photoCardBtn: document.getElementById("photoCardBtn"),
  refGraph: document.getElementById("refGraph"),
  userGraph: document.getElementById("userGraph"),
  feedbackPanel: document.getElementById("feedbackPanel"),
  feedbackList: document.getElementById("feedbackList"),
  feedbackModal: document.getElementById("feedbackModal"),
  feedbackModalTitle: document.getElementById("feedbackModalTitle"),
  modalFeedbackList: document.getElementById("modalFeedbackList"),
  closeFeedbackBtn: document.getElementById("closeFeedbackBtn"),
  startRecordingFromFeedbackBtn: document.getElementById("startRecordingFromFeedbackBtn"),
  showPhotoCardBtn: document.getElementById("showPhotoCardBtn"),
  photoCardModal: document.getElementById("photoCardModal"),
  closePhotoCardBtn: document.getElementById("closePhotoCardBtn"),
  cardFrontTab: document.getElementById("cardFrontTab"),
  cardBackTab: document.getElementById("cardBackTab"),
  photoCard: document.getElementById("photoCard"),
  photoCardFront: document.getElementById("photoCardFront"),
  photoCardBack: document.getElementById("photoCardBack"),
  cardImage: document.getElementById("cardImage"),
  cardCharacter: document.getElementById("cardCharacter"),
  cardPhrase: document.getElementById("cardPhrase"),
  cardScore: document.getElementById("cardScore"),
  cardGrade: document.getElementById("cardGrade"),
  cardFeedbackList: document.getElementById("cardFeedbackList"),
  saveCardBtn: document.getElementById("saveCardBtn"),
  shareXBtn: document.getElementById("shareXBtn"),
  shareInstagramBtn: document.getElementById("shareInstagramBtn"),
};

async function loadChallenges() {
  const res = await fetch("/api/challenges");
  const data = await res.json();
  state.challenges = data.challenges.filter((item) => item.ready);
  renderCharacters();
  els.status.textContent = "캐릭터를 선택하세요";
}

function groupedCharacters() {
  const groups = new Map();
  for (const challenge of state.challenges) {
    if (!groups.has(challenge.character)) {
      groups.set(challenge.character, []);
    }
    groups.get(challenge.character).push(challenge);
  }
  for (const challenges of groups.values()) {
    challenges.sort((a, b) => a.level - b.level);
  }
  return groups;
}

function renderCharacters() {
  els.characterList.innerHTML = "";
  const groups = groupedCharacters();
  for (const [character, challenges] of groups.entries()) {
    const first = challenges[0];
    const button = document.createElement("button");
    button.type = "button";
    button.className = "character-card";
    button.innerHTML = `
      <img src="/api/image/${first.id}" alt="">
      <div>
        <strong>${escapeHtml(character)}</strong>
        <span>${challenges.length}개 챌린지</span>
      </div>
    `;
    button.addEventListener("click", () => showPracticeScreen(character));
    els.characterList.appendChild(button);
  }
}

function showPracticeScreen(character) {
  state.currentCharacter = character;
  els.characterScreen.classList.add("hidden");
  els.practiceScreen.classList.remove("hidden");
  els.status.textContent = "챌린지를 선택하세요";
  renderChallenges(character);
}

function showCharacterScreen() {
  if (state.recording) {
    stopRecording();
  }
  state.currentCharacter = null;
  state.selected = null;
  state.recordedBlob = null;
  els.characterScreen.classList.remove("hidden");
  els.practiceScreen.classList.add("hidden");
  els.status.textContent = "캐릭터를 선택하세요";
}

function renderChallenges(character) {
  els.challengeList.innerHTML = "";
  const challenges = state.challenges
    .filter((item) => item.character === character)
    .sort((a, b) => a.level - b.level);

  for (const challenge of challenges) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "challenge-item";
    button.dataset.id = challenge.id;
    button.innerHTML = `
      <img src="/api/image/${challenge.id}" alt="">
      <div>
        <strong>${escapeHtml(challenge.character)} Lv.${challenge.level}</strong>
      </div>
    `;
    button.addEventListener("click", () => selectChallenge(challenge.id));
    els.challengeList.appendChild(button);
  }
  if (challenges.length) {
    selectChallenge(challenges[0].id);
  }
}

function selectChallenge(id) {
  state.selected = state.challenges.find((item) => item.id === id);
  state.recordedBlob = null;
  state.referenceProfile = null;
  state.referenceProfilePromise = null;
  state.referenceFeedbackScheduled = false;
  state.resultFeedbackItems = [];
  els.scoreValue.textContent = "-";
  els.inlineScoreValue.textContent = "-";
  resetMetricScore(els.resultScoreValue);
  resetMetricScore(els.pitchScore);
  resetMetricScore(els.durationScore);
  resetMetricScore(els.intensityScore);
  resetMetricScore(els.pronunciationScore);
  els.photoCardBtn?.classList.add("hidden");
  els.status.textContent = "원본을 듣고 녹음하세요";
  setRecordStatus("");
  clearFeedback();
  stopSubtitleTicker();
  stopRefGraphTicker();
  stopLiveGraph();
  clearRecordStopTimer();
  clearFeedbackDelayTimer();
  clearReferenceFeedbackTimer();
  renderSubtitle(-1);

  document.querySelectorAll(".challenge-item").forEach((item) => {
    item.classList.toggle("active", item.dataset.id === id);
  });

  els.faceImage.src = `/api/image/${id}`;
  els.characterName.textContent = `${state.selected.character} Lv.${state.selected.level}`;
  els.phraseTitle.textContent = state.selected.title;
  els.nativeTitle.textContent = state.selected.native_title || "";
  els.referenceAudio.src = `/api/reference/${id}`;
  clearCanvas(els.refGraph);
  clearCanvas(els.userGraph);
  state.referenceProfilePromise = loadReferenceProfile(id);
}

function resetMetricScore(element) {
  if (!element) return;
  element.textContent = "-";
  element.classList.remove("score-low", "score-high");
}

function setMetricScore(element, value) {
  if (!element) return;
  const score = Number(value);
  element.textContent = Number.isFinite(score) ? Math.round(score) : "-";
  element.classList.remove("score-low", "score-high");
  if (!Number.isFinite(score)) return;
  element.classList.add(score < 50 ? "score-low" : "score-high");
}

async function loadReferenceProfile(id) {
  try {
    const res = await fetch(`/api/reference-profile/${id}`);
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || "원본 그래프를 불러오지 못했습니다");
    }
    state.referenceProfile = data;
    renderSubtitle(-1);
  } catch (error) {
    setRecordStatus(error.message, true);
  }
}

async function toggleRecord() {
  if (state.recording) {
    return;
  }

  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("이 브라우저에서 마이크 녹음을 지원하지 않습니다");
    }

    state.recordedBlob = null;
    state.chunks = [];
    state.mediaChunks = [];
    els.recordBtn.textContent = "권한 확인 중...";
    els.recordBtn.disabled = true;
    setRecordStatus("마이크 권한을 확인하고 있습니다.");
    state.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    setupLiveRecordingGraph(state.stream);

    if (window.MediaRecorder) {
      state.mediaRecorder = new MediaRecorder(state.stream);
      state.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          state.mediaChunks.push(event.data);
        }
      };
      state.mediaRecorder.onstop = finishMediaRecording;
      state.mediaRecorder.start();
      startTimedRecording();
      return;
    }

    state.audioContext = new AudioContext();
    state.sampleRate = state.audioContext.sampleRate;
    state.source = state.audioContext.createMediaStreamSource(state.stream);
    state.processor = state.audioContext.createScriptProcessor(4096, 1, 1);
  } catch (error) {
    const message = error && error.message ? error.message : "";
    if (message.includes("Permission denied") || error.name === "NotAllowedError") {
      setRecordStatus("마이크 권한이 거부됐습니다. 일반 Chrome에서 주소창의 마이크 권한을 허용해주세요.", true);
    } else {
      setRecordStatus(message || "마이크 권한을 확인해주세요", true);
    }
    els.recordBtn.textContent = "🎤 녹음 시작";
    els.recordBtn.disabled = false;
    return;
  }

  state.processor.onaudioprocess = (event) => {
    const input = event.inputBuffer.getChannelData(0);
    state.chunks.push(new Float32Array(input));
  };

  state.source.connect(state.processor);
  state.processor.connect(state.audioContext.destination);
  startTimedRecording();
}

function startTimedRecording() {
  state.recording = true;
  state.recordStartTime = performance.now();
  els.recordBtn.classList.add("recording");
  els.recordBtn.disabled = true;
  els.recordBtn.textContent = "녹음 중...";
  const durationMs = Math.ceil(getRecordDurationSeconds() * 1000);
  setRecordStatus(`녹음 중입니다. ${Math.round(durationMs / 1000)}초 후 자동 종료됩니다.`);
  startRecordingSubtitleTicker();
  clearRecordStopTimer();
  state.recordStopTimer = window.setTimeout(() => {
    stopRecording();
  }, durationMs);
}

function getRecordDurationSeconds() {
  const fromProfile = Number(state.referenceProfile?.duration || 0);
  if (fromProfile > 0) return fromProfile + 0.35;
  const words = state.referenceProfile?.words || [];
  const end = Math.max(...words.map((word) => Number(word.end || 0)), 0);
  return Math.max(1.5, end + 0.35);
}

function stopRecording() {
  clearRecordStopTimer();
  state.recording = false;
  els.recordBtn.classList.remove("recording");
  els.recordBtn.disabled = false;
  stopLiveGraph();
  stopSubtitleTicker();

  if (state.mediaRecorder && state.mediaRecorder.state === "recording") {
    els.recordBtn.textContent = "변환 중...";
    els.recordBtn.disabled = true;
    setRecordStatus("녹음을 분석 가능한 WAV로 변환하고 있습니다.");
    state.mediaRecorder.stop();
    return;
  }

  els.recordBtn.textContent = "🎤 다시 녹음";
  setRecordStatus("분석할 준비가 됐습니다.");

  if (state.processor) {
    state.processor.disconnect();
  }
  if (state.source) {
    state.source.disconnect();
  }
  if (state.stream) {
    state.stream.getTracks().forEach((track) => track.stop());
  }
  if (state.audioContext) {
    state.audioContext.close();
  }

  const samples = mergeChunks(state.chunks);
  state.recordedBlob = encodeWav(samples, state.sampleRate);
  if (state.recordedBlob) {
    analyzeRecording();
  }
}

async function finishMediaRecording() {
  try {
    const blob = new Blob(state.mediaChunks, { type: state.mediaRecorder.mimeType || "audio/webm" });
    const arrayBuffer = await blob.arrayBuffer();
    const audioContext = new AudioContext();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    const samples = audioBuffer.getChannelData(0);
    state.recordedBlob = encodeWav(samples, audioBuffer.sampleRate);
    await audioContext.close();
    stopStreamTracks();
    els.recordBtn.textContent = "🎤 다시 녹음";
    els.recordBtn.disabled = false;
    if (state.recordedBlob) {
      analyzeRecording();
    } else {
      setRecordStatus("분석할 녹음이 없습니다.", true);
    }
  } catch (error) {
    stopStreamTracks();
    els.recordBtn.textContent = "🎤 다시 녹음";
    els.recordBtn.disabled = false;
    setRecordStatus(`녹음 변환 실패: ${error.message}`, true);
  }
}

function stopStreamTracks() {
  if (state.stream) {
    state.stream.getTracks().forEach((track) => track.stop());
  }
  if (state.audioContext && state.audioContext.state !== "closed") {
    state.audioContext.close().catch(() => {});
  }
  state.stream = null;
  state.source = null;
  state.analyser = null;
}

function clearRecordStopTimer() {
  if (state.recordStopTimer) {
    window.clearTimeout(state.recordStopTimer);
    state.recordStopTimer = null;
  }
}

function setupLiveRecordingGraph(stream) {
  stopLiveGraph();
  state.livePoints = [];
  state.liveSmooth = 0;
  state.livePitchSmooth = 0;
  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtor) return;
  const audioContext = new AudioCtor();
  const source = audioContext.createMediaStreamSource(stream);
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 1024;
  source.connect(analyser);
  state.audioContext = audioContext;
  state.source = source;
  state.analyser = analyser;
  state.recordStartTime = performance.now();
  state.liveGraphTimer = window.setInterval(drawLiveRecordingGraph, 40);
}

function stopLiveGraph() {
  if (state.liveGraphTimer) {
    window.clearInterval(state.liveGraphTimer);
    state.liveGraphTimer = null;
  }
}

function drawLiveRecordingGraph() {
  if (!state.analyser) return;
  const data = new Uint8Array(state.analyser.fftSize);
  state.analyser.getByteTimeDomainData(data);
  let sum = 0;
  let crossings = 0;
  let prev = data[0] - 128;
  for (let i = 0; i < data.length; i += 1) {
    const centered = (data[i] - 128) / 128;
    sum += centered * centered;
    const current = data[i] - 128;
    if ((prev < 0 && current >= 0) || (prev > 0 && current <= 0)) {
      crossings += 1;
    }
    prev = current;
  }
  const rms = Math.sqrt(sum / data.length);
  const sampleRate = state.audioContext?.sampleRate || 44100;
  const frequency = (crossings * sampleRate) / (2 * data.length);
  const pitchLevel = Math.max(0, Math.min(1, (frequency - 80) / 370));
  state.liveSmooth = state.liveSmooth * 0.86 + rms * 0.14;
  state.livePitchSmooth = state.livePitchSmooth * 0.82 + pitchLevel * 0.18;
  const elapsed = (performance.now() - state.recordStartTime) / 1000;
  const duration = getRecordDurationSeconds();
  state.livePoints.push({
    t: Math.min(elapsed, duration),
    intensity: Math.min(1, state.liveSmooth * 5),
    pitch: state.livePitchSmooth,
  });
  state.livePoints = state.livePoints.filter((point) => point.t >= 0 && point.t <= duration);
  drawLiveCurve(els.userGraph, state.livePoints, duration);
}

function drawLiveCurve(canvas, points, duration) {
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);
  drawGrid(ctx, width, height);
  if (points.length < 2) {
    return;
  }
  drawLiveSeries(ctx, points, "intensity", "#f1c40f", width, height, duration);
  drawLiveSeries(ctx, points, "pitch", "#e74c3c", width, height, duration);
}

function drawLiveSeries(ctx, points, key, color, width, height, duration) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  points.forEach((point, index) => {
    const x = (point.t / duration) * width;
    const value = Math.max(0, Math.min(1, point[key] || 0));
    const y = height - value * (height * 0.75) - height * 0.12;
    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.stroke();
}

async function analyzeRecording() {
  if (!state.selected || !state.recordedBlob) return;
  setRecordStatus("분석 중입니다.", false, true);

  const form = new FormData();
  form.append("challenge_id", state.selected.id);
  form.append("file", state.recordedBlob, "recording.wav");

  try {
    const res = await fetch("/api/analyze", { method: "POST", body: form });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || "analysis failed");
    }
    renderResult(data);
    setRecordStatus("분석 완료");
  } catch (error) {
    setRecordStatus(error.message, true);
  } finally {
  }
}

function renderResult(data) {
  els.scoreValue.textContent = data.score;
  els.inlineScoreValue.textContent = data.score;
  setMetricScore(els.resultScoreValue, data.score);
  setMetricScore(els.pitchScore, data.details.pitch);
  setMetricScore(els.durationScore, data.details.timing);
  setMetricScore(els.intensityScore, data.details.energy);
  setMetricScore(els.pronunciationScore, data.details.content);
  drawGraph(els.refGraph, data.reference, "#3498db", null, state.referenceProfile?.feedback_points || []);
  drawGraph(els.userGraph, data.user, "#e74c3c");
  renderFeedback(data.details);
  updatePhotoCard(data);
  els.photoCardBtn?.classList.remove("hidden");
  scheduleFeedbackModal();
}

async function playReference() {
  if (!els.referenceAudio.src) return;
  if (state.referenceProfilePromise && !state.referenceProfile) {
    setRecordStatus("원본 분석을 불러오는 중입니다.");
    await state.referenceProfilePromise;
  }
  state.referenceFeedbackScheduled = false;
  clearReferenceFeedbackTimer();
  els.referenceAudio.currentTime = 0;
  els.referenceAudio.play()
    .then(() => {
      startSubtitleTicker();
      startRefGraphTicker();
      setRecordStatus("원본 음성을 재생합니다.");
    })
    .catch((error) => {
      setRecordStatus(`원본 재생 실패: ${error.message}`, true);
    });
}

function startRefGraphTicker() {
  stopRefGraphTicker();
  if (!state.referenceProfile) return;
  drawGraph(els.refGraph, state.referenceProfile.reference, "#3498db", 0, state.referenceProfile.feedback_points || []);
  state.refGraphTimer = window.setInterval(() => {
    const t = els.referenceAudio.currentTime || 0;
    drawGraph(els.refGraph, state.referenceProfile.reference, "#3498db", t, state.referenceProfile.feedback_points || []);
    if (els.referenceAudio.ended || els.referenceAudio.paused) {
      if (els.referenceAudio.ended) {
        drawGraph(els.refGraph, state.referenceProfile.reference, "#3498db", null, state.referenceProfile.feedback_points || []);
        scheduleReferenceFeedbackModal();
      }
      stopRefGraphTicker();
    }
  }, 40);
}

function stopRefGraphTicker() {
  if (state.refGraphTimer) {
    window.clearInterval(state.refGraphTimer);
    state.refGraphTimer = null;
  }
}

function startSubtitleTicker() {
  stopSubtitleTicker();
  renderSubtitle(els.referenceAudio.currentTime || 0);
  state.subtitleTimer = window.setInterval(() => {
    renderSubtitle(els.referenceAudio.currentTime || 0);
    if (els.referenceAudio.ended || els.referenceAudio.paused) {
      stopSubtitleTicker();
    }
  }, 80);
}

function startRecordingSubtitleTicker() {
  stopSubtitleTicker();
  renderSubtitle(0);
  state.subtitleTimer = window.setInterval(() => {
    const elapsed = (performance.now() - state.recordStartTime) / 1000;
    renderSubtitle(elapsed);
    if (elapsed >= getRecordDurationSeconds()) {
      stopSubtitleTicker();
    }
  }, 80);
}

function stopSubtitleTicker() {
  if (state.subtitleTimer) {
    window.clearInterval(state.subtitleTimer);
    state.subtitleTimer = null;
  }
}

function renderSubtitle(currentTime) {
  const words = state.referenceProfile?.words || [];
  if (!words.length) {
    els.subtitleBar.textContent = "원본 대사를 불러오는 중입니다.";
    return;
  }

  els.subtitleBar.innerHTML = words.map((word) => {
    const text = escapeHtml(word.word);
    let cls = "word";
    if (currentTime >= word.start && currentTime <= word.end) {
      cls += " active";
    } else if (currentTime > word.end) {
      cls += " done";
    }
    return `<span class="${cls}">${text}</span>`;
  }).join(" ");
}

function renderFeedback(details) {
  const items = [];
  if (details.pitch < 70) {
    items.push(`Pitch ${details.pitch}: 원본 pitch 흐름과 차이가 큽니다. 높아지는 구간과 낮아지는 구간을 더 크게 따라가보세요.`);
  } else {
    items.push(`Pitch ${details.pitch}: pitch 흐름은 꽤 잘 맞았습니다.`);
  }

  if (details.timing < 70) {
    items.push(`Duration ${details.timing}: 원본 발화 길이 ${details.ref_duration.toFixed(2)}초에 비해 내 발화가 ${details.usr_duration.toFixed(2)}초로 다릅니다.`);
  } else {
    items.push(`Duration ${details.timing}: 발화 길이는 원본과 잘 맞습니다.`);
  }

  if (details.energy < 70) {
    items.push(`Intensity ${details.energy}: 세기 변화가 원본보다 덜 살아있습니다. 강하게 치는 부분과 힘을 빼는 부분을 더 구분해보세요.`);
  } else {
    items.push(`Intensity ${details.energy}: 세기 변화가 안정적으로 맞았습니다.`);
  }

  if (details.content === null || details.content === undefined) {
    items.push("Pronunciation: 음성 인식 결과가 불안정해서 발음 일치도는 점수화하지 못했습니다.");
  } else if (details.content < 70) {
    items.push(`Pronunciation ${details.content}: 원본 문장과 다르게 인식된 부분이 있습니다. 자음과 모음이 뭉개지지 않게 또렷하게 말해보세요.`);
  } else {
    items.push(`Pronunciation ${details.content}: 원본 문장과 잘 맞게 인식됐습니다.`);
  }

  els.feedbackList.innerHTML = "";
  els.modalFeedbackList.innerHTML = "";
  state.resultFeedbackItems = items;
  for (const item of items) {
    const modalLi = document.createElement("li");
    modalLi.textContent = item;
    els.modalFeedbackList.appendChild(modalLi);
  }
}

function clearFeedback() {
  els.feedbackList.innerHTML = "";
  els.modalFeedbackList.innerHTML = "";
  state.resultFeedbackItems = [];
  els.feedbackPanel.classList.add("hidden");
  els.feedbackModal.classList.add("hidden");
}

function clearFeedbackDelayTimer() {
  if (state.feedbackDelayTimer) {
    window.clearTimeout(state.feedbackDelayTimer);
    state.feedbackDelayTimer = null;
  }
}

function clearReferenceFeedbackTimer() {
  if (state.referenceFeedbackTimer) {
    window.clearTimeout(state.referenceFeedbackTimer);
    state.referenceFeedbackTimer = null;
  }
}

function scheduleFeedbackModal() {
  clearFeedbackDelayTimer();
  state.feedbackDelayTimer = window.setTimeout(() => {
    state.feedbackDelayTimer = null;
    showFeedbackModal("피드백", state.resultFeedbackItems, "photo");
  }, 5000);
}

function scheduleReferenceFeedbackModal() {
  if (state.referenceFeedbackScheduled) return;
  state.referenceFeedbackScheduled = true;
  clearReferenceFeedbackTimer();
  state.referenceFeedbackTimer = window.setTimeout(() => {
    state.referenceFeedbackTimer = null;
    showReferenceFeedback();
  }, 3000);
}

function updatePhotoCard(data) {
  const challenge = data.challenge;
  const score = data.score;
  els.cardImage.src = `/api/image/${challenge.id}`;
  els.cardCharacter.textContent = `${challenge.character} Lv.${challenge.level}`;
  els.cardPhrase.textContent = challenge.title;
  els.cardScore.textContent = `${score}`;
  if (els.cardGrade) {
    els.cardGrade.textContent = "";
  }
  if (els.cardFeedbackList) {
    els.cardFeedbackList.innerHTML = "";
    for (const item of currentFeedbackItems(data.details)) {
      const li = document.createElement("li");
      li.textContent = item;
      els.cardFeedbackList.appendChild(li);
    }
  }
}

function currentFeedbackItems(details) {
  const items = [];
  if (details.pitch < 70) {
    items.push(`Pitch ${details.pitch}: 원본 pitch 흐름과 차이가 큽니다.`);
  } else {
    items.push(`Pitch ${details.pitch}: pitch 흐름이 잘 맞았습니다.`);
  }
  if (details.timing < 70) {
    items.push(`Duration ${details.timing}: 원본 길이와 다릅니다.`);
  } else {
    items.push(`Duration ${details.timing}: 발화 길이가 잘 맞습니다.`);
  }
  if (details.energy < 70) {
    items.push(`Intensity ${details.energy}: 세기 변화를 더 살려보세요.`);
  } else {
    items.push(`Intensity ${details.energy}: 세기 변화가 안정적입니다.`);
  }
  if (details.content === null || details.content === undefined) {
    items.push("Pronunciation: 발음 일치도는 분석하지 못했습니다.");
  } else if (details.content < 70) {
    items.push(`Pronunciation ${details.content}: 원본 문장과 다르게 들린 부분이 있습니다.`);
  } else {
    items.push(`Pronunciation ${details.content}: 원본 문장과 잘 맞게 인식됐습니다.`);
  }
  return items;
}

function scoreGrade(score) {
  if (score >= 95) return "S";
  if (score >= 85) return "A";
  if (score >= 70) return "B";
  if (score >= 55) return "C";
  if (score >= 40) return "D";
  return "RE";
}

function openPhotoCard() {
  showCardFace("front");
  els.photoCardModal.classList.remove("hidden");
}

function showCardFace(face) {
  const isFront = face === "front";
  els.photoCardFront?.classList.toggle("hidden", !isFront);
  els.photoCardBack?.classList.toggle("hidden", isFront);
  els.cardFrontTab?.classList.toggle("active", isFront);
  els.cardBackTab?.classList.toggle("active", !isFront);
}

function savePhotoCard() {
  const canvas = document.createElement("canvas");
  canvas.width = 900;
  canvas.height = 1260;
  const ctx = canvas.getContext("2d");
  drawFrontCard(ctx, canvas.width, canvas.height);
  const link = document.createElement("a");
  link.download = "shadowing-card.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
}

function drawFrontCard(ctx, width, height) {
  ctx.fillStyle = "#0d1117";
  ctx.fillRect(0, 0, width, height);
  const img = els.cardImage;
  if (img.complete && img.naturalWidth) {
    const scale = Math.max(width / img.naturalWidth, height / img.naturalHeight);
    const sw = width / scale;
    const sh = height / scale;
    const sx = (img.naturalWidth - sw) / 2;
    const sy = (img.naturalHeight - sh) / 2;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, width, height);
  }
  const gradient = ctx.createLinearGradient(0, height * 0.3, 0, height);
  gradient.addColorStop(0, "rgba(0,0,0,0.05)");
  gradient.addColorStop(1, "rgba(0,0,0,0.82)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 38px Arial";
  ctx.fillText(els.cardCharacter.textContent, 56, height - 310);
  ctx.font = "900 62px Arial";
  wrapCanvasText(ctx, els.cardPhrase.textContent, 56, height - 240, width - 112, 74);
  ctx.fillStyle = "#f1c40f";
  ctx.font = "900 120px Arial";
  ctx.fillText(els.cardScore.textContent, 56, height - 66);
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 42px Arial";
  ctx.fillText("#쉐도잉챌린지", 56, 86);
}

function drawBackCard(ctx, width, height) {
  ctx.fillStyle = "#0d1117";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "#30363d";
  ctx.lineWidth = 4;
  ctx.strokeRect(28, 28, width - 56, height - 56);
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 64px Arial";
  ctx.fillText("피드백", 58, 120);
  ctx.font = "700 34px Arial";
  let y = 210;
  const items = Array.from(els.cardFeedbackList.querySelectorAll("li")).map((li) => li.textContent);
  for (const item of items) {
    y = wrapCanvasText(ctx, `• ${item}`, 70, y, width - 140, 48) + 24;
  }
}

function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = String(text).split(" ");
  let line = "";
  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, y);
      line = word;
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  if (line) ctx.fillText(line, x, y);
  return y + lineHeight;
}

function shareX() {
  const text = encodeURIComponent(`${state.selected?.character || ""} 쉐도잉 챌린지 ${els.inlineScoreValue.textContent}점\n#쉐도잉챌린지`);
  window.open(`https://twitter.com/intent/tweet?text=${text}`, "_blank");
}

function shareInstagram() {
  savePhotoCard();
  window.open("https://www.instagram.com/", "_blank");
}

function showReferenceFeedback() {
  const points = state.referenceProfile?.feedback_points || [];
  if (!points.length) {
    showFeedbackModal("핵심포인트", ["원본 핵심 포인트를 아직 불러오지 못했습니다. 다시 원본 듣기를 눌러주세요."], "record");
    return;
  }
  showFeedbackModal("핵심포인트", points.map((point) => point.message), "record");
}

function showFeedbackModal(title, items, mode = "record") {
  els.feedbackModalTitle.replaceChildren();
  els.feedbackModalTitle.classList.toggle("red-dot-title", mode === "record");
  if (mode === "record") {
    const dot = document.createElement("span");
    dot.className = "red-dot-icon";
    dot.setAttribute("aria-hidden", "true");
    els.feedbackModalTitle.appendChild(dot);
  }
  els.feedbackModalTitle.appendChild(document.createTextNode(title));
  els.modalFeedbackList.innerHTML = "";
  for (const item of items) {
    const li = document.createElement("li");
    li.textContent = item;
    els.modalFeedbackList.appendChild(li);
  }
  els.startRecordingFromFeedbackBtn?.classList.toggle("hidden", mode !== "record");
  els.showPhotoCardBtn?.classList.toggle("hidden", mode !== "photo");
  els.closeFeedbackBtn?.classList.toggle("hidden", mode === "record");
  els.feedbackModal.classList.remove("hidden");
}

function setRecordStatus(message, warning = false, loading = false) {
  els.recordStatus.textContent = message;
  els.recordStatus.classList.toggle("warning", Boolean(warning));
  els.recordStatus.classList.toggle("loading", Boolean(loading));
}

function mergeChunks(chunks) {
  const length = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Float32Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

function encodeWav(samples, sampleRate) {
  const bytesPerSample = 2;
  const buffer = new ArrayBuffer(44 + samples.length * bytesPerSample);
  const view = new DataView(buffer);

  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + samples.length * bytesPerSample, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * bytesPerSample, true);
  view.setUint16(32, bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, "data");
  view.setUint32(40, samples.length * bytesPerSample, true);

  let offset = 44;
  for (const sample of samples) {
    const clipped = Math.max(-1, Math.min(1, sample));
    view.setInt16(offset, clipped < 0 ? clipped * 0x8000 : clipped * 0x7fff, true);
    offset += 2;
  }

  return new Blob([view], { type: "audio/wav" });
}

function writeString(view, offset, value) {
  for (let i = 0; i < value.length; i += 1) {
    view.setUint8(offset + i, value.charCodeAt(i));
  }
}

function drawGraph(canvas, data, pitchColor, visibleTime = null, markers = [], showCallouts = false) {
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);
  drawGrid(ctx, width, height);
  const maxTime = getSeriesMaxTime(data);
  drawSeries(ctx, data.intensity || [], "#f1c40f", width, height, maxTime, visibleTime);
  drawSeries(ctx, data.pitch || [], pitchColor, width, height, maxTime, visibleTime);
  drawMarkers(ctx, data, markers, width, height, maxTime, visibleTime, showCallouts);
}

function getSeriesMaxTime(data) {
  const all = [...(data.pitch || []), ...(data.intensity || [])];
  return Math.max(...all.map((point) => point.t || 0), 0.01);
}

function drawGrid(ctx, width, height) {
  ctx.strokeStyle = "rgba(240, 246, 252, 0.12)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= width; x += width / 8) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y <= height; y += height / 4) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
}

function drawSeries(ctx, series, color, width, height, maxT, visibleTime = null) {
  const points = series.filter((point) => {
    if (point.v === null) return false;
    if (visibleTime === null) return true;
    return point.t <= visibleTime;
  });
  if (points.length < 2) return;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  points.forEach((point, index) => {
    const x = (point.t / maxT) * width;
    const y = height - ((point.v - 50) / 350) * height;
    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.stroke();
}

function drawMarkers(ctx, data, markers, width, height, maxT, visibleTime = null, showCallouts = false) {
  if (!markers?.length) return;
  const visibleMarkers = markers.filter((marker) => {
    const time = Number(marker.time);
    if (!Number.isFinite(time)) return false;
    return visibleTime === null || time <= visibleTime;
  });

  visibleMarkers.forEach((marker, index) => {
    const time = Number(marker.time);
    const series = String(marker.kind || "").toLowerCase().includes("intensity")
      ? data.intensity || []
      : data.pitch || [];
    const value = nearestSeriesValue(series, time);
    if (value === null) return;

    const x = (time / maxT) * width;
    const y = height - ((value - 50) / 350) * height;
    const safeY = Math.max(10, Math.min(height - 10, y));
    ctx.save();
    ctx.fillStyle = "#e74c3c";
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, safeY, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  });
}

function nearestSeriesValue(series, time) {
  const points = (series || []).filter((point) => point.v !== null);
  if (!points.length) return null;
  let nearest = points[0];
  let minDistance = Math.abs((nearest.t || 0) - time);
  for (const point of points) {
    const distance = Math.abs((point.t || 0) - time);
    if (distance < minDistance) {
      nearest = point;
      minDistance = distance;
    }
  }
  return nearest.v;
}

function clearCanvas(canvas) {
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid(ctx, canvas.width, canvas.height);
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

els.recordBtn.addEventListener("click", toggleRecord);
els.playRefBtn.addEventListener("click", playReference);
els.backBtn.addEventListener("click", showCharacterScreen);
els.photoCardBtn?.addEventListener("click", openPhotoCard);
els.closePhotoCardBtn.addEventListener("click", () => {
  els.photoCardModal.classList.add("hidden");
});
els.cardFrontTab?.addEventListener("click", () => showCardFace("front"));
els.cardBackTab?.addEventListener("click", () => showCardFace("back"));
els.saveCardBtn.addEventListener("click", savePhotoCard);
els.shareXBtn.addEventListener("click", shareX);
els.shareInstagramBtn.addEventListener("click", shareInstagram);
els.photoCardModal.addEventListener("click", (event) => {
  if (event.target === els.photoCardModal) {
    els.photoCardModal.classList.add("hidden");
  }
});
els.referenceAudio.addEventListener("ended", () => {
  stopSubtitleTicker();
  stopRefGraphTicker();
  if (state.referenceProfile) {
    drawGraph(els.refGraph, state.referenceProfile.reference, "#3498db", null, state.referenceProfile.feedback_points || []);
    scheduleReferenceFeedbackModal();
  }
});
els.closeFeedbackBtn.addEventListener("click", () => {
  els.feedbackModal.classList.add("hidden");
});
els.startRecordingFromFeedbackBtn?.addEventListener("click", () => {
  clearReferenceFeedbackTimer();
  els.feedbackModal.classList.add("hidden");
});
els.showPhotoCardBtn?.addEventListener("click", () => {
  els.feedbackModal.classList.add("hidden");
  openPhotoCard();
});
els.feedbackModal.addEventListener("click", (event) => {
  if (event.target === els.feedbackModal) {
    els.feedbackModal.classList.add("hidden");
  }
});
loadChallenges().catch((error) => {
  els.status.textContent = error.message;
});
