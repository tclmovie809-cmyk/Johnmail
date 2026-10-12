"use strict";

const $ = (selector) => document.querySelector(selector);

const friends = [
  {
    id: "xelamarie",
    name: "Xelamarie Roco",
    photo: "assets/xelamarie.jpg",
    preview: "50 new messages",
    time: "Now",
    unread: 50,
    pinned: true,
    online: true,
    initialMessages: []
  },
  {
    id: "jester",
    name: "Jester Melendres",
    photo: "assets/jester.jpg",
    preview: "Hello",
    time: "Now",
    unread: 0,
    pinned: false,
    online: false,
    initialMessages: [
      { type: "history", text: "Audio call", detail: "20 mins" },
      { type: "received", text: "Hello", time: "8:12 PM" }
    ]
  },
  {
    id: "carl",
    name: "Carl JAMES",
    photo: "assets/carl-james.jpg",
    preview: "👍",
    time: "Yesterday",
    unread: 0,
    pinned: false,
    online: false,
    initialMessages: []
  },
  {
    id: "grade10",
    name: "Grade 10 Einstein",
    photo: "assets/grade-10-einstein.jpg",
    preview: "Group conversation",
    time: "Yesterday",
    unread: 0,
    pinned: false,
    online: true,
    initialMessages: []
  },
  {
    id: "bingkay",
    name: "Bingkay Rivera Miras",
    photo: "assets/bingkay.jpg",
    preview: "3 new messages",
    time: "6:23 PM",
    unread: 3,
    pinned: false,
    online: false,
    initialMessages: []
  },
  {
    id: "alynah",
    name: "Alynah Alcala",
    photo: "assets/alynah.jpg",
    preview: "Active conversation",
    time: "Yesterday",
    unread: 0,
    pinned: false,
    online: true,
    initialMessages: []
  },
  {
    id: "althea",
    name: "Althea Mae Cullamat",
    photo: "assets/althea-mae.jpg",
    preview: "Message",
    time: "Yesterday",
    unread: 0,
    pinned: false,
    online: false,
    initialMessages: []
  }
];

let activeFriend = null;
let activeTab = "Chats";
let searchTerm = "";
let callMode = "video";
let callStartedAt = 0;
let callInterval = null;
let cameraStream = null;
let micMuted = false;
let cameraEnabled = true;
let speakerEnabled = true;
let remoteAudioContext = null;
let toastTimeout = null;

const conversationHistory = {};
friends.forEach(friend => {
  conversationHistory[friend.id] = [...friend.initialMessages];
});

const app = $(".app-shell");
const conversationScreen = $("#conversationScreen");
const callScreen = $("#callScreen");
const panelScreen = $("#panelScreen");
const remoteVideo = $("#remoteVideo");
const selfVideo = $("#selfVideo");
const attachmentInput = $("#attachmentInput");

// Use placeholder initials when a picture has not been added yet.
function prepareImages() {
  document.querySelectorAll("img").forEach(img => {
    img.addEventListener("error", () => {
      if (img.dataset.fallbackApplied) return;
      img.dataset.fallbackApplied = "true";
      img.removeAttribute("src");
      img.alt = img.alt || "Profile picture";
      img.style.background =
        "linear-gradient(145deg,#8535ce,#241035)";
      img.style.objectFit = "contain";
    });
  });
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove("show");
  }, 2400);
}

function currentTime() {
  return new Date().toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit"
  });
}

function initials(name) {
  return name.split(/\s+/).map(word => word[0]).slice(0, 2).join("");
}

function avatarHTML(friend, extraClass = "") {
  return `
    <div class="chat-status">
      <img class="avatar ${extraClass}"
           src="${escapeHTML(friend.photo)}"
           alt="${escapeHTML(friend.name)}"
           loading="lazy">
      ${friend.online ? '<span class="online-dot"></span>' : ""}
    </div>`;
}

function renderStories() {
  const stories = $("#storiesList");
  stories.innerHTML = "";

  friends.filter(friend => friend.online).forEach(friend => {
    const button = document.createElement("button");
    button.className = "story";
    button.innerHTML = `
      <div class="story-photo-wrap">
        <img src="${escapeHTML(friend.photo)}"
             alt="${escapeHTML(friend.name)}" loading="lazy">
        <span class="online-dot"></span>
      </div>
      <span class="story-name">${escapeHTML(friend.name.split(" ")[0])}</span>
    `;
    button.addEventListener("click", () => openConversation(friend.id));
    stories.appendChild(button);
  });
}

function getPreview(friend) {
  const messages = conversationHistory[friend.id] || [];
  const last = messages[messages.length - 1];

  if (!last) return friend.preview;
  if (last.type === "history") return "Audio call · 20 mins";
  if (last.type === "sent") return "You: " + last.text;
  if (last.type === "received") return last.text;
  if (last.type === "attachment") return "Attachment";
  return friend.preview;
}

function renderChats() {
  const list = $("#chatList");
  list.innerHTML = "";

  const filtered = friends.filter(friend =>
    friend.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  filtered.sort((a, b) => Number(b.pinned) - Number(a.pinned));

  filtered.forEach(friend => {
    const item = document.createElement("button");
    item.className = "chat-item";
    item.setAttribute("aria-label", "Open chat with " + friend.name);

    const unread = friend.unread > 0
      ? `<span class="unread-count">${
          friend.unread > 99 ? "99+" : friend.unread
        }</span>`
      : "";

    item.innerHTML = `
      ${avatarHTML(friend)}
      <div class="chat-info">
        <div class="chat-name-row">
          <h3 class="chat-name">${escapeHTML(friend.name)}
            ${friend.pinned ? '<span class="pin">✦</span>' : ""}
          </h3>
          <span class="chat-time">${escapeHTML(friend.time)}</span>
        </div>
        <div class="chat-preview-row">
          <p class="chat-preview ${friend.unread ? "unread" : ""}">
            ${escapeHTML(getPreview(friend))}
          </p>
          ${unread}
        </div>
      </div>`;

    item.addEventListener("click", () => openConversation(friend.id));
    list.appendChild(item);
  });

  $("#emptyState").classList.toggle("hidden", filtered.length > 0);
  $("#chatList").classList.toggle("hidden", filtered.length === 0);
  prepareImages();
}

function openConversation(id) {
  const friend = friends.find(item => item.id === id);
  if (!friend) return;

  activeFriend = friend;
  friend.unread = 0;

  $("#conversationName").textContent = friend.name;
  $("#conversationAvatar").src = friend.photo;
  $("#messageAvatar").src = friend.photo;
  $("#conversationStatus").textContent =
    friend.online ? "Active now" : "Messenger";
  $("#conversationStatus").style.color =
    friend.online ? "#55e991" : "#bca8d2";

  renderConversation();
  app.classList.add("hidden");
  conversationScreen.classList.remove("hidden");
  panelScreen.classList.add("hidden");
  $("#messageInput").focus();
  renderChats();
}

function renderConversation() {
  if (!activeFriend) return;

  const body = $("#conversationBody");
  body.innerHTML = '<div class="chat-date">TODAY</div>';

  const messages = conversationHistory[activeFriend.id] || [];

  if (messages.length === 0) {
    const welcome = document.createElement("p");
    welcome.style.cssText =
      "text-align:center;color:#a994bc;font-size:13px;margin:auto 0;";
    welcome.textContent = "Start a conversation";
    body.appendChild(welcome);
  }

  messages.forEach(message => {
    if (message.type === "history") {
      const card = document.createElement("div");
      card.className = "history-card";
      card.innerHTML = `
        <span class="history-icon">☎</span>
        <div><strong>${escapeHTML(message.text)}</strong>
        <p>${escapeHTML(message.detail || "")}</p></div>`;
      body.appendChild(card);
      return;
    }

    const row = document.createElement("div");
    row.className = "message-row " +
      (message.type === "sent" ? "sent" : "received");

    if (message.type !== "sent") {
      const img = document.createElement("img");
      img.className = "avatar tiny";
      img.src = activeFriend.photo;
      img.alt = "";
      row.appendChild(img);
    }

    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.textContent = message.text || "";

    if (message.type === "attachment") {
      bubble.textContent = "📎 " + (message.text || "Attachment");
    }

    row.appendChild(bubble);

    if (message.time) {
      const time = document.createElement("span");
      time.className = "message-time";
      time.textContent = message.time;
      row.appendChild(time);
    }

    body.appendChild(row);
  });

  body.scrollTop = body.scrollHeight;
  prepareImages();
}

function sendMessage(text) {
  if (!activeFriend || !text.trim()) return;

  conversationHistory[activeFriend.id].push({
    type: "sent",
    text: text.trim(),
    time: currentTime()
  });

  activeFriend.preview = text.trim();
  activeFriend.time = currentTime();
  renderConversation();
  renderChats();
}

$("#messageForm").addEventListener("submit", event => {
  event.preventDefault();
  const input = $("#messageInput");
  sendMessage(input.value);
  input.value = "";
});

$("#searchInput").addEventListener("input", event => {
  searchTerm = event.target.value.trim();
  $("#clearSearch").style.display = searchTerm ? "block" : "none";
  renderChats();
});

$("#clearSearch").addEventListener("click", () => {
  $("#searchInput").value = "";
  searchTerm = "";
  $("#clearSearch").style.display = "none";
  renderChats();
  $("#searchInput").focus();
});

$("#backBtn").addEventListener("click", () => {
  conversationScreen.classList.add("hidden");
  app.classList.remove("hidden");
  activeFriend = null;
  renderChats();
});

$("#newChatBtn").addEventListener("click", () => {
  $("#searchInput").focus();
  showToast("Search for a friend to start chatting.");
});

$("#profileBtn").addEventListener("click", () => {
  openPanel("My profile", `
    <div class="panel-row">
      <div class="jx-logo"><span>JX</span></div>
      <div><strong>John Reynard</strong><p>Messenger profile</p></div>
    </div>
    <p class="muted-copy">Your profile and preferences.</p>
    <button class="settings-button" id="profileInfoBtn">Profile information</button>
  `);
  $("#profileInfoBtn")?.addEventListener("click", () => {
    showToast("John Reynard");
  });
});

$("#seeAllStories").addEventListener("click", () => {
  openPanel("Active friends", friends.filter(f => f.online).map(friend => `
    <div class="panel-row">
      <img class="avatar" src="${escapeHTML(friend.photo)}" alt="">
      <div><strong>${escapeHTML(friend.name)}</strong><p>Active now</p></div>
    </div>`).join("") || "<p>No active friends.</p>");
});

$("#filterBtn").addEventListener("click", () => {
  openPanel("Chat options", `
    <button class="settings-button" id="showAllChats">All chats</button>
    <button class="settings-button" id="showPinnedChats">Pinned chats</button>
    <button class="settings-button" id="showUnreadChats">Unread chats</button>
  `);

  $("#showAllChats")?.addEventListener("click", () => {
    closePanel();
    showToast("Showing all chats");
  });

  $("#showPinnedChats")?.addEventListener("click", () => {
    closePanel();
    searchTerm = "";
    $("#searchInput").value = "";
    $("#listTitle").textContent = "Pinned chats";
    $("#chatList").innerHTML = "";
    friends.filter(f => f.pinned).forEach(friend => {
      const button = document.createElement("button");
      button.className = "chat-item";
      button.innerHTML = avatarHTML(friend) +
        `<div class="chat-info"><h3 class="chat-name">${escapeHTML(friend.name)}</h3><p class="chat-preview">${escapeHTML(getPreview(friend))}</p></div>`;
      button.addEventListener("click", () => openConversation(friend.id));
      $("#chatList").appendChild(button);
    });
  });

  $("#showUnreadChats")?.addEventListener("click", () => {
    closePanel();
    $("#listTitle").textContent = "Unread chats";
    $("#chatList").innerHTML = "";
    friends.filter(f => f.unread > 0).forEach(friend => {
      const button = document.createElement("button");
      button.className = "chat-item";
      button.innerHTML = avatarHTML(friend) +
        `<div class="chat-info"><h3 class="chat-name">${escapeHTML(friend.name)}</h3><p class="chat-preview unread">${escapeHTML(getPreview(friend))}</p></div>`;
      button.addEventListener("click", () => openConversation(friend.id));
      $("#chatList").appendChild(button);
    });
  });
});

document.querySelectorAll(".nav-item").forEach(button => {
  button.addEventListener("click", () => {
    activeTab = button.dataset.tab;
    document.querySelectorAll(".nav-item").forEach(item =>
      item.classList.toggle("active", item === button)
    );

    if (activeTab === "Chats") {
      closePanel();
      app.classList.remove("hidden");
      conversationScreen.classList.add("hidden");
      $("#listTitle").textContent = "Messages";
      renderChats();
      return;
    }

    if (activeTab === "People") {
      openPanel("People", friends.map(friend => `
        <button class="panel-row person-row" data-person="${friend.id}"
                style="width:100%;text-align:left;background:transparent;color:inherit;border:0">
          <img class="avatar" src="${escapeHTML(friend.photo)}" alt="">
          <div><strong>${escapeHTML(friend.name)}</strong>
          <p>${friend.online ? "Active now" : "Messenger"}</p></div>
        </button>`).join(""));
      $("#panelContent").querySelectorAll("[data-person]").forEach(row =>
        row.addEventListener("click", () => openConversation(row.dataset.person))
      );
    } else if (activeTab === "Notifications") {
      openPanel("Notifications", `
        <div class="panel-row"><div><strong>Messages</strong><p>Your chat list is ready.</p></div></div>
        <div class="panel-row"><div><strong>Unread messages</strong><p>Check your conversations.</p></div></div>
      `);
    } else {
      openPanel("Menu", `
        <div class="panel-row"><div><strong>John Reynard</strong><p>Messenger settings</p></div></div>
        <button class="settings-button" id="menuPeople">People</button>
        <button class="settings-button" id="menuTheme">Purple theme</button>
        <button class="settings-button" id="menuAbout">About JX Messenger</button>
      `);
      $("#menuPeople")?.addEventListener("click", () => {
        document.querySelector('[data-tab="People"]').click();
      });
      $("#menuTheme")?.addEventListener("click", () => showToast("Purple theme is active."));
      $("#menuAbout")?.addEventListener("click", () => {
        openPanel("About JX Messenger", "<p>JX Messenger · John Reynard</p><p>Connect. Talk. Stay.</p>");
      });
    }
  });
});

function openPanel(title, content) {
  $("#panelTitle").textContent = title;
  $("#panelContent").innerHTML = content;
  app.classList.add("hidden");
  conversationScreen.classList.add("hidden");
  panelScreen.classList.remove("hidden");
}

function closePanel() {
  panelScreen.classList.add("hidden");
  app.classList.remove("hidden");
}

$("#closePanel").addEventListener("click", closePanel);

$("#attachBtn").addEventListener("click", () => attachmentInput.click());

attachmentInput.addEventListener("change", () => {
  const file = attachmentInput.files && attachmentInput.files[0];
  if (!file || !activeFriend) return;

  conversationHistory[activeFriend.id].push({
    type: "attachment",
    text: file.name,
    time: currentTime()
  });
  renderConversation();
  renderChats();
  attachmentInput.value = "";
});

$("#emojiBtn").addEventListener("click", () => {
  $("#messageInput").value += " 😊";
  $("#messageInput").focus();
});

// -------------------- CALL INTERFACE --------------------

$("#audioCallBtn").addEventListener("click", () => startCall("audio"));
$("#videoCallBtn").addEventListener("click", () => startCall("video"));

async function startCall(mode) {
  if (!activeFriend) return;

  callMode = mode;
  callStartedAt = Date.now();
  micMuted = false;
  cameraEnabled = mode === "video";
  speakerEnabled = true;

  $("#callName").textContent = activeFriend.name;
  $("#remoteName").textContent = activeFriend.name;
  $("#remoteAvatar").src = activeFriend.photo;
  $("#callCaption").textContent = mode === "video" ? "Video call" : "Audio call";
  $("#callTimer").textContent = "00:00";
  $("#callStatus").textContent = "Call in progress";
  $("#cameraBtn").classList.toggle("toggled", !cameraEnabled);
  $("#muteBtn").classList.remove("toggled");
  $("#speakerBtn").classList.remove("toggled");

  conversationScreen.classList.add("hidden");
  callScreen.classList.remove("hidden");

  if (mode === "video") {
    await enableCamera();
    await playRemoteVideo();
  } else {
    stopCamera();
    remoteVideo.pause();
    remoteVideo.classList.add("hidden");
    $("#remotePlaceholder").classList.remove("hidden");
    $("#cameraPlaceholder").classList.remove("hidden");
    selfVideo.classList.add("hidden");
  }

  clearInterval(callInterval);
  callInterval = setInterval(updateCallTimer, 1000);
}

async function enableCamera() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    $("#cameraPlaceholder").textContent =
      "Camera needs HTTPS and browser permission.";
    $("#cameraPlaceholder").classList.remove("hidden");
    return;
  }

  try {
    stopCamera();
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
      audio: false
    });

    selfVideo.srcObject = cameraStream;
    selfVideo.classList.remove("hidden");
    $("#cameraPlaceholder").classList.add("hidden");
    cameraEnabled = true;
  } catch (error) {
    $("#cameraPlaceholder").textContent =
      "Allow camera access in your browser settings.";
    $("#cameraPlaceholder").classList.remove("hidden");
    selfVideo.classList.add("hidden");
    showToast("Camera permission was not granted.");
  }
}

async function playRemoteVideo() {
  remoteVideo.pause();
  remoteVideo.removeAttribute("src");
  remoteVideo.load();

  // Add your own recording at assets/jester-video.mp4.
  remoteVideo.src = "assets/jester-video.mp4";
  remoteVideo.classList.remove("hidden");
  $("#remotePlaceholder").classList.remove("hidden");

  remoteVideo.onloadeddata = () => {
    $("#remotePlaceholder").classList.add("hidden");
    remoteVideo.play().catch(() => {
      $("#remotePlaceholder").classList.remove("hidden");
    });
  };

  remoteVideo.onerror = () => {
    remoteVideo.classList.add("hidden");
    $("#remotePlaceholder").classList.remove("hidden");
    $("#callStatus").textContent = "Video unavailable";
  };

  try {
    await remoteVideo.play();
  } catch (_) {
    // The browser may require another tap before video playback.
  }
}

function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
  }
  selfVideo.srcObject = null;
}

function updateCallTimer() {
  if (!callStartedAt) return;
  const seconds = Math.floor((Date.now() - callStartedAt) / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  $("#callTimer").textContent =
    String(minutes).padStart(2, "0") + ":" +
    String(remainder).padStart(2, "0");
}

$("#muteBtn").addEventListener("click", () => {
  micMuted = !micMuted;
  $("#muteBtn").classList.toggle("toggled", micMuted);
  $("#muteBtn").querySelector("small").textContent =
    micMuted ? "Unmute" : "Mute";

  // This prototype does not transmit microphone audio.
  showToast(micMuted ? "Microphone muted" : "Microphone unmuted");
});

$("#speakerBtn").addEventListener("click", () => {
  speakerEnabled = !speakerEnabled;
  $("#speakerBtn").classList.toggle("toggled", !speakerEnabled);
  $("#speakerBtn").querySelector("small").textContent =
    speakerEnabled ? "Speaker" : "Quiet";

  // Adjust recorded-video playback volume, not phone routing.
  remoteVideo.muted = !speakerEnabled;
});

$("#cameraBtn").addEventListener("click", async () => {
  if (callMode !== "video") {
    showToast("Camera is available during video calls.");
    return;
  }

  if (cameraEnabled) {
    stopCamera();
    cameraEnabled = false;
    selfVideo.classList.add("hidden");
    $("#cameraPlaceholder").textContent = "Camera off";
    $("#cameraPlaceholder").classList.remove("hidden");
  } else {
    await enableCamera();
  }

  $("#cameraBtn").classList.toggle("toggled", !cameraEnabled);
});

$("#endCallBtn").addEventListener("click", endCall);
$("#minimizeCall").addEventListener("click", endCall);

function endCall() {
  const elapsed = callStartedAt
    ? Math.max(1, Math.floor((Date.now() - callStartedAt) / 1000))
    : 0;
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  clearInterval(callInterval);
  callInterval = null;
  stopCamera();
  remoteVideo.pause();
  remoteVideo.removeAttribute("src");
  remoteVideo.load();

  callScreen.classList.add("hidden");
  conversationScreen.classList.remove("hidden");

  if (activeFriend) {
    conversationHistory[activeFriend.id].push({
      type: "history",
      text: callMode === "video" ? "Video call" : "Audio call",
      detail: `${minutes} min ${seconds} sec`
    });
    renderConversation();
  }

  callStartedAt = 0;
  showToast("Call ended");
}

$("#navUnread").textContent = "3";

// Initial render
renderStories();
renderChats();
prepareImages();
