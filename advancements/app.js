// GestureSpeak Core Application Logic

// Baseline Default Mappings
const DEFAULT_GESTURE_MAP = {
  open_hand: { label: 'Hello / Welcome', emoji: '🖐️', phrase: 'Hello' },
  thumbs_up: { label: 'Yes / Agree / Good', emoji: '👍', phrase: 'Yes' },
  thumbs_down: { label: 'No / Disagree / Bad', emoji: '👎', phrase: 'No' },
  peace_sign: { label: 'Peace / Victory', emoji: '✌️', phrase: 'Peace' },
  fist: { label: 'Stop / Hold on', emoji: '✊', phrase: 'Stop' },
  rock_on: { label: 'Awesome / Rock', emoji: '🤘', phrase: 'Awesome' },
  pointing_up: { label: 'Look / Question', emoji: '☝️', phrase: 'Look' }
};

// Active Mappings (Loaded dynamically)
let GESTURE_MAP = JSON.parse(JSON.stringify(DEFAULT_GESTURE_MAP));

function loadGestureMap() {
  const stored = localStorage.getItem('gesture_speak_map');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      // Merge values to ensure schema compatibility
      for (let key in DEFAULT_GESTURE_MAP) {
        if (parsed[key] && typeof parsed[key].phrase === 'string') {
          GESTURE_MAP[key].phrase = parsed[key].phrase;
          GESTURE_MAP[key].label = parsed[key].label || DEFAULT_GESTURE_MAP[key].label;
        }
      }
    } catch (e) {
      console.error("Failed to parse stored gesture map, resetting to defaults", e);
      localStorage.removeItem('gesture_speak_map');
    }
  }
}


// NLP Sentiment Lexicon
const sentimentLexicon = {
  'hello': 1.0,
  'welcome': 1.5,
  'yes': 1.0,
  'agree': 1.5,
  'good': 2.0,
  'peace': 1.5,
  'victory': 2.0,
  'awesome': 3.0,
  'rock': 2.0,
  'great': 2.0,
  'happy': 2.0,
  'love': 3.0,
  'cool': 1.5,
  'nice': 2.0,
  'excellent': 3.0,
  'like': 1.5,
  'no': -1.0,
  'disagree': -1.5,
  'bad': -2.0,
  'stop': -1.5,
  'hold': -0.5,
  'sad': -2.0,
  'angry': -2.5,
  'hate': -3.0,
  'wrong': -1.5,
  'fail': -2.0,
  'sorry': -1.0,
  'question': 0.0,
  'look': 0.0
};

// Web Audio API Context (Initialized on user interaction)
let audioCtx = null;

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playSynthSound(type) {
  if (!audioCtx) return;
  
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);

  if (type === 'tick') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, audioCtx.currentTime); // High tick
    gain.gain.setValueAtTime(0.02, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.04);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.04);
  } else if (type === 'success') {
    // Cyber-arpeggio
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
    osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.07); // E5
    osc.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.14); // G5
    osc.frequency.setValueAtTime(1046.50, audioCtx.currentTime + 0.21); // C6
    gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.4);
  } else if (type === 'click') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.05);
  }
}

// Global Application State Variables
let currentSentence = '';
let activeGesture = null;
let holdStartTime = null;
let cooldownTimer = null;
let lastGestureConfirmed = null;
let cooldownActive = false;

// MediaPipe Connection Lines Array
const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
  [0, 5], [5, 6], [6, 7], [7, 8], // Index
  [0, 9], [9, 10], [10, 11], [11, 12], // Middle
  [0, 13], [13, 14], [14, 15], [15, 16], // Ring
  [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
  [5, 9], [9, 13], [13, 17] // Knuckles connection
];

// Configuration variables (dynamically linked to settings sliders)
let lockHoldTime = 1200; // ms
let cooldownInterval = 2000; // ms
let isMirrorActive = true;
let isAutoSpeakActive = true;
let fpsLastTime = Date.now();
let fpsFrames = 0;

// DOM Elements Cache
let overlayEl, appContainerEl, btnStartEl;
let videoEl, canvasEl, ctx;
let activeEmojiEl, activeLabelEl, activeBadgeEl;
let sentenceDisplayEl, btnSpeakEl, btnClearEl, btnBackspaceEl, btnSpaceEl, btnCopyEl;
let sentimentEmojiEl, sentimentTitleEl, sentimentScoreEl, sentimentEmojiWrapperEl;
let posPctEl, posBarEl, neuPctEl, neuBarEl, negPctEl, negBarEl;
let logsFeedEl, btnClearLogsEl;
let progressContainerEl, progressRingCircleEl, progressEmojiEl;
let btnToggleSettingsEl, btnCloseSettingsEl, settingsDrawerEl;
let sliderHoldTimeEl, valHoldTimeEl, sliderCooldownEl, valCooldownEl;
let selectVoiceEl, sliderRateEl, valRateEl, sliderPitchEl, valPitchEl, sliderVolumeEl, valVolumeEl;
let toggleMirrorEl, toggleAutoSpeakEl;
let detectionAlertEl, detectionAlertTextEl;
let modelStatusDotEl, modelStatusTextEl, cameraStatusDotEl, cameraStatusTextEl, fpsCounterEl;

// Vocabulary Customization DOM elements
let vocabularyEditorEl, btnSaveVocabEl, btnExportVocabEl, btnImportVocabTriggerEl, fileImportVocabEl, btnResetVocabEl;

// Document Ready Initialization
document.addEventListener("DOMContentLoaded", () => {
  loadGestureMap();
  cacheDOM();
  renderVocabularyEditor();
  renderCheatSheet();
  bindUIEvents();
  initLucide();
});

function cacheDOM() {
  overlayEl = document.getElementById("onboarding-overlay");
  appContainerEl = document.querySelector(".app-container");
  btnStartEl = document.getElementById("btn-start");

  videoEl = document.getElementById("webcam");
  canvasEl = document.getElementById("canvas-overlay");
  ctx = canvasEl.getContext("2d");

  activeEmojiEl = document.getElementById("active-emoji");
  activeLabelEl = document.getElementById("active-label");
  activeBadgeEl = document.getElementById("active-gesture-badge");

  sentenceDisplayEl = document.getElementById("sentence-display");
  btnSpeakEl = document.getElementById("btn-speak");
  btnClearEl = document.getElementById("btn-clear");
  btnBackspaceEl = document.getElementById("btn-backspace");
  btnSpaceEl = document.getElementById("btn-space");
  btnCopyEl = document.getElementById("btn-copy");

  sentimentEmojiEl = document.getElementById("sentiment-emoji");
  sentimentTitleEl = document.getElementById("sentiment-title");
  sentimentScoreEl = document.getElementById("sentiment-score");
  sentimentEmojiWrapperEl = document.getElementById("sentiment-emoji-wrapper");
  posPctEl = document.getElementById("pos-pct");
  posBarEl = document.getElementById("pos-bar");
  neuPctEl = document.getElementById("neu-pct");
  neuBarEl = document.getElementById("neu-bar");
  negPctEl = document.getElementById("neg-pct");
  negBarEl = document.getElementById("neg-bar");

  logsFeedEl = document.getElementById("logs-feed");
  btnClearLogsEl = document.getElementById("btn-clear-logs");

  progressContainerEl = document.getElementById("progress-container");
  progressRingCircleEl = document.getElementById("progress-ring-circle");
  progressEmojiEl = document.getElementById("progress-emoji");

  btnToggleSettingsEl = document.getElementById("btn-toggle-settings");
  btnCloseSettingsEl = document.getElementById("btn-close-settings");
  settingsDrawerEl = document.getElementById("settings-drawer");

  sliderHoldTimeEl = document.getElementById("slider-hold-time");
  valHoldTimeEl = document.getElementById("val-hold-time");
  sliderCooldownEl = document.getElementById("slider-cooldown");
  valCooldownEl = document.getElementById("val-cooldown");

  selectVoiceEl = document.getElementById("select-voice");
  sliderRateEl = document.getElementById("slider-rate");
  valRateEl = document.getElementById("val-rate");
  sliderPitchEl = document.getElementById("slider-pitch");
  valPitchEl = document.getElementById("val-pitch");
  sliderVolumeEl = document.getElementById("slider-volume");
  valVolumeEl = document.getElementById("val-volume");

  toggleMirrorEl = document.getElementById("toggle-mirror");
  toggleAutoSpeakEl = document.getElementById("toggle-auto-speak");

  detectionAlertEl = document.getElementById("detection-alert");
  detectionAlertTextEl = document.getElementById("detection-alert-text");

  modelStatusDotEl = document.getElementById("model-status-dot");
  modelStatusTextEl = document.getElementById("model-status-text");
  cameraStatusDotEl = document.getElementById("camera-status-dot");
  cameraStatusTextEl = document.getElementById("camera-status-text");
  fpsCounterEl = document.getElementById("fps-counter");

  // Vocabulary custom mappings cache
  vocabularyEditorEl = document.getElementById("vocabulary-editor");
  btnSaveVocabEl = document.getElementById("btn-save-vocab");
  btnExportVocabEl = document.getElementById("btn-export-vocab");
  btnImportVocabTriggerEl = document.getElementById("btn-import-vocab-trigger");
  fileImportVocabEl = document.getElementById("file-import-vocab");
  btnResetVocabEl = document.getElementById("btn-reset-vocab");
}


function bindUIEvents() {
  btnStartEl.addEventListener("click", startApplication);

  // Settings Drawer Toggle
  btnToggleSettingsEl.addEventListener("click", () => {
    initAudio();
    playSynthSound('click');
    settingsDrawerEl.classList.add("open");
  });
  btnCloseSettingsEl.addEventListener("click", () => {
    playSynthSound('click');
    settingsDrawerEl.classList.remove("open");
  });

  // Settings Value Synchronization
  sliderHoldTimeEl.addEventListener("input", (e) => {
    lockHoldTime = parseInt(e.target.value);
    valHoldTimeEl.textContent = lockHoldTime;
  });
  sliderCooldownEl.addEventListener("input", (e) => {
    cooldownInterval = parseInt(e.target.value);
    valCooldownEl.textContent = cooldownInterval;
  });
  sliderRateEl.addEventListener("input", (e) => {
    valRateEl.textContent = parseFloat(e.target.value).toFixed(1);
  });
  sliderPitchEl.addEventListener("input", (e) => {
    valPitchEl.textContent = parseFloat(e.target.value).toFixed(1);
  });
  sliderVolumeEl.addEventListener("input", (e) => {
    valVolumeEl.textContent = parseFloat(e.target.value).toFixed(1);
  });

  // Toggles
  toggleMirrorEl.addEventListener("change", (e) => {
    isMirrorActive = e.target.checked;
    updateMirrorState();
  });
  toggleAutoSpeakEl.addEventListener("change", (e) => {
    isAutoSpeakActive = e.target.checked;
  });

  // Sentence Operations
  btnSpeakEl.addEventListener("click", () => {
    initAudio();
    playSynthSound('click');
    speakText(sentenceDisplayEl.innerText.trim());
  });
  btnClearEl.addEventListener("click", () => {
    playSynthSound('click');
    updateSentence('');
    addLog("Sentence cleared.", "system");
  });
  btnBackspaceEl.addEventListener("click", () => {
    playSynthSound('click');
    let words = sentenceDisplayEl.innerText.trim().split(/\s+/);
    words.pop();
    updateSentence(words.join(' '));
    addLog("Last word removed.", "system");
  });
  btnSpaceEl.addEventListener("click", () => {
    playSynthSound('click');
    const txt = sentenceDisplayEl.innerText;
    if (txt && !txt.endsWith(' ')) {
      updateSentence(txt + ' ');
    }
  });
  btnCopyEl.addEventListener("click", () => {
    playSynthSound('click');
    const textToCopy = sentenceDisplayEl.innerText.trim();
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy).then(() => {
        showToast("Copied to Clipboard", "copy");
        addLog("Sentence copied to clipboard.", "system");
      });
    }
  });

  // Manual Sentence Text Box Editing
  sentenceDisplayEl.addEventListener("input", () => {
    if (sentenceDisplayEl.innerText.trim() === '') {
      sentenceDisplayEl.classList.add("empty");
    } else {
      sentenceDisplayEl.classList.remove("empty");
    }
    currentSentence = sentenceDisplayEl.innerText;
    updateSentimentDashboard();
  });

  btnClearLogsEl.addEventListener("click", () => {
    playSynthSound('click');
    logsFeedEl.innerHTML = '';
    addLog("Log feed cleared.", "system");
  });

  // Dictionary clicks preview helper
  document.querySelectorAll(".cheat-item").forEach(item => {
    item.addEventListener("click", () => {
      initAudio();
      playSynthSound('click');
      const gesture = item.getAttribute("data-gesture");
      if (GESTURE_MAP.hasOwnProperty(gesture)) {
        const info = GESTURE_MAP[gesture];
        speakText(info.phrase);
      }
    });
  });

  // Load voices dynamically
  if (typeof speechSynthesis !== 'undefined' && speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = populateVoiceList;
  }

  // Bind custom vocabulary events
  btnSaveVocabEl.addEventListener("click", () => {
    initAudio();
    const inputs = vocabularyEditorEl.querySelectorAll(".vocab-input");
    inputs.forEach(input => {
      const key = input.getAttribute("data-key");
      const val = input.value.trim();
      if (val && GESTURE_MAP[key]) {
        GESTURE_MAP[key].phrase = val;
      }
    });
    localStorage.setItem('gesture_speak_map', JSON.stringify(GESTURE_MAP));
    renderCheatSheet();
    showToast("Vocabulary saved", "success");
    addLog("Custom vocabulary saved to local storage.", "system");
    playSynthSound('success');
  });

  btnResetVocabEl.addEventListener("click", () => {
    initAudio();
    playSynthSound('click');
    GESTURE_MAP = JSON.parse(JSON.stringify(DEFAULT_GESTURE_MAP));
    localStorage.removeItem('gesture_speak_map');
    renderVocabularyEditor();
    renderCheatSheet();
    showToast("Reset to defaults", "success");
    addLog("Vocabulary reset to default universal mappings.", "system");
  });

  btnExportVocabEl.addEventListener("click", () => {
    initAudio();
    playSynthSound('click');
    const exportData = {};
    for (let key in GESTURE_MAP) {
      exportData[key] = { phrase: GESTURE_MAP[key].phrase };
    }
    const jsonStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement("a");
    a.href = url;
    a.download = "gesture_speak_dictionary.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast("Settings exported", "copy");
    addLog("Custom dictionary exported to file.", "system");
  });

  btnImportVocabTriggerEl.addEventListener("click", () => {
    initAudio();
    playSynthSound('click');
    fileImportVocabEl.click();
  });

  fileImportVocabEl.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(evt) {
      try {
        const parsed = JSON.parse(evt.target.result);
        let updated = false;
        for (let key in DEFAULT_GESTURE_MAP) {
          if (parsed[key] && typeof parsed[key].phrase === 'string') {
            GESTURE_MAP[key].phrase = parsed[key].phrase;
            updated = true;
          }
        }
        if (updated) {
          localStorage.setItem('gesture_speak_map', JSON.stringify(GESTURE_MAP));
          renderVocabularyEditor();
          renderCheatSheet();
          showToast("Vocabulary imported", "success");
          addLog("Vocabulary settings loaded successfully from file.", "system");
          playSynthSound('success');
        } else {
          showToast("Invalid dictionary structure", "error");
        }
      } catch (err) {
        console.error(err);
        showToast("Failed to parse file", "error");
      }
      fileImportVocabEl.value = '';
    };
    reader.readAsText(file);
  });
}

function renderVocabularyEditor() {
  if (!vocabularyEditorEl) return;
  vocabularyEditorEl.innerHTML = '';
  for (let key in GESTURE_MAP) {
    const item = GESTURE_MAP[key];
    const row = document.createElement("div");
    row.className = "vocab-row";
    row.innerHTML = `
      <span class="vocab-emoji" title="${item.label}">${item.emoji}</span>
      <input type="text" class="vocab-input" data-key="${key}" value="${item.phrase}" placeholder="Translation phrase...">
    `;
    vocabularyEditorEl.appendChild(row);
  }
}

function renderCheatSheet() {
  for (let key in GESTURE_MAP) {
    const item = GESTURE_MAP[key];
    const cheatEl = document.querySelector(`.cheat-item[data-gesture="${key}"]`);
    if (cheatEl) {
      const detailsEl = cheatEl.querySelector(".cheat-details p");
      if (detailsEl) {
        detailsEl.textContent = `"${item.phrase}"`;
      }
      const titleEl = cheatEl.querySelector(".cheat-details h4");
      if (titleEl) {
        titleEl.textContent = item.label;
      }
    }
  }
}


function initLucide() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

// Start app stream
function startApplication() {
  overlayEl.classList.add("fade-out");
  appContainerEl.classList.remove("hidden");
  
  // Initialize synthesizers
  initAudio();
  playSynthSound('success');

  // Trigger TTS activation
  speakText("");

  // Populate voices list
  populateVoiceList();

  // Setup MediaPipe
  initMediaPipe();
}

function updateMirrorState() {
  const container = document.querySelector(".video-container");
  if (isMirrorActive) {
    container.classList.add("mirrored");
  } else {
    container.classList.remove("mirrored");
  }
}

// Speech Synthesis Voice Loading
function populateVoiceList() {
  if (typeof speechSynthesis === 'undefined') return;
  const voices = speechSynthesis.getVoices();
  selectVoiceEl.innerHTML = '';
  
  voices.forEach(voice => {
    const option = document.createElement('option');
    option.textContent = `${voice.name} (${voice.lang})`;
    option.value = voice.name;
    if (voice.default) {
      option.selected = true;
    }
    selectVoiceEl.appendChild(option);
  });
}

function speakText(text) {
  if (typeof speechSynthesis === 'undefined') return;
  if (!text) return;

  speechSynthesis.cancel(); // Terminate ongoing speech
  
  const utterance = new SpeechSynthesisUtterance(text);
  const selectedVoiceName = selectVoiceEl.value;
  const voices = speechSynthesis.getVoices();
  const voice = voices.find(v => v.name === selectedVoiceName);
  
  if (voice) utterance.voice = voice;
  utterance.rate = parseFloat(sliderRateEl.value);
  utterance.pitch = parseFloat(sliderPitchEl.value);
  utterance.volume = parseFloat(sliderVolumeEl.value);

  speechSynthesis.speak(utterance);
  addLog(`Speech: "${text}"`, 'speech');
}

// Activity Log Updates
function addLog(message, type = 'action') {
  const now = new Date();
  const timeStr = now.toTimeString().split(' ')[0];
  
  const entry = document.createElement("div");
  entry.className = `log-entry ${type}`;
  entry.innerHTML = `
    <span class="log-time">[${timeStr}]</span>
    <span class="log-message">${message}</span>
  `;
  
  logsFeedEl.appendChild(entry);
  logsFeedEl.scrollTop = logsFeedEl.scrollHeight;
}

// MediaPipe Hands Integration
function initMediaPipe() {
  addLog("Loading MediaPipe Hands model...", "system");
  
  const hands = new Hands({
    locateFile: (file) => {
      return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
    }
  });

  hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.75,
    minTrackingConfidence: 0.75
  });

  hands.onResults(onHandResults);

  // Initialize Camera stream
  const camera = new Camera(videoEl, {
    onFrame: async () => {
      await hands.send({ image: videoEl });
    },
    width: 640,
    height: 480
  });

  camera.start()
    .then(() => {
      addLog("Webcam stream started successfully.", "system");
      cameraStatusDotEl.className = "status-dot green";
      cameraStatusTextEl.textContent = "Camera Active";
      updateMirrorState();
    })
    .catch(err => {
      console.error(err);
      addLog("Error: Camera access was denied or failed to initialize.", "system");
      cameraStatusDotEl.className = "status-dot pulse-yellow";
      cameraStatusTextEl.textContent = "Camera Denied";
      showToast("Webcam Access Failed", "error");
    });
}

// Core MediaPipe Landmark Callback
function onHandResults(results) {
  // Update model status badge to green on first results frame
  if (modelStatusDotEl.classList.contains("pulse-yellow")) {
    modelStatusDotEl.className = "status-dot pulse-green";
    modelStatusTextEl.textContent = "Model Ready";
    addLog("Hand detection model successfully loaded.", "system");
  }

  // Calculate FPS
  const timeNow = Date.now();
  fpsFrames++;
  if (timeNow > fpsLastTime + 1000) {
    const fps = Math.round((fpsFrames * 1000) / (timeNow - fpsLastTime));
    fpsCounterEl.textContent = `${fps} FPS`;
    fpsFrames = 0;
    fpsLastTime = timeNow;
  }

  // Clear Canvas Overlay
  ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
  
  // Fit canvas sizes to render matches
  if (canvasEl.width !== videoEl.videoWidth || canvasEl.height !== videoEl.videoHeight) {
    canvasEl.width = videoEl.videoWidth;
    canvasEl.height = videoEl.videoHeight;
  }

  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    const landmarks = results.multiHandLandmarks[0];
    
    // Draw Hand Mesh / Skeleton
    drawHandSkeleton(landmarks);

    // Classify Gesture
    const gesture = classifyGesture(landmarks);
    handleGestureMatching(gesture);
  } else {
    // No hand detected
    handleGestureMatching(null);
  }
}

// Draw futuristic skeleton mesh on canvas
function drawHandSkeleton(landmarks) {
  // Draw Connection Lines
  ctx.strokeStyle = 'rgba(6, 182, 212, 0.65)'; // Neon cyan link lines
  ctx.lineWidth = 4;
  ctx.shadowBlur = 10;
  ctx.shadowColor = '#06b6d4';
  
  HAND_CONNECTIONS.forEach(([startIdx, endIdx]) => {
    const startPt = landmarks[startIdx];
    const endPt = landmarks[endIdx];
    
    ctx.beginPath();
    ctx.moveTo(startPt.x * canvasEl.width, startPt.y * canvasEl.height);
    ctx.lineTo(endPt.x * canvasEl.width, endPt.y * canvasEl.height);
    ctx.stroke();
  });

  // Draw Glowing Nodes (Joint Landmarks)
  ctx.shadowBlur = 8;
  ctx.shadowColor = '#8b5cf6';
  
  landmarks.forEach((pt, index) => {
    ctx.fillStyle = '#ffffff';
    // Thumb tip or finger tips in violet, joints in white
    const isTip = [4, 8, 12, 16, 20].includes(index);
    ctx.fillStyle = isTip ? '#a855f7' : '#06b6d4';
    
    ctx.beginPath();
    ctx.arc(pt.x * canvasEl.width, pt.y * canvasEl.height, isTip ? 6 : 4, 0, 2 * Math.PI);
    ctx.fill();
    
    // Add thin white border around nodes
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();
  });
  
  // Reset shadow attributes
  ctx.shadowBlur = 0;
}

// Geometric distance utility
function getDistance(p1, p2) {
  return Math.sqrt(
    Math.pow(p1.x - p2.x, 2) +
    Math.pow(p1.y - p2.y, 2) +
    Math.pow(p1.z - p2.z, 2)
  );
}

// Geometric hand states classifier
function getHandState(landmarks) {
  // Determine if index, middle, ring, pinky fingers are extended
  // Extended state criteria: tip is higher (smaller y-value) than PIP, which is higher than MCP
  const indexExtended = landmarks[8].y < landmarks[6].y && landmarks[6].y < landmarks[5].y;
  const middleExtended = landmarks[12].y < landmarks[10].y && landmarks[10].y < landmarks[9].y;
  const ringExtended = landmarks[16].y < landmarks[14].y && landmarks[14].y < landmarks[13].y;
  const pinkyExtended = landmarks[20].y < landmarks[18].y && landmarks[18].y < landmarks[17].y;

  // Determine if thumb is extended
  // Standard metric: horizontal stretch. Calculate distance between thumb tip (4) and Index MCP (5).
  // Stretch distance compared against thumb knuckle base MCP (2) to Index MCP (5).
  const thumbTipIndexDist = getDistance(landmarks[4], landmarks[5]);
  const thumbBaseIndexDist = getDistance(landmarks[2], landmarks[5]);
  const thumbExtended = thumbTipIndexDist > thumbBaseIndexDist * 1.15;

  return {
    thumb: thumbExtended,
    index: indexExtended,
    middle: middleExtended,
    ring: ringExtended,
    pinky: pinkyExtended
  };
}

function classifyGesture(landmarks) {
  const state = getHandState(landmarks);

  // 1. Open Hand (🖐️): All four finger extensions are active
  if (state.index && state.middle && state.ring && state.pinky) {
    return 'open_hand';
  }

  // 2. Peace Sign (✌️): Index & Middle extended, Ring & Pinky folded
  if (state.index && state.middle && !state.ring && !state.pinky) {
    return 'peace_sign';
  }

  // 3. Rock On (🤘): Index & Pinky extended, Middle & Ring folded
  if (state.index && !state.middle && !state.ring && state.pinky) {
    return 'rock_on';
  }

  // 4. Pointing Up (☝️): Only Index extended, others folded
  if (state.index && !state.middle && !state.ring && !state.pinky) {
    return 'pointing_up';
  }

  // 5. Thumbs Up / Down / Fist: all standard knuckles folded
  if (!state.index && !state.middle && !state.ring && !state.pinky) {
    if (state.thumb) {
      // Analyze orientation: Thumbs Up has tip higher than knuckle, Thumbs Down is opposite
      if (landmarks[4].y < landmarks[2].y) {
        return 'thumbs_up';
      } else {
        return 'thumbs_down';
      }
    } else {
      return 'fist';
    }
  }

  return null;
}

// Logic coordinator for debounce locks & cooldown cycles
function handleGestureMatching(gesture) {
  // If a cooldown timer is active, block new registrations but allow real-time UI feed updates
  if (cooldownActive) {
    // Show current state but dim active badge
    if (gesture && GESTURE_MAP[gesture]) {
      const info = GESTURE_MAP[gesture];
      activeEmojiEl.textContent = info.emoji;
      activeLabelEl.textContent = `${info.label} (Cooldown)`;
      activeBadgeEl.className = "detected-badge glass";
    } else {
      activeEmojiEl.textContent = "🔍";
      activeLabelEl.textContent = "Scanning...";
      activeBadgeEl.className = "detected-badge glass";
    }
    progressContainerEl.style.display = 'none';
    return;
  }

  if (gesture && GESTURE_MAP.hasOwnProperty(gesture)) {
    const info = GESTURE_MAP[gesture];
    
    // Update live badge immediately
    activeEmojiEl.textContent = info.emoji;
    activeLabelEl.textContent = info.label;
    activeBadgeEl.classList.add("active-detect");

    // Gesture Confirmation Loop (Hold Lock)
    if (activeGesture === gesture) {
      const elapsed = Date.now() - holdStartTime;
      
      // Update circular progress GUI
      progressContainerEl.style.display = 'flex';
      progressEmojiEl.textContent = info.emoji;
      
      const pct = Math.min((elapsed / lockHoldTime) * 100, 100);
      const strokePerimeter = 314.15; // 2 * Math.PI * 50
      const offset = strokePerimeter - (pct / 100) * strokePerimeter;
      progressRingCircleEl.style.strokeDashoffset = offset;
      
      // Highlight cheat-sheet card
      highlightDictionaryItem(gesture);

      // Play soft synth ticks as indicator of holding lock
      if (Math.floor(elapsed) % 300 < 30) {
        initAudio();
        playSynthSound('tick');
      }

      if (elapsed >= lockHoldTime) {
        confirmGesture(gesture);
      }
    } else {
      // Reset timer for new gesture matching
      activeGesture = gesture;
      holdStartTime = Date.now();
    }
  } else {
    // No hand or unclassified shape: reset loop values
    activeGesture = null;
    activeEmojiEl.textContent = "🔍";
    activeLabelEl.textContent = "Scanning...";
    activeBadgeEl.className = "detected-badge glass";
    progressContainerEl.style.display = 'none';
    removeDictionaryHighlights();
  }
}

// Add word/phrase to sentence & lock cooldowns
function confirmGesture(gesture) {
  const info = GESTURE_MAP[gesture];
  if (!info) return;

  // Add beep confirmation sound
  initAudio();
  playSynthSound('success');

  // Display glowing alert toast
  showToast(`Added: "${info.phrase}"`, "success");
  
  // Append phrase to sentence display
  let cleanText = sentenceDisplayEl.innerText.trim();
  
  // If the sentence display holds a placeholder style, wipe it
  if (sentenceDisplayEl.classList.contains("empty")) {
    cleanText = "";
    sentenceDisplayEl.classList.remove("empty");
  }

  // Prepend spacer if necessary
  if (cleanText !== "" && !cleanText.endsWith(" ")) {
    cleanText += " ";
  }
  
  cleanText += info.phrase;
  updateSentence(cleanText);

  // Trigger TTS voice
  if (isAutoSpeakActive) {
    speakText(info.phrase);
  }

  addLog(`Detected "${info.label}" ➔ Added "${info.phrase}"`, 'action');

  // Trigger temporary lock cooldown to avoid double captures
  cooldownActive = true;
  activeGesture = null;
  progressContainerEl.style.display = 'none';
  
  clearTimeout(cooldownTimer);
  cooldownTimer = setTimeout(() => {
    cooldownActive = false;
    addLog("Cooldown expired. Ready for next input.", "system");
  }, cooldownInterval);
}

function updateSentence(text) {
  currentSentence = text;
  sentenceDisplayEl.innerText = text;
  
  if (text === '') {
    sentenceDisplayEl.classList.add("empty");
  } else {
    sentenceDisplayEl.classList.remove("empty");
  }

  updateSentimentDashboard();
}

// Local lexicon-based NLP Sentiment Analyzer
function analyzeSentiment(text) {
  const clean = text.trim();
  if (!clean) {
    return { score: 0.0, label: 'Neutral / Awaiting Input', emoji: '😐', pos: 33.3, neu: 33.4, neg: 33.3 };
  }

  // Tokenize string
  const words = clean.toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
    .split(/\s+/);

  let totalScore = 0;
  let posWeight = 0;
  let negWeight = 0;
  let neuWeight = 0;

  words.forEach(word => {
    if (sentimentLexicon.hasOwnProperty(word)) {
      const val = sentimentLexicon[word];
      totalScore += val;
      if (val > 0) {
        posWeight += val;
      } else if (val < 0) {
        negWeight += Math.abs(val);
      } else {
        neuWeight += 1;
      }
    } else {
      // Unrecognized words count as neutral buffer weight
      neuWeight += 1;
    }
  });

  const totalWeight = posWeight + negWeight + neuWeight;
  const posPct = totalWeight > 0 ? (posWeight / totalWeight) * 100 : 33.3;
  const negPct = totalWeight > 0 ? (negWeight / totalWeight) * 100 : 33.3;
  const neuPct = totalWeight > 0 ? (neuWeight / totalWeight) * 100 : 33.4;

  let label = 'Neutral';
  let emoji = '😐';
  
  if (totalScore > 0.4) {
    label = 'Positive';
    emoji = '😊';
    if (totalScore > 2.0) {
      label = 'Highly Positive';
      emoji = '🔥';
    }
  } else if (totalScore < -0.4) {
    label = 'Negative';
    emoji = '🙁';
    if (totalScore < -2.0) {
      label = 'Highly Negative';
      emoji = '⚠️';
    }
  }

  return {
    score: totalScore.toFixed(1),
    label: label,
    emoji: emoji,
    pos: posPct,
    neu: neuPct,
    neg: negPct
  };
}

// Update sentiment charts and graphics
function updateSentimentDashboard() {
  const result = analyzeSentiment(currentSentence);
  
  sentimentTitleEl.textContent = result.label;
  sentimentScoreEl.textContent = `Score: ${result.score}`;
  sentimentEmojiEl.textContent = result.emoji;

  // Animate gauges & scores
  posPctEl.textContent = `${Math.round(result.pos)}%`;
  posBarEl.style.width = `${result.pos}%`;

  neuPctEl.textContent = `${Math.round(result.neu)}%`;
  neuBarEl.style.width = `${result.neu}%`;

  negPctEl.textContent = `${Math.round(result.neg)}%`;
  negBarEl.style.width = `${result.neg}%`;

  // Update glowing ring color depending on tone
  sentimentEmojiWrapperEl.className = 'sentiment-emoji-wrapper';
  if (parseFloat(result.score) > 0.4) {
    sentimentEmojiWrapperEl.classList.add("pos-glow");
  } else if (parseFloat(result.score) < -0.4) {
    sentimentEmojiWrapperEl.classList.add("neg-glow");
  }
}

// Visual highlighting guides for Dictionary items
function highlightDictionaryItem(gesture) {
  removeDictionaryHighlights();
  const cheatEl = document.querySelector(`.cheat-item[data-gesture="${gesture}"]`);
  if (cheatEl) {
    cheatEl.style.backgroundColor = 'rgba(99, 102, 241, 0.15)';
    cheatEl.style.borderColor = 'rgba(99, 102, 241, 0.5)';
    cheatEl.style.boxShadow = '0 0 15px rgba(99, 102, 241, 0.2)';
    cheatEl.style.transform = 'translateY(-3px)';
  }
}

function removeDictionaryHighlights() {
  document.querySelectorAll(".cheat-item").forEach(el => {
    el.style.backgroundColor = '';
    el.style.borderColor = '';
    el.style.boxShadow = '';
    el.style.transform = '';
  });
}

// Mini alerts inside the canvas view
let toastTimeout;
function showToast(text, type = "success") {
  clearTimeout(toastTimeout);
  detectionAlertTextEl.textContent = text;
  detectionAlertEl.style.display = "flex";
  
  // Custom colors depending on message nature
  if (type === "error") {
    detectionAlertEl.style.background = "linear-gradient(135deg, #f43f5e, #e11d48)";
    detectionAlertEl.style.boxShadow = "0 10px 25px rgba(244, 63, 94, 0.4)";
  } else if (type === "copy") {
    detectionAlertEl.style.background = "linear-gradient(135deg, #8b5cf6, #6d28d9)";
    detectionAlertEl.style.boxShadow = "0 10px 25px rgba(139, 92, 246, 0.4)";
  } else {
    detectionAlertEl.style.background = "linear-gradient(135deg, #06b6d4, #3b82f6)";
    detectionAlertEl.style.boxShadow = "0 10px 25px rgba(6, 182, 212, 0.4)";
  }

  toastTimeout = setTimeout(() => {
    detectionAlertEl.style.display = "none";
  }, 2200);
}
