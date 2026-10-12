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
