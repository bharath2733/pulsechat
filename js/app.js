/**
 * PulseChat - Complete P2P WebRTC Chat & Calling Engine
 */
(function () {
  'use strict';

  // --- STATE ---
  const state = {
    myId: null,
    myName: localStorage.getItem('pulsechat_name') || getRandomName(),
    myAvatar: localStorage.getItem('pulsechat_avatar') || '⚡',
    peer: null,
    connections: new Map(), // peerId -> DataConnection
    activePeerId: null,
    messages: [], // Array of message objects
    activeCall: null,
    localStream: null,
    remoteStream: null,
    callDurationSeconds: 0,
    callTimerInterval: null,
    typingTimeout: null,
    isLocalTyping: false,
    audioRecording: {
      recorder: null,
      stream: null,
      chunks: [],
      startTime: 0,
      timerInterval: null,
      analyser: null,
      animId: null
    }
  };

  // BroadcastChannel for instant local cross-tab fallback / sync
  let localChannel = null;
  try {
    localChannel = new BroadcastChannel('pulsechat_local_mesh');
  } catch (e) {
    console.warn('BroadcastChannel not supported in this environment', e);
  }

  // --- AVATAR PRESETS ---
  const AVATAR_PRESETS = ['⚡', '🚀', '🦊', '🐱', '🐼', '🤖', '👾', '🌟', '🔮', '🎧', '💎', '🔥'];

  // --- DOM ELEMENTS ---
  const DOM = {
    // Header
    brandHomeBtn: document.getElementById('brandHomeBtn'),
    globalStatusDot: document.getElementById('globalStatusDot'),
    globalStatusText: document.getElementById('globalStatusText'),
    openTestTabBtn: document.getElementById('openTestTabBtn'),
    inviteModalBtn: document.getElementById('inviteModalBtn'),
    soundToggleBtn: document.getElementById('soundToggleBtn'),
    soundOnIcon: document.getElementById('soundOnIcon'),
    soundOffIcon: document.getElementById('soundOffIcon'),
    themeToggleBtn: document.getElementById('themeToggleBtn'),
    themeMoonIcon: document.getElementById('themeMoonIcon'),
    themeSunIcon: document.getElementById('themeSunIcon'),

    // Sidebar
    sidebarPanel: document.getElementById('sidebarPanel'),
    mobileSidebarToggle: document.getElementById('mobileSidebarToggle'),
    myAvatarDisplay: document.getElementById('myAvatarDisplay'),
    myDisplayName: document.getElementById('myDisplayName'),
    openProfileModalBtn: document.getElementById('openProfileModalBtn'),
    copyMyIdBtn: document.getElementById('copyMyIdBtn'),
    myPeerIdText: document.getElementById('myPeerIdText'),
    connectForm: document.getElementById('connectForm'),
    targetPeerIdInput: document.getElementById('targetPeerIdInput'),
    connectBtn: document.getElementById('connectBtn'),
    copyInviteLinkChip: document.getElementById('copyInviteLinkChip'),
    showQrChip: document.getElementById('showQrChip'),
    friendsCountBadge: document.getElementById('friendsCountBadge'),
    friendsListContainer: document.getElementById('friendsListContainer'),
    noFriendsHint: document.getElementById('noFriendsHint'),

    // Main Chat
    chatMainArea: document.getElementById('chatMainArea'),
    activeRecipientAvatar: document.getElementById('activeRecipientAvatar'),
    activeRecipientName: document.getElementById('activeRecipientName'),
    activeRecipientStatus: document.getElementById('activeRecipientStatus'),
    startVoiceCallBtn: document.getElementById('startVoiceCallBtn'),
    startVideoCallBtn: document.getElementById('startVideoCallBtn'),
    toggleSearchBtn: document.getElementById('toggleSearchBtn'),
    exportChatBtn: document.getElementById('exportChatBtn'),
    clearChatBtn: document.getElementById('clearChatBtn'),
    chatSearchBar: document.getElementById('chatSearchBar'),
    searchFilterInput: document.getElementById('searchFilterInput'),
    closeSearchBtn: document.getElementById('closeSearchBtn'),
    messagesFeed: document.getElementById('messagesFeed'),
    emptyWelcomeState: document.getElementById('emptyWelcomeState'),
    welcomeShareUrl: document.getElementById('welcomeShareUrl'),
    welcomeCopyBtn: document.getElementById('welcomeCopyBtn'),
    welcomeOpenTestBtn: document.getElementById('welcomeOpenTestBtn'),
    welcomeShowQrBtn: document.getElementById('welcomeShowQrBtn'),
    welcomeCopyCodeBtn: document.getElementById('welcomeCopyCodeBtn'),

    // Input Bar
    typingIndicatorBar: document.getElementById('typingIndicatorBar'),
    typingIndicatorText: document.getElementById('typingIndicatorText'),
    messageForm: document.getElementById('messageForm'),
    messageTextInput: document.getElementById('messageTextInput'),
    attachFileBtn: document.getElementById('attachFileBtn'),
    fileAttachmentInput: document.getElementById('fileAttachmentInput'),
    attachImageBtn: document.getElementById('attachImageBtn'),
    imageAttachmentInput: document.getElementById('imageAttachmentInput'),
    emojiPickerBtn: document.getElementById('emojiPickerBtn'),
    startVoiceRecordBtn: document.getElementById('startVoiceRecordBtn'),
    sendMsgBtn: document.getElementById('sendMsgBtn'),
    emojiPicker: document.getElementById('emojiPicker'),
    emojiGrid: document.getElementById('emojiGrid'),
    recordingBar: document.getElementById('recordingBar'),
    recordingTimerDisplay: document.getElementById('recordingTimerDisplay'),
    recordingWaveformCanvas: document.getElementById('recordingWaveformCanvas'),
    cancelVoiceRecordBtn: document.getElementById('cancelVoiceRecordBtn'),
    sendVoiceRecordBtn: document.getElementById('sendVoiceRecordBtn'),

    // Modals
    inviteModal: document.getElementById('inviteModal'),
    closeInviteModalBtn: document.getElementById('closeInviteModalBtn'),
    qrCodeContainer: document.getElementById('qrCodeContainer'),
    modalShareUrlText: document.getElementById('modalShareUrlText'),
    modalCopyLinkBtn: document.getElementById('modalCopyLinkBtn'),
    modalCopyCodeBtn: document.getElementById('modalCopyCodeBtn'),
    modalOpenTabBtn: document.getElementById('modalOpenTabBtn'),

    profileModal: document.getElementById('profileModal'),
    closeProfileModalBtn: document.getElementById('closeProfileModalBtn'),
    profileNameInput: document.getElementById('profileNameInput'),
    avatarChoicesContainer: document.getElementById('avatarChoicesContainer'),
    saveProfileBtn: document.getElementById('saveProfileBtn'),

    incomingCallModal: document.getElementById('incomingCallModal'),
    incomingCallerName: document.getElementById('incomingCallerName'),
    incomingCallAvatar: document.getElementById('incomingCallAvatar'),
    incomingCallType: document.getElementById('incomingCallType'),
    acceptCallBtn: document.getElementById('acceptCallBtn'),
    declineCallBtn: document.getElementById('declineCallBtn'),

    activeCallOverlay: document.getElementById('activeCallOverlay'),
    remoteVideoFeed: document.getElementById('remoteVideoFeed'),
    localVideoFeed: document.getElementById('localVideoFeed'),
    audioCallAvatarView: document.getElementById('audioCallAvatarView'),
    audioCallAvatarPulse: document.getElementById('audioCallAvatarPulse'),
    audioCallPeerName: document.getElementById('audioCallPeerName'),
    callDurationTimer: document.getElementById('callDurationTimer'),
    callToggleMicBtn: document.getElementById('callToggleMicBtn'),
    callMicOnIcon: document.getElementById('callMicOnIcon'),
    callMicOffIcon: document.getElementById('callMicOffIcon'),
    callToggleCamBtn: document.getElementById('callToggleCamBtn'),
    callCamOnIcon: document.getElementById('callCamOnIcon'),
    callCamOffIcon: document.getElementById('callCamOffIcon'),
    callScreenShareBtn: document.getElementById('callScreenShareBtn'),
    hangUpCallBtn: document.getElementById('hangUpCallBtn'),

    imageLightbox: document.getElementById('imageLightbox'),
    lightboxImg: document.getElementById('lightboxImg'),
    toastContainer: document.getElementById('toastContainer')
  };

  // --- INITIALIZATION ---
  function init() {
    updateProfileUI();
    initTheme();
    initSoundUI();
    initEmojiPicker();
    setupEventListeners();
    setupDragAndDrop();

    // Start PeerJS connection
    initPeer();

    // Setup Local Channel listener for multi-tab auto-mesh
    if (localChannel) {
      setupLocalChannel();
    }
  }

  // --- RANDOM USERNAME GENERATOR ---
  function getRandomName() {
    const adjectives = ['Cosmic', 'Neon', 'Swift', 'Cyber', 'Echo', 'Solar', 'Pulse', 'Aero', 'Nova', 'Hyper'];
    const nouns = ['Pilot', 'Ranger', 'Spark', 'Phoenix', 'Ninja', 'Falcon', 'Wave', 'Echo', 'Knight', 'Orbit'];
    const randAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randNoun = nouns[Math.floor(Math.random() * nouns.length)];
    const randNum = Math.floor(100 + Math.random() * 900);
    return `${randAdj}${randNoun}_${randNum}`;
  }

  // --- PROFILE MANAGEMENT ---
  function updateProfileUI() {
    DOM.myDisplayName.textContent = state.myName;
    DOM.myAvatarDisplay.textContent = state.myAvatar;
  }

  function renderAvatarChoices() {
    DOM.avatarChoicesContainer.innerHTML = '';
    AVATAR_PRESETS.forEach(avatar => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `btn-icon ${avatar === state.myAvatar ? 'active' : ''}`;
      btn.style.fontSize = '1.25rem';
      btn.textContent = avatar;
      btn.addEventListener('click', () => {
        DOM.avatarChoicesContainer.querySelectorAll('.btn-icon').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.myAvatar = avatar;
      });
      DOM.avatarChoicesContainer.appendChild(btn);
    });
  }

  // --- THEME & SOUND ---
  function initTheme() {
    const savedTheme = localStorage.getItem('pulsechat_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcons(savedTheme);
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('pulsechat_theme', next);
    updateThemeIcons(next);
  }

  function updateThemeIcons(theme) {
    if (theme === 'dark') {
      DOM.themeMoonIcon.style.display = 'block';
      DOM.themeSunIcon.style.display = 'none';
    } else {
      DOM.themeMoonIcon.style.display = 'none';
      DOM.themeSunIcon.style.display = 'block';
    }
  }

  function initSoundUI() {
    const muted = window.SoundManager ? window.SoundManager.isMuted() : false;
    DOM.soundOnIcon.style.display = muted ? 'none' : 'block';
    DOM.soundOffIcon.style.display = muted ? 'block' : 'none';
  }

  function toggleSound() {
    if (!window.SoundManager) return;
    const isMuted = window.SoundManager.toggleMute();
    DOM.soundOnIcon.style.display = isMuted ? 'none' : 'block';
    DOM.soundOffIcon.style.display = isMuted ? 'block' : 'none';
    showToast(isMuted ? 'Sound muted' : 'Sound enabled', 'info');
  }

  // --- PEERJS ENGINE ---
  function initPeer() {
    // Generate clean user peer code
    const generatedId = 'pulse-' + Math.random().toString(36).substring(2, 8);

    DOM.globalStatusDot.className = 'status-dot connecting';
    DOM.globalStatusText.textContent = 'Connecting to P2P network...';

    try {
      const PeerClass = window.Peer || (window.peerjs && window.peerjs.Peer);
      if (!PeerClass) {
        throw new Error('PeerJS library not loaded');
      }

      state.peer = new PeerClass(generatedId, {
        debug: 1,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' }
          ]
        }
      });

      // Peer Connected to signaling server
      state.peer.on('open', (id) => {
        state.myId = id;
        DOM.myPeerIdText.textContent = id;
        DOM.globalStatusDot.className = 'status-dot online';
        DOM.globalStatusText.textContent = `Online • ${id}`;

        updateInviteLinks();
        checkUrlForRoomOrPeer();

        // Broadcast presence for local tabs
        if (localChannel) {
          localChannel.postMessage({
            type: 'peer_online',
            peerId: state.myId,
            name: state.myName,
            avatar: state.myAvatar
          });
        }
      });

      // Incoming Data Connection
      state.peer.on('connection', (conn) => {
        setupDataConnection(conn);
      });

      // Incoming Audio / Video Call
      state.peer.on('call', (mediaCall) => {
        handleIncomingCall(mediaCall);
      });

      // Errors
      state.peer.on('error', (err) => {
        console.error('PeerJS error:', err);
        if (err.type === 'peer-unavailable') {
          showToast(`Friend ID "${err.message.split(' ').pop()}" not found or offline.`, 'error');
        } else {
          showToast(`Network notice: ${err.type}`, 'info');
        }
      });

      // Disconnected
      state.peer.on('disconnected', () => {
        DOM.globalStatusDot.className = 'status-dot connecting';
        DOM.globalStatusText.textContent = 'Reconnecting...';
        setTimeout(() => {
          if (state.peer && !state.peer.destroyed) {
            state.peer.reconnect();
          }
        }, 3000);
      });

    } catch (e) {
      console.error('Failed to initialize PeerJS:', e);
      DOM.globalStatusDot.className = 'status-dot';
      DOM.globalStatusText.textContent = 'Local Network Mode';
      showToast('Operating in Local Browser Mesh Mode', 'info');
    }
  }

  // Check URL fragment or query parameter for #peer=... or #room=...
  function checkUrlForRoomOrPeer() {
    const hash = window.location.hash;
    const urlParams = new URLSearchParams(window.location.search);
    let target = urlParams.get('peer') || urlParams.get('room');

    if (!target && hash) {
      const match = hash.match(/#(?:peer|room)=([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        target = match[1];
      }
    }

    if (target && target !== state.myId) {
      showToast(`Auto-connecting to friend: ${target}...`, 'info');
      connectToPeer(target);
    }
  }

  // --- CONNECT TO FRIEND ---
  function connectToPeer(targetId) {
    targetId = targetId.trim();
    if (!targetId) {
      showToast('Please enter a valid Peer ID or Room code', 'error');
      return;
    }
    if (targetId === state.myId) {
      showToast("That's your own ID! Open 'Test Tab' to test chatting with yourself.", 'info');
      return;
    }
    if (state.connections.has(targetId)) {
      selectActivePeer(targetId);
      return;
    }

    showToast(`Connecting to ${targetId}...`, 'info');

    if (state.peer && !state.peer.disconnected) {
      const conn = state.peer.connect(targetId, {
        reliable: true,
        metadata: { name: state.myName, avatar: state.myAvatar }
      });
      setupDataConnection(conn);
    } else if (localChannel) {
      // Local fallback connect
      localChannel.postMessage({
        type: 'local_connect_request',
        targetId: targetId,
        fromId: state.myId,
        name: state.myName,
        avatar: state.myAvatar
      });
    }
  }

  // Setup event listeners for a PeerJS DataConnection
  function setupDataConnection(conn) {
    const peerId = conn.peer;

    conn.on('open', () => {
      state.connections.set(peerId, conn);

      // Send handshake with my profile
      conn.send({
        type: 'handshake',
        name: state.myName,
        avatar: state.myAvatar
      });

      addOrUpdateFriendInList(peerId, conn.metadata?.name || peerId, conn.metadata?.avatar || '👤');
      selectActivePeer(peerId);

      if (window.SoundManager) {
        window.SoundManager.playConnected();
      }

      showToast(`Connected to ${conn.metadata?.name || peerId}! 🎉`, 'success');
      appendSystemMessage(`Direct encrypted connection established with ${conn.metadata?.name || peerId}`);
    });

    conn.on('data', (data) => {
      handleIncomingData(peerId, data);
    });

    conn.on('close', () => {
      state.connections.delete(peerId);
      showToast(`Connection to ${peerId} closed`, 'info');
      appendSystemMessage(`${peerId} disconnected`);
      updateFriendsCount();
      if (state.activePeerId === peerId) {
        DOM.activeRecipientStatus.textContent = 'Disconnected';
      }
    });

    conn.on('error', (err) => {
      console.warn('Connection error with', peerId, err);
    });
  }

  // Handle incoming data packets
  function handleIncomingData(senderId, data) {
    if (!data || !data.type) return;

    switch (data.type) {
      case 'handshake': {
        addOrUpdateFriendInList(senderId, data.name, data.avatar);
        if (state.activePeerId === senderId) {
          DOM.activeRecipientName.textContent = data.name;
          DOM.activeRecipientAvatar.textContent = data.avatar;
          DOM.activeRecipientStatus.textContent = 'Direct P2P Connected • Online';
        }
        break;
      }

      case 'chat': {
        appendReceivedMessage({
          senderId: senderId,
          senderName: data.sender || 'Friend',
          senderAvatar: data.avatar || '👤',
          text: data.text,
          timestamp: data.timestamp || Date.now(),
          id: data.id
        });

        // Send read/delivered receipt
        sendReceipt(senderId, data.id);
        break;
      }

      case 'file': {
        appendReceivedFileMessage({
          senderId: senderId,
          senderName: data.sender || 'Friend',
          senderAvatar: data.avatar || '👤',
          name: data.name,
          size: data.size,
          fileType: data.fileType,
          dataUrl: data.dataUrl,
          isImage: data.isImage,
          timestamp: data.timestamp || Date.now(),
          id: data.id
        });
        sendReceipt(senderId, data.id);
        break;
      }

      case 'voice': {
        appendReceivedVoiceMessage({
          senderId: senderId,
          senderName: data.sender || 'Friend',
          senderAvatar: data.avatar || '👤',
          audioUrl: data.audioUrl,
          duration: data.duration,
          timestamp: data.timestamp || Date.now(),
          id: data.id
        });
        sendReceipt(senderId, data.id);
        break;
      }

      case 'typing': {
        if (state.activePeerId === senderId) {
          showRemoteTyping(data.sender, data.isTyping);
        }
        break;
      }

      case 'receipt': {
        markMessageDelivered(data.messageId);
        break;
      }

      case 'reaction': {
        applyReaction(data.messageId, data.emoji, data.sender);
        break;
      }
    }
  }

  // --- MULTI-TAB BROADCAST CHANNEL SUPPORT ---
  function setupLocalChannel() {
    localChannel.onmessage = (event) => {
      const data = event.data;
      if (!data) return;

      if (data.type === 'peer_online') {
        if (data.peerId !== state.myId) {
          addOrUpdateFriendInList(data.peerId, data.name, data.avatar);
        }
      } else if (data.type === 'local_connect_request') {
        if (data.targetId === state.myId) {
          // Connect back
          connectToPeer(data.fromId);
        }
      }
    };
  }

  // --- FRIENDS LIST UI ---
  function addOrUpdateFriendInList(peerId, name, avatar) {
    DOM.noFriendsHint.style.display = 'none';

    let item = document.getElementById(`friend-item-${peerId}`);
    if (!item) {
      item = document.createElement('div');
      item.id = `friend-item-${peerId}`;
      item.className = 'peer-item';
      item.onclick = () => selectActivePeer(peerId);

      DOM.friendsListContainer.appendChild(item);
    }

    item.innerHTML = `
      <div class="peer-avatar">
        ${avatar || '👤'}
        <div class="online-indicator"></div>
      </div>
      <div class="peer-meta">
        <div class="peer-top-line">
          <span class="peer-title">${escapeHTML(name || peerId)}</span>
          <span class="peer-time">Online</span>
        </div>
        <div class="peer-bottom-line">
          <span class="peer-preview" id="preview-${peerId}">Direct P2P Ready</span>
        </div>
      </div>
    `;

    updateFriendsCount();
  }

  function updateFriendsCount() {
    DOM.friendsCountBadge.textContent = state.connections.size;
  }

  function selectActivePeer(peerId) {
    state.activePeerId = peerId;

    // Highlight active friend item
    document.querySelectorAll('.peer-item').forEach(el => el.classList.remove('active'));
    const activeEl = document.getElementById(`friend-item-${peerId}`);
    if (activeEl) activeEl.classList.add('active');

    // Update Header
    const conn = state.connections.get(peerId);
    const friendName = conn?.metadata?.name || peerId;
    const friendAvatar = conn?.metadata?.avatar || '👤';

    DOM.activeRecipientName.textContent = friendName;
    DOM.activeRecipientAvatar.textContent = friendAvatar;
    DOM.activeRecipientStatus.textContent = 'Direct P2P Connected • Online';

    // Hide welcome state
    DOM.emptyWelcomeState.style.display = 'none';

    // Close mobile drawer if open
    DOM.sidebarPanel.classList.remove('mobile-open');

    DOM.messageTextInput.focus();
  }

  // --- SENDING MESSAGES ---
  function handleSendMessage(e) {
    if (e) e.preventDefault();
    const text = DOM.messageTextInput.value.trim();
    if (!text) return;

    if (state.connections.size === 0) {
      showToast("You're not connected to a friend yet! Click 'Invite' or 'Test Tab' to connect.", 'info');
      openInviteModal();
      return;
    }

    const messageId = 'msg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    const payload = {
      type: 'chat',
      id: messageId,
      text: text,
      timestamp: Date.now(),
      sender: state.myName,
      avatar: state.myAvatar
    };

    // Broadcast to active peer (or all connected peers in room)
    broadcastData(payload);

    // Append to local view
    appendSentMessage({
      id: messageId,
      text: text,
      timestamp: payload.timestamp
    });

    // Reset input
    DOM.messageTextInput.value = '';
    DOM.messageTextInput.style.height = 'auto';

    // Send typing stopped
    sendTypingStatus(false);

    if (window.SoundManager) {
      window.SoundManager.playSent();
    }
  }

  function broadcastData(payload) {
    if (state.activePeerId && state.connections.has(state.activePeerId)) {
      state.connections.get(state.activePeerId).send(payload);
    } else {
      // Broadcast to all
      state.connections.forEach(conn => {
        if (conn.open) conn.send(payload);
      });
    }
  }

  function sendReceipt(targetId, messageId) {
    const conn = state.connections.get(targetId);
    if (conn && conn.open) {
      conn.send({
        type: 'receipt',
        messageId: messageId
      });
    }
  }

  function markMessageDelivered(messageId) {
    const receiptEl = document.getElementById(`receipt-${messageId}`);
    if (receiptEl) {
      receiptEl.textContent = '✓✓';
      receiptEl.title = 'Delivered to friend';
    }
  }

  // --- MESSAGE RENDERING ---
  function appendSentMessage({ id, text, timestamp }) {
    DOM.emptyWelcomeState.style.display = 'none';

    const row = document.createElement('div');
    row.className = 'message-row me';
    row.id = `msg-row-${id}`;

    const timeStr = formatTime(timestamp);
    const formattedHtml = formatMessageText(text);

    row.innerHTML = `
      <div class="msg-avatar">${state.myAvatar}</div>
      <div class="bubble-wrap">
        <div class="msg-sender-name">You</div>
        <div class="message-bubble">
          <div class="message-content">${formattedHtml}</div>
          ${renderQuickActions(id)}
        </div>
        <div class="reaction-list" id="reactions-${id}"></div>
        <div class="message-meta">
          <span>${timeStr}</span>
          <span class="receipt-icon" id="receipt-${id}" title="Sent">✓</span>
        </div>
      </div>
    `;

    DOM.messagesFeed.appendChild(row);
    scrollToBottom();
    state.messages.push({ id, text, sender: 'me', timestamp });
  }

  function appendReceivedMessage({ id, text, senderName, senderAvatar, timestamp }) {
    DOM.emptyWelcomeState.style.display = 'none';

    const row = document.createElement('div');
    row.className = 'message-row peer';
    row.id = `msg-row-${id}`;

    const timeStr = formatTime(timestamp);
    const formattedHtml = formatMessageText(text);

    row.innerHTML = `
      <div class="msg-avatar">${senderAvatar || '👤'}</div>
      <div class="bubble-wrap">
        <div class="msg-sender-name">${escapeHTML(senderName)}</div>
        <div class="message-bubble">
          <div class="message-content">${formattedHtml}</div>
          ${renderQuickActions(id)}
        </div>
        <div class="reaction-list" id="reactions-${id}"></div>
        <div class="message-meta">
          <span>${timeStr}</span>
        </div>
      </div>
    `;

    DOM.messagesFeed.appendChild(row);
    scrollToBottom();
    state.messages.push({ id, text, sender: senderName, timestamp });

    if (window.SoundManager) {
      window.SoundManager.playReceived();
    }
  }

  function appendReceivedFileMessage(msg) {
    DOM.emptyWelcomeState.style.display = 'none';

    const row = document.createElement('div');
    row.className = 'message-row peer';
    row.id = `msg-row-${msg.id}`;

    const timeStr = formatTime(msg.timestamp);
    let contentHtml = '';

    if (msg.isImage) {
      contentHtml = `<img src="${msg.dataUrl}" alt="${escapeHTML(msg.name)}" class="bubble-image" onclick="window.PulseChat.openLightbox('${msg.dataUrl}')">`;
    } else {
      contentHtml = `
        <a href="${msg.dataUrl}" download="${escapeHTML(msg.name)}" class="bubble-file-card">
          <div class="file-card-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
          </div>
          <div class="file-card-info">
            <span class="file-name">${escapeHTML(msg.name)}</span>
            <span class="file-size">${formatBytes(msg.size)}</span>
          </div>
        </a>
      `;
    }

    row.innerHTML = `
      <div class="msg-avatar">${msg.senderAvatar || '👤'}</div>
      <div class="bubble-wrap">
        <div class="msg-sender-name">${escapeHTML(msg.senderName)}</div>
        <div class="message-bubble">
          ${contentHtml}
          ${renderQuickActions(msg.id)}
        </div>
        <div class="reaction-list" id="reactions-${msg.id}"></div>
        <div class="message-meta">
          <span>${timeStr}</span>
        </div>
      </div>
    `;

    DOM.messagesFeed.appendChild(row);
    scrollToBottom();

    if (window.SoundManager) {
      window.SoundManager.playReceived();
    }
  }

  function appendReceivedVoiceMessage(msg) {
    DOM.emptyWelcomeState.style.display = 'none';

    const row = document.createElement('div');
    row.className = 'message-row peer';
    row.id = `msg-row-${msg.id}`;

    const timeStr = formatTime(msg.timestamp);

    row.innerHTML = `
      <div class="msg-avatar">${msg.senderAvatar || '👤'}</div>
      <div class="bubble-wrap">
        <div class="msg-sender-name">${escapeHTML(msg.senderName)}</div>
        <div class="message-bubble">
          <div class="voice-note-player">
            <button class="voice-play-btn" onclick="window.PulseChat.playVoiceNote('${msg.id}', '${msg.audioUrl}')">
              ▶
            </button>
            <div class="voice-waveform-preview">
              <span class="waveform-bar" style="height: 10px;"></span>
              <span class="waveform-bar" style="height: 18px;"></span>
              <span class="waveform-bar" style="height: 14px;"></span>
              <span class="waveform-bar" style="height: 22px;"></span>
              <span class="waveform-bar" style="height: 16px;"></span>
              <span class="waveform-bar" style="height: 12px;"></span>
              <span class="waveform-bar" style="height: 20px;"></span>
            </div>
            <span class="voice-duration">${msg.duration || '0:05'}</span>
          </div>
          ${renderQuickActions(msg.id)}
        </div>
        <div class="reaction-list" id="reactions-${msg.id}"></div>
        <div class="message-meta">
          <span>${timeStr}</span>
        </div>
      </div>
    `;

    DOM.messagesFeed.appendChild(row);
    scrollToBottom();

    if (window.SoundManager) {
      window.SoundManager.playReceived();
    }
  }

  function appendSystemMessage(text) {
    const div = document.createElement('div');
    div.className = 'system-event-message';
    div.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
      <span>${escapeHTML(text)}</span>
    `;
    DOM.messagesFeed.appendChild(div);
    scrollToBottom();
  }

  // Quick reaction buttons HTML
  function renderQuickActions(messageId) {
    const emojis = ['👍', '❤️', '😂', '😮', '🚀', '🔥'];
    const buttons = emojis.map(e => `
      <button class="btn-emoji-quick" onclick="window.PulseChat.reactToMessage('${messageId}', '${e}')">${e}</button>
    `).join('');

    return `<div class="msg-quick-actions">${buttons}</div>`;
  }

  // --- REACTIONS ---
  function reactToMessage(messageId, emoji) {
    applyReaction(messageId, emoji, state.myName);
    broadcastData({
      type: 'reaction',
      messageId: messageId,
      emoji: emoji,
      sender: state.myName
    });
  }

  function applyReaction(messageId, emoji, sender) {
    const container = document.getElementById(`reactions-${messageId}`);
    if (!container) return;

    let pill = container.querySelector(`[data-emoji="${emoji}"]`);
    if (pill) {
      const countEl = pill.querySelector('.reaction-count');
      const count = parseInt(countEl.textContent, 10) + 1;
      countEl.textContent = count;
    } else {
      pill = document.createElement('span');
      pill.className = `reaction-pill ${sender === state.myName ? 'reacted' : ''}`;
      pill.setAttribute('data-emoji', emoji);
      pill.innerHTML = `<span>${emoji}</span> <span class="reaction-count">1</span>`;
      container.appendChild(pill);
    }
  }

  // --- TYPING INDICATOR ---
  function sendTypingStatus(isTyping) {
    broadcastData({
      type: 'typing',
      isTyping: isTyping,
      sender: state.myName
    });
  }

  function showRemoteTyping(senderName, isTyping) {
    if (isTyping) {
      DOM.typingIndicatorText.textContent = `${senderName} is typing...`;
      DOM.typingIndicatorBar.classList.add('active');
      clearTimeout(state.typingTimeout);
      state.typingTimeout = setTimeout(() => {
        DOM.typingIndicatorBar.classList.remove('active');
      }, 3500);
    } else {
      DOM.typingIndicatorBar.classList.remove('active');
    }
  }

  // --- FILE & IMAGE ATTACHMENTS ---
  function handleFilesSelected(files) {
    if (!files || files.length === 0) return;

    if (state.connections.size === 0) {
      showToast("Please connect to a friend first!", 'info');
      openInviteModal();
      return;
    }

    Array.from(files).forEach(file => {
      // 10MB limit for WebRTC data channel chunks
      if (file.size > 10 * 1024 * 1024) {
        showToast(`File "${file.name}" is over 10MB limit.`, 'error');
        return;
      }

      const reader = new FileReader();
      const isImg = file.type.startsWith('image/');

      reader.onload = (e) => {
        const dataUrl = e.target.result;
        const msgId = 'file-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);

        const payload = {
          type: 'file',
          id: msgId,
          name: file.name,
          size: file.size,
          fileType: file.type,
          dataUrl: dataUrl,
          isImage: isImg,
          timestamp: Date.now(),
          sender: state.myName,
          avatar: state.myAvatar
        };

        broadcastData(payload);

        // Render sent file locally
        appendSentFileMessage({
          id: msgId,
          name: file.name,
          size: file.size,
          dataUrl: dataUrl,
          isImage: isImg,
          timestamp: payload.timestamp
        });

        if (window.SoundManager) {
          window.SoundManager.playSent();
        }
      };

      reader.readAsDataURL(file);
    });
  }

  function appendSentFileMessage({ id, name, size, dataUrl, isImage, timestamp }) {
    DOM.emptyWelcomeState.style.display = 'none';

    const row = document.createElement('div');
    row.className = 'message-row me';
    row.id = `msg-row-${id}`;

    let contentHtml = '';
    if (isImage) {
      contentHtml = `<img src="${dataUrl}" alt="${escapeHTML(name)}" class="bubble-image" onclick="window.PulseChat.openLightbox('${dataUrl}')">`;
    } else {
      contentHtml = `
        <a href="${dataUrl}" download="${escapeHTML(name)}" class="bubble-file-card">
          <div class="file-card-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
          </div>
          <div class="file-card-info">
            <span class="file-name">${escapeHTML(name)}</span>
            <span class="file-size">${formatBytes(size)}</span>
          </div>
        </a>
      `;
    }

    row.innerHTML = `
      <div class="msg-avatar">${state.myAvatar}</div>
      <div class="bubble-wrap">
        <div class="msg-sender-name">You</div>
        <div class="message-bubble">
          ${contentHtml}
          ${renderQuickActions(id)}
        </div>
        <div class="reaction-list" id="reactions-${id}"></div>
        <div class="message-meta">
          <span>${formatTime(timestamp)}</span>
          <span class="receipt-icon" id="receipt-${id}">✓</span>
        </div>
      </div>
    `;

    DOM.messagesFeed.appendChild(row);
    scrollToBottom();
  }

  // --- VOICE RECORDING ---
  async function startVoiceRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = state.audioRecording;
      rec.stream = stream;
      rec.chunks = [];
      rec.startTime = Date.now();

      const mediaRecorder = new MediaRecorder(stream);
      rec.recorder = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          rec.chunks.push(e.data);
        }
      };

      mediaRecorder.start();

      // UI changes
      DOM.recordingBar.classList.add('active');
      DOM.messageForm.style.display = 'none';

      // Timer
      clearInterval(rec.timerInterval);
      rec.timerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - rec.startTime) / 1000);
        const mins = String(Math.floor(elapsed / 60)).padStart(2, '0');
        const secs = String(elapsed % 60).padStart(2, '0');
        DOM.recordingTimerDisplay.textContent = `${mins}:${secs}`;
      }, 500);

      // Visualizer
      setupWaveformCanvas(stream);

    } catch (e) {
      console.warn('Microphone access denied or error:', e);
      showToast('Could not access microphone for voice message.', 'error');
    }
  }

  function setupWaveformCanvas(stream) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 64;
    source.connect(analyser);

    const canvas = DOM.recordingWaveformCanvas;
    const canvasCtx = canvas.getContext('2d');
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    function draw() {
      state.audioRecording.animId = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
      const barWidth = (canvas.width / bufferLength) * 2;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;
        canvasCtx.fillStyle = '#f43f5e';
        canvasCtx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);
        x += barWidth;
      }
    }
    draw();
  }

  function stopVoiceRecording(shouldSend) {
    const rec = state.audioRecording;
    if (!rec.recorder) return;

    clearInterval(rec.timerInterval);
    if (rec.animId) cancelAnimationFrame(rec.animId);

    DOM.recordingBar.classList.remove('active');
    DOM.messageForm.style.display = 'flex';

    if (shouldSend) {
      rec.recorder.onstop = () => {
        const blob = new Blob(rec.chunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = () => {
          const audioUrl = reader.result;
          const elapsed = Math.floor((Date.now() - rec.startTime) / 1000);
          const durationStr = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}`;
          const msgId = 'voice-' + Date.now();

          const payload = {
            type: 'voice',
            id: msgId,
            audioUrl: audioUrl,
            duration: durationStr,
            timestamp: Date.now(),
            sender: state.myName,
            avatar: state.myAvatar
          };

          broadcastData(payload);

          // Append local
          appendSentVoiceMessage({
            id: msgId,
            audioUrl: audioUrl,
            duration: durationStr,
            timestamp: payload.timestamp
          });

          if (window.SoundManager) {
            window.SoundManager.playSent();
          }
        };
        reader.readAsDataURL(blob);
      };
    }

    rec.recorder.stop();
    if (rec.stream) {
      rec.stream.getTracks().forEach(t => t.stop());
    }
  }

  function appendSentVoiceMessage({ id, audioUrl, duration, timestamp }) {
    DOM.emptyWelcomeState.style.display = 'none';

    const row = document.createElement('div');
    row.className = 'message-row me';
    row.id = `msg-row-${id}`;

    row.innerHTML = `
      <div class="msg-avatar">${state.myAvatar}</div>
      <div class="bubble-wrap">
        <div class="msg-sender-name">You</div>
        <div class="message-bubble">
          <div class="voice-note-player">
            <button class="voice-play-btn" onclick="window.PulseChat.playVoiceNote('${id}', '${audioUrl}')">
              ▶
            </button>
            <div class="voice-waveform-preview">
              <span class="waveform-bar active" style="height: 12px;"></span>
              <span class="waveform-bar active" style="height: 20px;"></span>
              <span class="waveform-bar active" style="height: 16px;"></span>
              <span class="waveform-bar active" style="height: 24px;"></span>
              <span class="waveform-bar active" style="height: 18px;"></span>
              <span class="waveform-bar active" style="height: 14px;"></span>
            </div>
            <span class="voice-duration">${duration}</span>
          </div>
          ${renderQuickActions(id)}
        </div>
        <div class="reaction-list" id="reactions-${id}"></div>
        <div class="message-meta">
          <span>${formatTime(timestamp)}</span>
          <span class="receipt-icon" id="receipt-${id}">✓</span>
        </div>
      </div>
    `;

    DOM.messagesFeed.appendChild(row);
    scrollToBottom();
  }

  // Voice note playback helper
  let currentAudio = null;
  function playVoiceNote(id, url) {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }
    const audio = new Audio(url);
    currentAudio = audio;
    audio.play();
  }

  // --- AUDIO & VIDEO CALLING ENGINE ---
  async function startCall(videoEnabled) {
    if (state.connections.size === 0) {
      showToast('Connect with a friend first before starting a call!', 'info');
      openInviteModal();
      return;
    }

    const targetPeerId = state.activePeerId || Array.from(state.connections.keys())[0];
    if (!targetPeerId) return;

    try {
      showToast(`Starting ${videoEnabled ? 'video' : 'voice'} call...`, 'info');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoEnabled,
        audio: true
      });

      state.localStream = stream;
      DOM.localVideoFeed.srcObject = stream;
      DOM.localVideoFeed.style.display = videoEnabled ? 'block' : 'none';

      // Open call overlay
      DOM.activeCallOverlay.classList.add('active');

      if (!videoEnabled) {
        DOM.audioCallAvatarView.classList.add('active');
        DOM.audioCallPeerName.textContent = `Voice Call with ${targetPeerId}`;
      } else {
        DOM.audioCallAvatarView.classList.remove('active');
      }

      // Start WebRTC Call via PeerJS
      const mediaCall = state.peer.call(targetPeerId, stream);
      state.activeCall = mediaCall;

      setupMediaCallEvents(mediaCall);
      startCallDurationTimer();

    } catch (e) {
      console.error('Call getUserMedia error:', e);
      showToast('Could not access camera or microphone.', 'error');
    }
  }

  function handleIncomingCall(mediaCall) {
    state.activeCall = mediaCall;
    DOM.incomingCallerName.textContent = mediaCall.peer;
    DOM.incomingCallType.textContent = 'Incoming P2P Call...';
    DOM.incomingCallModal.classList.add('active');

    if (window.SoundManager) {
      window.SoundManager.startRinging();
    }
  }

  async function acceptCall(videoEnabled) {
    if (window.SoundManager) {
      window.SoundManager.stopRinging();
    }
    DOM.incomingCallModal.classList.remove('active');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoEnabled,
        audio: true
      });

      state.localStream = stream;
      DOM.localVideoFeed.srcObject = stream;
      DOM.localVideoFeed.style.display = videoEnabled ? 'block' : 'none';

      // Answer call
      state.activeCall.answer(stream);

      // Open Call UI
      DOM.activeCallOverlay.classList.add('active');
      if (!videoEnabled) {
        DOM.audioCallAvatarView.classList.add('active');
        DOM.audioCallPeerName.textContent = `Call with ${state.activeCall.peer}`;
      } else {
        DOM.audioCallAvatarView.classList.remove('active');
      }

      setupMediaCallEvents(state.activeCall);
      startCallDurationTimer();

    } catch (e) {
      console.error('Accept call media error:', e);
      showToast('Could not access microphone/camera.', 'error');
      endCall();
    }
  }

  function declineCall() {
    if (window.SoundManager) {
      window.SoundManager.stopRinging();
      window.SoundManager.playHangup();
    }
    DOM.incomingCallModal.classList.remove('active');
    if (state.activeCall) {
      state.activeCall.close();
      state.activeCall = null;
    }
  }

  function setupMediaCallEvents(mediaCall) {
    mediaCall.on('stream', (remoteStream) => {
      state.remoteStream = remoteStream;
      DOM.remoteVideoFeed.srcObject = remoteStream;

      // If remote has no video tracks, show audio view
      if (remoteStream.getVideoTracks().length === 0) {
        DOM.audioCallAvatarView.classList.add('active');
      }
    });

    mediaCall.on('close', () => {
      endCall();
    });

    mediaCall.on('error', (err) => {
      console.warn('Call error:', err);
      endCall();
    });
  }

  function endCall() {
    if (window.SoundManager) {
      window.SoundManager.stopRinging();
      window.SoundManager.playHangup();
    }

    if (state.activeCall) {
      state.activeCall.close();
      state.activeCall = null;
    }

    if (state.localStream) {
      state.localStream.getTracks().forEach(t => t.stop());
      state.localStream = null;
    }

    state.remoteStream = null;
    DOM.remoteVideoFeed.srcObject = null;
    DOM.localVideoFeed.srcObject = null;

    DOM.activeCallOverlay.classList.remove('active');
    DOM.incomingCallModal.classList.remove('active');

    stopCallDurationTimer();
    showToast('Call ended', 'info');
  }

  function toggleCallMic() {
    if (!state.localStream) return;
    const audioTrack = state.localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      DOM.callMicOnIcon.style.display = audioTrack.enabled ? 'block' : 'none';
      DOM.callMicOffIcon.style.display = audioTrack.enabled ? 'none' : 'block';
      DOM.callToggleMicBtn.classList.toggle('active-off', !audioTrack.enabled);
    }
  }

  function toggleCallCam() {
    if (!state.localStream) return;
    const videoTrack = state.localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      DOM.callCamOnIcon.style.display = videoTrack.enabled ? 'block' : 'none';
      DOM.callCamOffIcon.style.display = videoTrack.enabled ? 'none' : 'block';
      DOM.callToggleCamBtn.classList.toggle('active-off', !videoTrack.enabled);
      DOM.localVideoFeed.style.display = videoTrack.enabled ? 'block' : 'none';
    }
  }

  async function toggleScreenShare() {
    if (!navigator.mediaDevices.getDisplayMedia) {
      showToast('Screen sharing not supported on this browser.', 'error');
      return;
    }
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack = screenStream.getVideoTracks()[0];

      if (state.activeCall && state.activeCall.peerConnection) {
        const sender = state.activeCall.peerConnection.getSenders().find(s => s.track && s.track.kind === 'video');
        if (sender) {
          sender.replaceTrack(screenTrack);
        }
      }

      DOM.localVideoFeed.srcObject = screenStream;

      screenTrack.onended = () => {
        // Revert to camera if available
        if (state.localStream && state.localStream.getVideoTracks()[0]) {
          const camTrack = state.localStream.getVideoTracks()[0];
          const sender = state.activeCall?.peerConnection?.getSenders().find(s => s.track && s.track.kind === 'video');
          if (sender) sender.replaceTrack(camTrack);
          DOM.localVideoFeed.srcObject = state.localStream;
        }
      };

    } catch (e) {
      console.warn('Screen share cancelled/failed:', e);
    }
  }

  function startCallDurationTimer() {
    state.callDurationSeconds = 0;
    clearInterval(state.callTimerInterval);
    state.callTimerInterval = setInterval(() => {
      state.callDurationSeconds++;
      const mins = String(Math.floor(state.callDurationSeconds / 60)).padStart(2, '0');
      const secs = String(state.callDurationSeconds % 60).padStart(2, '0');
      DOM.callDurationTimer.textContent = `${mins}:${secs}`;
    }, 1000);
  }

  function stopCallDurationTimer() {
    clearInterval(state.callTimerInterval);
    state.callDurationSeconds = 0;
    DOM.callDurationTimer.textContent = '00:00';
  }

  // --- EMOJI PICKER ---
  const EMOJI_CATEGORIES = {
    smileys: ['😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘','😗','😙','😚','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕'],
    gestures: ['👍','👎','👌','🤌','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','✋','🤚','🖐️','🖖','👋','🤙','🤝','👏','🙌','👐','🤲','👊','✊','🤛','🤜','💪','🧠','👀'],
    hearts: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','🔥','✨','⭐','🌟','💫','💥'],
    party: ['🎉','🎊','🥳','🎈','🎂','🎁','🎇','🎆','🍻','🥂','🍾','🍕','🍔','🍟','🧁','🍰','🍦','🍧','🍩','🍪','🏆','🥇','🎯','🚀'],
    tech: ['💻','🖥️','📱','📲','⌨️','🖱️','🎧','🎮','🕹️','🤖','⚡','💾','💿','📀','📡','🛰️','🔋','🔌','💡','🔎','🔧','⚙️','🛡️','🔒']
  };

  function initEmojiPicker() {
    renderEmojiCategory('smileys');

    DOM.emojiPicker.querySelectorAll('.emoji-tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        DOM.emojiPicker.querySelectorAll('.emoji-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderEmojiCategory(btn.getAttribute('data-tab'));
      });
    });
  }

  function renderEmojiCategory(category) {
    const emojis = EMOJI_CATEGORIES[category] || EMOJI_CATEGORIES.smileys;
    DOM.emojiGrid.innerHTML = '';
    emojis.forEach(emoji => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'emoji-item';
      btn.textContent = emoji;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        insertEmojiIntoInput(emoji);
      });
      DOM.emojiGrid.appendChild(btn);
    });
  }

  function insertEmojiIntoInput(emoji) {
    const input = DOM.messageTextInput;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const text = input.value;
    input.value = text.substring(0, start) + emoji + text.substring(end);
    input.selectionStart = input.selectionEnd = start + emoji.length;
    input.focus();
  }

  // --- INVITE & QR CODE ---
  function updateInviteLinks() {
    if (!state.myId) return;
    const url = getInviteUrl();
    DOM.welcomeShareUrl.textContent = url;
    DOM.modalShareUrlText.textContent = url;

    // Render SVG QR code
    if (window.generateQRCodeSVG) {
      DOM.qrCodeContainer.innerHTML = window.generateQRCodeSVG(url, {
        size: 190,
        color: '#00F0FF',
        background: 'transparent'
      });
    }
  }

  function getInviteUrl() {
    const base = window.location.href.split('#')[0].split('?')[0];
    return `${base}#peer=${state.myId}`;
  }

  function openInviteModal() {
    updateInviteLinks();
    DOM.inviteModal.classList.add('active');
  }

  function openTestTab() {
    if (!state.myId) {
      showToast('Generating P2P identity, please wait 2 seconds...', 'info');
      return;
    }
    const inviteUrl = getInviteUrl();
    window.open(inviteUrl, '_blank');
    showToast('Opened test tab! You can now chat between both tabs.', 'success');
  }

  function copyTextToClipboard(text, successMsg) {
    navigator.clipboard.writeText(text).then(() => {
      showToast(successMsg || 'Copied to clipboard!', 'success');
    }).catch(() => {
      showToast('Copy failed, please copy manually', 'error');
    });
  }

  // --- SEARCH IN CHAT ---
  function filterMessages(query) {
    query = query.toLowerCase().trim();
    const rows = DOM.messagesFeed.querySelectorAll('.message-row');
    rows.forEach(row => {
      if (!query) {
        row.style.display = 'flex';
      } else {
        const text = row.querySelector('.message-content')?.textContent?.toLowerCase() || '';
        row.style.display = text.includes(query) ? 'flex' : 'none';
      }
    });
  }

  // --- EXPORT & CLEAR CHAT ---
  function exportChatHistory() {
    if (state.messages.length === 0) {
      showToast('No messages to export yet!', 'info');
      return;
    }
    let content = `PulseChat Conversation History\nExported on: ${new Date().toLocaleString()}\nParticipants: You, ${DOM.activeRecipientName.textContent}\n` + '='.repeat(50) + '\n\n';

    state.messages.forEach(m => {
      content += `[${new Date(m.timestamp).toLocaleTimeString()}] ${m.sender}: ${m.text}\n`;
    });

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PulseChat_${DOM.activeRecipientName.textContent}_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Chat history exported!', 'success');
  }

  function clearChatHistory() {
    if (confirm('Are you sure you want to clear this conversation?')) {
      DOM.messagesFeed.querySelectorAll('.message-row, .system-event-message').forEach(el => el.remove());
      state.messages = [];
      DOM.emptyWelcomeState.style.display = 'flex';
      showToast('Chat cleared', 'info');
    }
  }

  // --- DRAG AND DROP ---
  function setupDragAndDrop() {
    const dropZone = DOM.chatMainArea;

    ['dragenter', 'dragover'].forEach(eventName => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
      });
    });

    dropZone.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      if (dt && dt.files && dt.files.length > 0) {
        handleFilesSelected(dt.files);
      }
    });
  }

  // --- EVENT LISTENERS SETUP ---
  function setupEventListeners() {
    // Header
    DOM.openTestTabBtn.addEventListener('click', openTestTab);
    DOM.inviteModalBtn.addEventListener('click', openInviteModal);
    DOM.soundToggleBtn.addEventListener('click', toggleSound);
    DOM.themeToggleBtn.addEventListener('click', toggleTheme);
    DOM.mobileSidebarToggle.addEventListener('click', () => {
      DOM.sidebarPanel.classList.toggle('mobile-open');
    });

    // Profile & ID
    DOM.copyMyIdBtn.addEventListener('click', () => {
      if (state.myId) copyTextToClipboard(state.myId, 'Peer ID copied to clipboard!');
    });

    DOM.openProfileModalBtn.addEventListener('click', () => {
      DOM.profileNameInput.value = state.myName;
      renderAvatarChoices();
      DOM.profileModal.classList.add('active');
    });

    DOM.closeProfileModalBtn.addEventListener('click', () => {
      DOM.profileModal.classList.remove('active');
    });

    DOM.saveProfileBtn.addEventListener('click', () => {
      const newName = DOM.profileNameInput.value.trim() || state.myName;
      state.myName = newName;
      localStorage.setItem('pulsechat_name', newName);
      localStorage.setItem('pulsechat_avatar', state.myAvatar);
      updateProfileUI();
      DOM.profileModal.classList.remove('active');
      showToast('Profile updated!', 'success');

      // Update connected peers with new handshake
      broadcastData({
        type: 'handshake',
        name: state.myName,
        avatar: state.myAvatar
      });
    });

    // Connect to Friend Form
    DOM.connectForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const target = DOM.targetPeerIdInput.value.trim();
      if (target) {
        connectToPeer(target);
        DOM.targetPeerIdInput.value = '';
      }
    });

    DOM.copyInviteLinkChip.addEventListener('click', () => {
      copyTextToClipboard(getInviteUrl(), 'Invite link copied! Send it to your friend.');
    });

    DOM.showQrChip.addEventListener('click', openInviteModal);

    // Welcome State buttons
    DOM.welcomeCopyBtn.addEventListener('click', () => {
      copyTextToClipboard(getInviteUrl(), 'Invite link copied!');
    });
    DOM.welcomeOpenTestBtn.addEventListener('click', openTestTab);
    DOM.welcomeShowQrBtn.addEventListener('click', openInviteModal);
    DOM.welcomeCopyCodeBtn.addEventListener('click', () => {
      if (state.myId) copyTextToClipboard(state.myId, 'Peer code copied!');
    });

    // Invite Modal
    DOM.closeInviteModalBtn.addEventListener('click', () => {
      DOM.inviteModal.classList.remove('active');
    });
    DOM.modalCopyLinkBtn.addEventListener('click', () => {
      copyTextToClipboard(getInviteUrl(), 'Invite link copied!');
    });
    DOM.modalCopyCodeBtn.addEventListener('click', () => {
      if (state.myId) copyTextToClipboard(state.myId, 'Peer code copied!');
    });
    DOM.modalOpenTabBtn.addEventListener('click', openTestTab);

    // Chat Controls
    DOM.startVoiceCallBtn.addEventListener('click', () => startCall(false));
    DOM.startVideoCallBtn.addEventListener('click', () => startCall(true));

    DOM.toggleSearchBtn.addEventListener('click', () => {
      DOM.chatSearchBar.classList.toggle('active');
      if (DOM.chatSearchBar.classList.contains('active')) {
        DOM.searchFilterInput.focus();
      } else {
        DOM.searchFilterInput.value = '';
        filterMessages('');
      }
    });

    DOM.searchFilterInput.addEventListener('input', (e) => {
      filterMessages(e.target.value);
    });

    DOM.closeSearchBtn.addEventListener('click', () => {
      DOM.chatSearchBar.classList.remove('active');
      DOM.searchFilterInput.value = '';
      filterMessages('');
    });

    DOM.exportChatBtn.addEventListener('click', exportChatHistory);
    DOM.clearChatBtn.addEventListener('click', clearChatHistory);

    // Message Input
    DOM.messageForm.addEventListener('submit', handleSendMessage);

    DOM.messageTextInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    });

    DOM.messageTextInput.addEventListener('input', () => {
      // Auto-grow textarea
      DOM.messageTextInput.style.height = 'auto';
      DOM.messageTextInput.style.height = Math.min(DOM.messageTextInput.scrollHeight, 140) + 'px';

      // Typing status notification
      if (!state.isLocalTyping) {
        state.isLocalTyping = true;
        sendTypingStatus(true);
      }
      clearTimeout(state.typingTimeout);
      state.typingTimeout = setTimeout(() => {
        state.isLocalTyping = false;
        sendTypingStatus(false);
      }, 2000);
    });

    // File attachments
    DOM.attachFileBtn.addEventListener('click', () => DOM.fileAttachmentInput.click());
    DOM.fileAttachmentInput.addEventListener('change', (e) => {
      handleFilesSelected(e.target.files);
      DOM.fileAttachmentInput.value = '';
    });

    DOM.attachImageBtn.addEventListener('click', () => DOM.imageAttachmentInput.click());
    DOM.imageAttachmentInput.addEventListener('change', (e) => {
      handleFilesSelected(e.target.files);
      DOM.imageAttachmentInput.value = '';
    });

    // Emoji Picker toggle
    DOM.emojiPickerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      DOM.emojiPicker.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
      if (!DOM.emojiPicker.contains(e.target) && e.target !== DOM.emojiPickerBtn) {
        DOM.emojiPicker.classList.remove('open');
      }
    });

    // Voice recording buttons
    DOM.startVoiceRecordBtn.addEventListener('click', startVoiceRecording);
    DOM.cancelVoiceRecordBtn.addEventListener('click', () => stopVoiceRecording(false));
    DOM.sendVoiceRecordBtn.addEventListener('click', () => stopVoiceRecording(true));

    // Call Actions
    DOM.callToggleMicBtn.addEventListener('click', toggleCallMic);
    DOM.callToggleCamBtn.addEventListener('click', toggleCallCam);
    DOM.callScreenShareBtn.addEventListener('click', toggleScreenShare);
    DOM.hangUpCallBtn.addEventListener('click', endCall);

    DOM.acceptCallBtn.addEventListener('click', () => acceptCall(true));
    DOM.declineCallBtn.addEventListener('click', declineCall);

    // Lightbox close
    DOM.imageLightbox.addEventListener('click', () => {
      DOM.imageLightbox.classList.remove('active');
    });
  }

  // --- UTILITIES ---
  function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag));
  }

  function formatMessageText(text) {
    let escaped = escapeHTML(text);

    // Bold: **text**
    escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Italic: *text*
    escaped = escaped.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Inline Code: `code`
    escaped = escaped.replace(/`([^`]+)`/g, '<code style="background:rgba(0,0,0,0.3); padding:2px 6px; border-radius:4px; font-family:var(--font-code); font-size:0.85em;">$1</code>');

    // Auto-link URLs
    const urlPattern = /(\b(https?):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
    escaped = escaped.replace(urlPattern, '<a href="$1" target="_blank" rel="noopener noreferrer" style="color:var(--cyan-primary); text-decoration:underline;">$1</a>');

    // Line breaks
    escaped = escaped.replace(/\n/g, '<br>');

    return escaped;
  }

  function formatTime(timestamp) {
    const d = new Date(timestamp);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  function scrollToBottom() {
    DOM.messagesFeed.scrollTop = DOM.messagesFeed.scrollHeight;
  }

  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = 'toast';

    let icon = 'ℹ️';
    if (type === 'success') {
      icon = '✅';
      toast.style.borderLeftColor = 'var(--emerald-online)';
    } else if (type === 'error') {
      icon = '⚠️';
      toast.style.borderLeftColor = 'var(--rose-danger)';
    }

    toast.innerHTML = `<span>${icon}</span><span>${escapeHTML(message)}</span>`;
    DOM.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(20px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  function openLightbox(imgSrc) {
    DOM.lightboxImg.src = imgSrc;
    DOM.imageLightbox.classList.add('active');
  }

  // Expose global methods for inline event handlers
  window.PulseChat = {
    openLightbox: openLightbox,
    playVoiceNote: playVoiceNote,
    reactToMessage: reactToMessage
  };

  // Launch on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
