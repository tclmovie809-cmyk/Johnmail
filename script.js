"use strict";

/* =========================================
   MESSENGER NI JOHN REYNARD
   Personal demo — GitHub Pages compatible
   ========================================= */

const $ = (selector) => document.querySelector(selector);

const friends = [
  {
    id: "xelamarie",
    name: "Xelamarie Roco",
    image: "xelamarie.jpg",
    pinned: true,
    unread: 50,
    preview: "50 new messages",
    time: "Now",
    initialMessages: []
  },
  {
    id: "jester",
    name: "Jester Melendres",
    image: "jester.jpg",
    pinned: false,
    unread: 0,
    preview: "Hello",
    time: "20 mins ago",
    initialMessages: [
      { type: "call", text: "Audio call", detail: "20 mins ago" },
      { type: "text", text: "Hello", mine: false }
    ]
  },
  {
    id: "carl",
    name: "Carl JAMES",
    image: "friends.jpg",
    pinned: false,
    unread: 0,
    preview: "Tap to open conversation",
    time: "",
    initialMessages: []
  },
  {
    id: "grade10",
    name: "Grade 10 Einstein",
    image: "friends.jpg",
    pinned: false,
    unread: 0,
    preview: "Tap to open conversation",
    time: "",
    initialMessages: []
  },
  {
    id: "bingkay",
    name: "Bingkay Rivera Miras",
    image: "friends.jpg",
    pinned: false,
    unread: 0,
    preview: "Tap to open conversation",
    time: "",
    initialMessages: []
  },
  {
    id: "alynah",
    name: "Alynah Alcala",
    image: "friends.jpg",
    pinned: false,
    unread: 0,
    preview: "Tap to open conversation",
    time: "",
    initialMessages: []
  },
  {
    id: "althea",
    name: "Althea Mae Cullamat",
    image: "friends.jpg",
    pinned: false,
    unread: 0,
    preview: "Tap to open conversation",
    time: "",
    initialMessages: []
  }
];

const state = {
  currentFriend: null,
  callType: "video",
  callActive: false,
  callConnected: false,
  soundEnabled: true,
  glowEnabled: true,
  muted: false,
  speakerEnabled: true,
  cameraEnabled: false,
  localStream: null,
  callStartTime: 0,
  callInterval: null,
  introTimeout: null,
  videoStarted: false,
  messages: {},
  toastTimeout: null
};

/* ---------- SAFE MEDIA FALLBACK ---------- */

function fallbackImage(label) {
  const initials = label
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(word => word[0])
    .join("")
    .toUpperCase();

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#9e48ed"/>
          <stop offset="100%" stop-color="#18082b"/>
        </linearGradient>
      </defs>
      <rect width="200" height="200" rx="100" fill="url(#g)"/>
      <circle cx="100" cy="100" r="86"
        fill="none" stroke="#e0a8ff" stroke-width="3"/>
      <text x="100" y="119" text-anchor="middle"
        font-family="sans-serif" font-size="58"
        font-weight="bold" fill="#ffffff">${initials}</text>
    </svg>`;

  return "data:image/svg+xml;charset=UTF-8," +
    encodeURIComponent(svg);
}

function setImage(image, filename, label) {
  if (!image) return;

  image.onerror = () => {
    image.onerror = null;
    image.src = fallbackImage(label);
  };

  image.src = filename;
  image.alt = label;
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

/* ---------- NOTIFICATIONS ---------- */

function showToast(message) {
  const toast = $("#toast");
  if (!toast) return;

  toast.textContent = message;
  toast.classList.remove("hidden");

  clearTimeout(state.toastTimeout);
  state.toastTimeout = setTimeout(() => {
    toast.classList.add("hidden");
  }, 2600);
}

/* ---------- FRIEND LIST ---------- */

function renderFriends(filter = "") {
  const list = $("#friendsList");
  if (!list) return;

  const query = filter.trim().toLowerCase();

  const filtered = friends.filter(friend =>
    friend.name.toLowerCase().includes(query)
  );

  filtered.sort((a, b) =>
    Number(b.pinned) - Number(a.pinned)
  );

  list.innerHTML = "";

  filtered.forEach(friend => {
    const row = document.createElement("button");
    row.type = "button";
    row.className =
      "friend-row" + (friend.pinned ? " pinned" : "");

    row.innerHTML = `
      <div class="avatar-wrap">
        <img class="avatar"
          src="${escapeHTML(friend.image)}"
          alt="${escapeHTML(friend.name)}">
        ${friend.id === "jester"
          ? '<span class="online-dot"></span>'
          : ""}
      </div>

      <div class="friend-info">
        <span class="friend-name">
          ${escapeHTML(friend.name)}
          ${friend.pinned
            ? '<span class="pin-mark">◆ PINNED</span>'
            : ""}
        </span>
        <span class="friend-preview">
          ${escapeHTML(friend.preview)}
        </span>
      </div>

      <div class="friend-meta">
        <span class="friend-time">
          ${escapeHTML(friend.time)}
        </span>
        ${friend.unread > 0
          ? `<span class="unread-badge">
              ${friend.unread} new messages
            </span>`
          : ""}
      </div>
    `;

    const img = row.querySelector("img");
    img.onerror = () => {
      img.onerror = null;
      img.src = fallbackImage(friend.name);
    };

    row.addEventListener("click", () => openConversation(friend.id));
    list.appendChild(row);
  });

  $("#emptySearch")?.classList.toggle(
    "hidden",
    filtered.length !== 0
  );
}

/* ---------- STORIES ---------- */

function renderStories() {
  const container = $("#storiesRow");
  if (!container) return;

  const stories = [
    { name: "Your story", image: "john.jpg", id: "john" },
    { name: "Xelamarie", image: "xelamarie.jpg", id: "xelamarie" },
    { name: "Jester", image: "jester.jpg", id: "jester" },
    { name: "Carl JAMES", image: "friends.jpg", id: "carl" },
    { name: "Althea Mae", image: "friends.jpg", id: "althea" }
  ];

  container.innerHTML = "";

  stories.forEach(story => {
    const button = document.createElement("button");
    button.className = "story";
    button.type = "button";

    button.innerHTML = `
      <span class="story-picture">
        <img src="${escapeHTML(story.image)}"
             alt="${escapeHTML(story.name)}">
        ${story.id === "john"
          ? '<span class="online-dot"></span>'
          : ""}
      </span>
      <span class="story-name">${escapeHTML(story.name)}</span>
    `;

    const img = button.querySelector("img");
    img.onerror = () => {
      img.onerror = null;
      img.src = fallbackImage(story.name);
    };

    button.addEventListener("click", () => {
      if (story.id === "john") {
        showScreen("profileScreen");
      } else {
        openConversation(story.id);
      }
    });

    container.appendChild(button);
  });
}

/* ---------- NAVIGATION ---------- */

function showScreen(screenId) {
  if (state.currentFriend &&
      screenId !== "conversationScreen" &&
      state.callActive) {
    // A call stays open while navigating the app.
  }

  document.querySelectorAll(".screen").forEach(screen => {
    screen.classList.toggle("active", screen.id === screenId);
  });

  document.querySelectorAll(".nav-item").forEach(button => {
    button.classList.toggle(
      "selected",
      button.dataset.screen === screenId
    );
  });

  $("#bottomNav")?.classList.toggle(
    "hidden",
    screenId === "conversationScreen" ||
    screenId === "profileScreen"
  );

  if (screenId === "peopleScreen") renderPeople();
}

function renderPeople() {
  const container = $("#peopleList");
  if (!container) return;

  container.innerHTML = "";

  friends.forEach(friend => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "menu-item";
    button.textContent = "◉ " + friend.name;
    button.addEventListener("click", () => {
      openConversation(friend.id);
    });
    container.appendChild(button);
  });
}

function openConversation(friendId) {
  const friend = friends.find(item => item.id === friendId);

  if (!friend) {
    showToast("Hindi makita ang conversation.");
    return;
  }

  state.currentFriend = friend;
  friend.unread = 0;

  $("#conversationName").textContent = friend.name;
  $("#conversationStatus").textContent =
    friend.id === "jester"
      ? "Messenger friend"
      : "Conversation";

  setImage(
    $("#conversationAvatar"),
    friend.image,
    friend.name
  );

  if (!state.messages[friend.id]) {
    state.messages[friend.id] =
      friend.initialMessages.map(message => ({ ...message }));
  }

  showScreen("conversationScreen");
  renderMessages();
  renderFriends($("#searchInput").value);

  if (friend.id === "jester") {
    $("#videoCallBtn").classList.remove("hidden");
    $("#audioCallBtn").classList.remove("hidden");
  }
}

/* ---------- MESSAGES ---------- */

function renderMessages() {
  const container = $("#chatMessages");
  const friend = state.currentFriend;

  if (!container || !friend) return;

  const messages = state.messages[friend.id] || [];

  container.innerHTML = `
    <div class="chat-date">Messenger · Personal demo</div>
  `;

  messages.forEach(message => {
    const row = document.createElement("div");

    if (message.type === "call") {
      row.className = "call-history";
      row.innerHTML = `
        <div class="call-history-icon">☎</div>
        <div>
          <strong>${escapeHTML(message.text)}</strong>
          <small>${escapeHTML(message.detail || "")}</small>
        </div>
      `;
    } else {
      row.className =
        "message-row" + (message.mine ? " mine" : "");

      row.innerHTML = `
        ${message.mine ? "" : `
          <img class="message-mini-avatar"
               src="${escapeHTML(friend.image)}"
               alt="">
        `}
        <div class="message-bubble">
          ${escapeHTML(message.text)}
        </div>
      `;

      if (!message.mine) {
        const img = row.querySelector("img");
        img.onerror = () => {
          img.onerror = null;
          img.src = fallbackImage(friend.name);
        };
      }
    }

    container.appendChild(row);
  });

  container.scrollTop = container.scrollHeight;
}

function sendMessage(event) {
  event.preventDefault();

  const input = $("#messageInput");
  const text = input.value.trim();

  if (!text) return;

  if (!state.currentFriend) {
    showToast("Pumili muna ng friend.");
    return;
  }

  const friend = state.currentFriend;

  state.messages[friend.id].push({
    type: "text",
    text,
    mine: true
  });

  friend.preview = text;
  friend.time = "Now";

  input.value = "";
  renderMessages();
  renderFriends($("#searchInput").value);
}

function addCallHistory(friend, type) {
  if (!state.messages[friend.id]) {
    state.messages[friend.id] = [];
  }

  state.messages[friend.id].push({
    type: "call",
    text: type === "video" ? "Video call" : "Audio call",
    detail: "Just now"
  });

  friend.preview = type === "video"
    ? "Video call"
    : "Audio call";

  friend.time = "Now";

  renderMessages();
  renderFriends($("#searchInput").value);
}

/* ---------- SOUND ---------- */

function playCallSound() {
  if (!state.soundEnabled) return;

  const audio = $("#callAudio");
  if (!audio) return;

  audio.currentTime = 0;
  audio.volume = state.speakerEnabled ? 1 : 0.25;

  const promise = audio.play();

  if (promise && typeof promise.catch === "function") {
    promise.catch(() => {
      showToast("Hindi ma-play ang sound. Suriin ang call-sound.mp3.");
    });
  }
}

function stopCallSound() {
  const audio = $("#callAudio");
  if (!audio) return;

  audio.pause();
  audio.currentTime = 0;
}

/* ---------- CALL SCREEN ---------- */

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return String(mins).padStart(2, "0") + ":" +
         String(secs).padStart(2, "0");
}

function updateCallTimer() {
  if (!state.callActive || !state.callStartTime) return;

  const seconds = Math.floor(
    (Date.now() - state.callStartTime) / 1000
  );

  $("#callTimer").textContent = formatTime(seconds);
}

function openCallScreen(type) {
  const friend = state.currentFriend;

  if (!friend) {
    showToast("Pumili muna ng friend.");
    return;
  }

  if (state.callActive) {
    showToast("May kasalukuyang call na.");
    return;
  }

  state.callType = type;
  state.callActive = true;
  state.callConnected = false;
  state.videoStarted = false;
  state.muted = false;
  state.cameraEnabled = false;
  state.callStartTime = Date.now();

  $("#callScreen").classList.remove("hidden");
  $("#callPersonName").textContent = friend.name;
  $("#callStatus").textContent = "Calling...";
  $("#callTimer").textContent = "00:00";

  setImage($("#callAvatar"), friend.image, friend.name);

  $("#videoStage").classList.add("hidden");
  $("#callAvatarWrap").classList.remove("hidden");
  $("#videoPlaceholder").classList.remove("hidden");
  $("#remoteVideo").classList.add("hidden");
  $("#callMessage").textContent =
    type === "video"
      ? "Simulated video call · Waiting to connect"
      : "Simulated audio call";

  const oldStartButton = $("#startVideoBtn");
  if (oldStartButton) oldStartButton.remove();

  $("#videoToggleBtn").classList.toggle(
    "hidden",
    type !== "video"
  );

  // A call can be ended at any point.
  clearInterval(state.callInterval);
  state.callInterval = setInterval(updateCallTimer, 1000);
  updateCallTimer();

  // Sound starts immediately after the user taps the call button.
  playCallSound();

  // The video-call flow offers a Call button.
  if (type === "video") {
    $("#callStatus").textContent = "Ready to call";

    const startButton = document.createElement("button");
    startButton.id = "startVideoBtn";
    startButton.type = "button";
    startButton.className = "upload-button";
    startButton.textContent = "Call";

    startButton.addEventListener("click", () => {
      startButton.remove();
      connectCall();
    });

    $("#callMessage").before(startButton);
  } else {
    // Simulated audio call connects automatically.
    connectCall();
  }
}

function connectCall() {
  if (!state.callActive) return;

  state.callConnected = true;
  state.callStartTime = Date.now();

  $("#callStatus").textContent = "Connected · Simulation";
  $("#callMessage").textContent =
    "Simulated call in progress";

  if (state.callType === "video") {
    // Start video after 18 seconds of the intro.
    state.introTimeout = setTimeout(() => {
      if (!state.callActive) return;
      startRemoteVideo();
    }, 18000);

    // Camera can start immediately after the user's gesture.
    // This is a real local preview, not a remote connection.
    startLocalCamera();
  } else {
    $("#callAvatarWrap").classList.remove("hidden");
  }

  stopCallSound();
  addCallHistory(state.currentFriend, state.callType);
}

function startRemoteVideo() {
  if (!state.callActive || state.callType !== "video") return;

  const video = $("#remoteVideo");
  const stage = $("#videoStage");

  stage.classList.remove("hidden");
  $("#callAvatarWrap").classList.add("hidden");

  video.src = "jester-video.mp4";
  video.classList.remove("hidden");
  video.muted = !state.speakerEnabled;
  video.loop = true;
  video.playsInline = true;

  $("#videoPlaceholder").classList.remove("hidden");
  $("#callMessage").textContent =
    "Playing recorded video · Not a real call";

  state.videoStarted = true;

  const playPromise = video.play();

  if (playPromise && typeof playPromise.then === "function") {
    playPromise.then(() => {
      $("#videoPlaceholder").classList.add("hidden");
    }).catch(() => {
      $("#videoPlaceholder").classList.remove("hidden");
      showToast("Hindi ma-play ang video. Suriin ang jester-video.mp4.");
    });
  }

  $("#videoToggleBtn").classList.add("is-active");
}

async function startLocalCamera() {
  if (!navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia) {
    $("#cameraPlaceholder").classList.remove("hidden");
    showToast("Hindi available ang camera. Gumamit ng HTTPS browser.");
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user"
      },
      audio: false
    });

    if (!state.callActive) {
      stream.getTracks().forEach(track => track.stop());
      return;
    }

    state.localStream = stream;

    const camera = $("#localCamera");
    camera.srcObject = stream;

    $("#cameraPlaceholder").classList.add("hidden");
    camera.classList.remove("hidden");

    state.cameraEnabled = true;
    $("#cameraToggleBtn").textContent = "⌖";
  } catch (error) {
    $("#cameraPlaceholder").classList.remove("hidden");
    showToast("Hindi nabuksan ang camera. Payagan ang camera permission.");
  }
}

function toggleCamera() {
  if (!state.localStream) {
    startLocalCamera();
    return;
  }

  state.cameraEnabled = !state.cameraEnabled;

  state.localStream.getVideoTracks().forEach(track => {
    track.enabled = state.cameraEnabled;
  });

  $("#localCamera").classList.toggle(
    "hidden",
    !state.cameraEnabled
  );

  $("#cameraPlaceholder").classList.toggle(
    "hidden",
    state.cameraEnabled
  );

  $("#cameraToggleBtn").textContent =
    state.cameraEnabled ? "⌖" : "◉";
}

function toggleMute() {
  state.muted = !state.muted;

  $("#muteBtn").classList.toggle("is-active", state.muted);
  $("#muteBtn").querySelector("small").textContent =
    state.muted ? "Unmute" : "Mute";

  // There is no remote caller in this simulation.
  // This controls the local camera stream only if audio tracks exist.
  if (state.localStream) {
    state.localStream.getAudioTracks().forEach(track => {
      track.enabled = !state.muted;
    });
  }

  showToast(state.muted ? "Mute on" : "Mute off");
}

function toggleSpeaker() {
  state.speakerEnabled = !state.speakerEnabled;

  $("#speakerBtn").textContent =
    state.speakerEnabled ? "🔊" : "🔈";

  $("#speakerControlBtn").classList.toggle(
    "is-active",
    !state.speakerEnabled
  );

  const video = $("#remoteVideo");
  video.muted = !state.speakerEnabled;

  const audio = $("#callAudio");
  audio.volume = state.speakerEnabled ? 1 : 0.25;

  showToast(
    state.speakerEnabled
      ? "Speaker enabled"
      : "Speaker volume lowered"
  );
}

function toggleRemoteVideo() {
  const video = $("#remoteVideo");

  if (!state.videoStarted) {
    showToast("Hintayin ang 18-second intro.");
    return;
  }

  if (video.paused) {
    video.play().catch(() => {
      showToast("Hindi ma-play ang video.");
    });

    $("#videoToggleBtn").querySelector("small").textContent =
      "Pause";
  } else {
    video.pause();

    $("#videoToggleBtn").querySelector("small").textContent =
      "Play";
  }
}

function endCall() {
  state.callActive = false;
  state.callConnected = false;
  state.videoStarted = false;

  clearInterval(state.callInterval);
  clearTimeout(state.introTimeout);

  state.callInterval = null;
  state.introTimeout = null;

  stopCallSound();

  const video = $("#remoteVideo");
  video.pause();
  video.removeAttribute("src");
  video.load();

  $("#videoStage").classList.add("hidden");
  $("#callScreen").classList.add("hidden");
  $("#callAvatarWrap").classList.remove("hidden");

  const startButton = $("#startVideoBtn");
  if (startButton) startButton.remove();

  if (state.localStream) {
    state.localStream.getTracks().forEach(track => track.stop());
    state.localStream = null;
  }

  const camera = $("#localCamera");
  camera.srcObject = null;

  $("#cameraPlaceholder").classList.remove("hidden");
  camera.classList.add("hidden");

  $("#bottomNav").classList.remove("hidden");

  if (state.currentFriend) {
    showScreen("conversationScreen");
    renderMessages();
  }

  showToast("Call ended");
}

/* ---------- PROFILE PHOTO UPLOAD ---------- */

function handleProfileUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    showToast("Pumili ng image file.");
    return;
  }

  const reader = new FileReader();

  reader.onload = () => {
    const image = reader.result;

    $("#myProfileImage").src = image;

    document.querySelectorAll(".brand-avatar").forEach(element => {
      element.style.backgroundImage =
        `url("${image}")`;
      element.style.backgroundSize = "cover";
      element.style.backgroundPosition = "center";
    });

    showToast("Na-update ang profile preview.");
  };

  reader.readAsDataURL(file);
}

/* ---------- BUTTONS & EVENTS ---------- */

function bindEvents() {
  $("#searchInput").addEventListener("input", event => {
    renderFriends(event.target.value);
  });

  $("#messageForm").addEventListener("submit", sendMessage);

  $("#backBtn").addEventListener("click", () => {
    showScreen("chatListScreen");
    renderFriends($("#searchInput").value);
  });

  $("#profileBackBtn").addEventListener("click", () => {
    showScreen("chatListScreen");
  });

  $("#profileBtn").addEventListener("click", () => {
    showScreen("profileScreen");
  });

  $("#menuProfileBtn").addEventListener("click", () => {
    showScreen("profileScreen");
  });

  $("#newChatBtn").addEventListener("click", () => {
    showToast("Pumili ng friend sa list para mag-chat.");
    $("#searchInput").focus();
  });

  $("#audioCallBtn").addEventListener("click", () => {
    openCallScreen("audio");
  });

  $("#videoCallBtn").addEventListener("click", () => {
    openCallScreen("video");
  });

  $("#endCallBtn").addEventListener("click", endCall);

  $("#minimizeCallBtn").addEventListener("click", () => {
    $("#callScreen").classList.add("hidden");
    $("#bottomNav").classList.remove("hidden");
    showToast("Nakatago ang call screen. Active pa ang timer.");
  });

  $("#speakerBtn").addEventListener("click", toggleSpeaker);
  $("#speakerControlBtn").addEventListener("click", toggleSpeaker);
  $("#muteBtn").addEventListener("click", toggleMute);
  $("#cameraToggleBtn").addEventListener("click", toggleCamera);
  $("#videoToggleBtn").addEventListener("click", toggleRemoteVideo);

  $("#myPhotoUpload").addEventListener("change", handleProfileUpload);

  $("#emojiBtn").addEventListener("click", () => {
    $("#messageInput").value += " 💜";
    $("#messageInput").focus();
  });

  $("#attachBtn").addEventListener("click", () => {
    $("#attachmentInput").click();
  });

  $("#attachmentInput").addEventListener("change", event => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("Pumili ng image file.");
      return;
    }

    if (!state.currentFriend) {
      showToast("Pumili muna ng friend.");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      state.messages[state.currentFriend.id].push({
        type: "text",
        text: "📷 Image attached: " + file.name,
        mine: true
      });

      renderMessages();
      showToast("Naidagdag ang image message preview.");
    };

    reader.readAsDataURL(file);
    event.target.value = "";
  });

  document.querySelectorAll(".nav-item").forEach(button => {
    button.addEventListener("click", () => {
      showScreen(button.dataset.screen);
    });
  });

  $("#menuSoundBtn").addEventListener("click", () => {
    state.soundEnabled = !state.soundEnabled;

    if (!state.soundEnabled) stopCallSound();

    showToast(
      state.soundEnabled
        ? "Sound effects enabled"
        : "Sound effects disabled"
    );
  });

  $("#menuThemeBtn").addEventListener("click", () => {
    state.glowEnabled = !state.glowEnabled;
    document.body.classList.toggle(
      "no-glow",
      !state.glowEnabled
    );
    showToast(
      state.glowEnabled ? "Glow enabled" : "Glow disabled"
    );
  });

  // Stop camera and audio if the browser page is closed.
  window.addEventListener("pagehide", () => {
    clearInterval(state.callInterval);
    clearTimeout(state.introTimeout);
    stopCallSound();

    if (state.localStream) {
      state.localStream.getTracks().forEach(track => track.stop());
    }
  });
}

/* ---------- START APP ---------- */

function initMessenger() {
  renderFriends();
  renderStories();
  renderPeople();
  bindEvents();

  setImage($("#myProfileImage"), "john.jpg", "John Miras");

  // Open the chat list immediately on startup.
  showScreen("chatListScreen");

  // Automatically opens the app in the Messenger home screen.
  console.log("Messenger ni John Reynard is ready.");
}

document.addEventListener("DOMContentLoaded", initMessenger);
