// Firebase configuration
// CORRECTED Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDCA8QvmYYqiGYQDzllxKBERohX7fKjgmI",
  authDomain: "my-chat-app-dc190.firebaseapp.com",
  databaseURL: "https://my-chat-app-dc190-default-rtdb.firebaseio.com",
  projectId: "my-chat-app-dc190",
  storageBucket: "my-chat-app-dc190.appspot.com", // MUST be .appspot.com
  messagingSenderId: "956478476360",
  appId: "1:956478476360:web:d0b9abfcae5b5d977fc87d",
  measurementId: "G-68BLDPX6RF"
};

// Initialize with explicit bucket URL
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();
const storage = app.storage("gs://my-chat-app-dc190.appspot.com"); // Explicit initialization

// Verify initialization
console.log("Storage bucket URL:", storage.ref().bucket);

// Add this to verify storage is working
console.log("Storage bucket:", storage.ref().bucket);
// DOM Elements
const screens = document.querySelectorAll('.screen');
const navItems = document.querySelectorAll('.nav-item');
const chatsList = document.getElementById('chats-list');
const chatMessages = document.getElementById('chat-messages');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const backButton = document.getElementById('back-to-chats');
const chatName = document.getElementById('chat-name');
const currentChatAvatar = document.getElementById('current-chat-avatar');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const goToRegister = document.getElementById('go-to-register');
const goToLogin = document.getElementById('go-to-login');
const logoutButton = document.getElementById('logout-button');
const darkModeToggle = document.getElementById('dark-mode-toggle');
const loading = document.getElementById('loading');
const profileForm = document.querySelector('.profile-form');
const profileName = document.getElementById('profile-name');
const profileEmail = document.getElementById('profile-email');
const profilePhone = document.getElementById('profile-phone');
const profileAvatar = document.getElementById('profile-avatar');
const avatarUpload = document.getElementById('avatar-upload');
const searchUsersButton = document.getElementById('search-users');
const newChatButton = document.getElementById('new-chat');

// App State
let currentUser = null;
let currentChatId = null;
let chatRef = null;
let messagesRef = null;
let allUsers = {};
let userChats = {};

// Initialize the app
function init() {
    setupEventListeners();
    checkAuthState();
    
    // Set default avatar for current chat
    currentChatAvatar.src = 'https://ui-avatars.com/api/?name=U&background=5468ff&color=fff';
    currentChatAvatar.onerror = () => {
        currentChatAvatar.src = 'https://ui-avatars.com/api/?name=U&background=5468ff&color=fff';
    };
}

// Check authentication state
function checkAuthState() {
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            loadUserProfile();
            loadAllUsers();
            switchScreen('chats');
            
            // Set auth persistence
            firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL)
                .catch(error => {
                    console.error("Auth persistence error:", error);
                });
        } else {
            currentUser = null;
            switchScreen('login');
        }
    });
}

// Load user profile
function loadUserProfile() {
    database.ref('users/' + currentUser.uid).once('value').then(snapshot => {
        if (snapshot.exists()) {
            const userData = snapshot.val();
            profileName.value = userData.displayName || '';
            profileEmail.value = userData.email || '';
            profilePhone.value = userData.phone || '';
            
            // Set profile avatar with fallback
            profileAvatar.src = userData.photoURL || 
                'https://ui-avatars.com/api/?name=' + encodeURIComponent(userData.displayName || 'U') + '&background=5468ff&color=fff';
            profileAvatar.onerror = () => {
                profileAvatar.src = 'https://ui-avatars.com/api/?name=U&background=5468ff&color=fff';
            };
        }
    });
}

// Load all users
function loadAllUsers() {
    database.ref('users').on('value', snapshot => {
        if (snapshot.exists()) {
            allUsers = snapshot.val();
        }
    });
}

// Load chats
function loadChats() {
    showLoading();
    const chatsRef = database.ref('users/' + currentUser.uid + '/chats');
    
    chatsRef.on('value', snapshot => {
        chatsList.innerHTML = '';
        userChats = {};
        
        if (snapshot.exists()) {
            const chats = snapshot.val();
            Object.keys(chats).forEach(chatId => {
                database.ref('chats/' + chatId).once('value').then(chatSnapshot => {
                    const chat = chatSnapshot.val();
                    if (chat) {
                        userChats[chatId] = chat;
                        renderChatItem(chatId, chat);
                    }
                    hideLoading();
                });
            });
        } else {
            hideLoading();
        }
    }, error => {
        console.error("Error loading chats:", error);
        hideLoading();
    });
}

// Render chat item
function renderChatItem(chatId, chat) {
    const otherUserId = Object.keys(chat.members).find(uid => uid !== currentUser.uid);
    if (!otherUserId) return;
    
    database.ref('users/' + otherUserId).once('value').then(userSnapshot => {
        const user = userSnapshot.val();
        if (!user) return;
        
        const lastMessage = chat.lastMessage || "No messages yet";
        const lastMessageTime = chat.lastMessageTime ? formatTime(chat.lastMessageTime) : "";
        
        const chatItem = document.createElement('div');
        chatItem.className = 'chat-item';
        chatItem.setAttribute('data-id', chatId);
        
        chatItem.innerHTML = `
            <img src="${user.photoURL || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.displayName || 'U') + '&background=5468ff&color=fff'}" 
                 alt="${user.displayName}" 
                 class="chat-avatar"
                 onerror="this.src='https://ui-avatars.com/api/?name=U&background=5468ff&color=fff'">
            <div class="chat-info">
                <div class="chat-name">${user.displayName}</div>
                <div class="chat-last-message">${lastMessage}</div>
            </div>
            <div class="chat-time">${lastMessageTime}</div>
        `;
        
        chatsList.appendChild(chatItem);
        chatItem.addEventListener('click', () => {
            openChat(chatId, user.displayName, user.photoURL);
        });
    });
}

// Open chat
function openChat(chatId, userName, userAvatar) {
    currentChatId = chatId;
    chatName.textContent = userName;
    
    // Set chat avatar with fallback
    currentChatAvatar.src = userAvatar || 
        'https://ui-avatars.com/api/?name=' + encodeURIComponent(userName || 'U') + '&background=5468ff&color=fff';
    currentChatAvatar.onerror = () => {
        currentChatAvatar.src = 'https://ui-avatars.com/api/?name=U&background=5468ff&color=fff';
    };
    
    chatRef = database.ref('chats/' + chatId);
    messagesRef = database.ref('messages/' + chatId);
    loadMessages();
    switchScreen('chat');
}

// Load messages
function loadMessages() {
    chatMessages.innerHTML = '';
    messagesRef.orderByChild('timestamp').on('child_added', snapshot => {
        const message = snapshot.val();
        addMessage(message.text, formatTime(message.timestamp), message.senderId === currentUser.uid);
    });
}

// Add message
function addMessage(text, time, isSent) {
    const messageEl = document.createElement('div');
    messageEl.className = `message ${isSent ? 'message-sent' : 'message-received'}`;
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    messageContent.textContent = text;
    
    const messageTime = document.createElement('div');
    messageTime.className = 'message-time';
    messageTime.textContent = time;
    
    messageEl.appendChild(messageContent);
    messageEl.appendChild(messageTime);
    
    chatMessages.appendChild(messageEl);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Switch screen
function switchScreen(screenId) {
    // Save last screen to sessionStorage
    if (['chats', 'settings', 'profile'].includes(screenId)) {
        sessionStorage.setItem('lastScreen', screenId);
    }
    
    screens.forEach(screen => screen.classList.remove('active'));
    document.getElementById(`${screenId}-screen`).classList.add('active');
    
    // Hide navigation in chat screen
    document.querySelector('.navigation').style.display = 
        screenId === 'chat' ? 'none' : 'flex';
    
    // Update active nav item
    if (['chats', 'settings', 'profile'].includes(screenId)) {
        navItems.forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('data-screen') === screenId) {
                item.classList.add('active');
            }
        });
    }
    
    // Load data for specific screens
    if (screenId === 'chats') loadChats();
    if (screenId === 'profile') loadUserProfile();
}

// Show user search
function showUserSearch() {
    const searchContainer = document.createElement('div');
    searchContainer.className = 'modal';
    searchContainer.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Search Users</h3>
                <span class="close-modal">&times;</span>
            </div>
            <input type="text" id="user-search-input" placeholder="Search by username..." class="search-bar">
            <div class="search-results" id="search-results"></div>
        </div>
    `;
    
    document.body.appendChild(searchContainer);
    
    searchContainer.querySelector('.close-modal').addEventListener('click', () => {
        document.body.removeChild(searchContainer);
    });
    
    searchContainer.querySelector('#user-search-input').addEventListener('input', (e) => {
        searchUsers(e.target.value, 'search-results');
    });
}

// Search users
function searchUsers(query, resultsContainerId) {
    const resultsContainer = document.getElementById(resultsContainerId);
    if (!resultsContainer) return;
    
    resultsContainer.innerHTML = '';
    
    if (!query.trim()) {
        resultsContainer.innerHTML = '<div class="no-results">Start typing to search users</div>';
        return;
    }
    
    const searchTerm = query.toLowerCase();
    const foundUsers = Object.entries(allUsers)
        .filter(([id, user]) => 
            id !== currentUser.uid &&
            user.displayName && 
            user.displayName.toLowerCase().includes(searchTerm)
        );
    
    if (foundUsers.length === 0) {
        resultsContainer.innerHTML = '<div class="no-results">No users found</div>';
        return;
    }
    
    foundUsers.forEach(([id, user]) => {
        const userItem = document.createElement('div');
        userItem.className = 'search-result-item';
        userItem.innerHTML = `
            <img src="${user.photoURL || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.displayName || 'U') + '&background=5468ff&color=fff'}" 
                 alt="${user.displayName}" 
                 class="search-result-avatar"
                 onerror="this.src='https://ui-avatars.com/api/?name=U&background=5468ff&color=fff'">
            <div class="search-result-name">${user.displayName}</div>
        `;
        
        userItem.addEventListener('click', () => {
            startNewChat(id, user.displayName, user.photoURL);
            document.querySelector('.modal')?.remove();
        });
        
        resultsContainer.appendChild(userItem);
    });
}

// Start new chat
function startNewChat(userId, userName, userAvatar) {
    showLoading();
    
    // Check for existing chat
    const existingChatId = Object.keys(userChats).find(chatId => 
        userChats[chatId].members?.[userId]
    );
    
    if (existingChatId) {
        openChat(existingChatId, userName, userAvatar);
        hideLoading();
        return;
    }
    
    // Create new chat
    const newChatRef = database.ref('chats').push();
    const chatId = newChatRef.key;
    const timestamp = Date.now();
    
    const chatData = {
        members: {
            [currentUser.uid]: true,
            [userId]: true
        },
        createdAt: timestamp,
        lastMessage: "Chat started",
        lastMessageTime: timestamp
    };
    
    newChatRef.set(chatData).then(() => {
        const updates = {
            [`users/${currentUser.uid}/chats/${chatId}`]: true,
            [`users/${userId}/chats/${chatId}`]: true
        };
        
        database.ref().update(updates).then(() => {
            openChat(chatId, userName, userAvatar);
            hideLoading();
        });
    }).catch(error => {
        console.error("Error starting chat:", error);
        hideLoading();
    });
}

// Update profile
function updateProfile(e) {
    e.preventDefault();
    showLoading();
    
    const updates = {
        displayName: profileName.value,
        email: profileEmail.value,
        phone: profilePhone.value
    };
    
    // Update auth profile
    currentUser.updateProfile({
        displayName: profileName.value
    }).then(() => {
        // Update email if changed
        if (profileEmail.value !== currentUser.email) {
            return currentUser.updateEmail(profileEmail.value);
        }
    }).then(() => {
        // Update database
        return database.ref('users/' + currentUser.uid).update(updates);
    }).then(() => {
        hideLoading();
        alert('Profile updated successfully!');
        loadAllUsers();
    }).catch(error => {
        hideLoading();
        alert('Error updating profile: ' + error.message);
    });
}

// Upload avatar
async function handleAvatarUpload(event) {
    try {
        // Get the file from either the event or directly from the input
        const file = event?.target?.files?.[0] || avatarUpload.files[0];
        
        if (!file) {
            console.error('No file selected');
            return;
        }

        // Validate file type
        if (!file.type.match('image.*')) {
            alert('Please select an image file (JPEG, PNG, etc.)');
            return;
        }

        showLoading();

        // Generate unique filename
        const timestamp = Date.now();
        const fileExt = file.name.split('.').pop() || 'jpg';
        const fileName = `avatar_${timestamp}.${fileExt}`;
        
        // Create storage reference
        const storageRef = storage.ref(`profile_photos/${currentUser.uid}/${fileName}`);
        
        // Add metadata
        const metadata = {
            contentType: file.type,
            customMetadata: {
                uploadedBy: currentUser.uid,
                originalName: file.name
            }
        };

        // Start upload
        const uploadTask = storageRef.put(file, metadata);
        
        uploadTask.on('state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                console.log(`Upload progress: ${progress.toFixed(2)}%`);
            },
            (error) => {
                hideLoading();
                console.error('Upload error:', error);
                alert(`Upload failed: ${error.message}`);
            },
            async () => {
                try {
                    const url = await uploadTask.snapshot.ref.getDownloadURL();
                    console.log('File available at:', url);
                    
                    // Update user profile
                    await currentUser.updateProfile({ photoURL: url });
                    await database.ref(`users/${currentUser.uid}`).update({
                        photoURL: url,
                        lastUpdated: firebase.database.ServerValue.TIMESTAMP
                    });
                    
                    // Update UI
                    profileAvatar.src = url;
                    hideLoading();
                    alert('Profile photo updated successfully!');
                } catch (error) {
                    hideLoading();
                    console.error('Update error:', error);
                    alert('Profile update failed: ' + error.message);
                }
            }
        );
    } catch (error) {
        hideLoading();
        console.error('Upload error:', error);
        alert('Error: ' + error.message);
    }
}

// In setupEventListeners():
avatarUpload.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
        handleAvatarUpload(e); // Pass the event object
    }
});

// Send message
function sendMessage() {
    const text = messageInput.value.trim();
    if (!text || !currentChatId || !currentUser) return;
    
    const timestamp = Date.now();
    const message = {
        text: text,
        senderId: currentUser.uid,
        timestamp: timestamp
    };
    
    showLoading();
    messagesRef.push(message)
        .then(() => {
            messageInput.value = '';
            messageInput.style.height = 'auto';
            
            // Update last message preview
            const previewText = text.length > 30 ? text.substring(0, 30) + '...' : text;
            chatRef.update({
                lastMessage: previewText,
                lastMessageTime: timestamp
            });
            
            hideLoading();
        })
        .catch(error => {
            hideLoading();
            console.error("Error sending message:", error);
        });
}

// Format time
function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Show loading
function showLoading() {
    loading.classList.add('active');
}

// Hide loading
function hideLoading() {
    loading.classList.remove('active');
}

// Setup event listeners
function setupEventListeners() {
    // Navigation
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const screenId = item.getAttribute('data-screen');
            switchScreen(screenId);
        });
    });
    
    // Back button
    backButton.addEventListener('click', () => {
        if (messagesRef) messagesRef.off();
        switchScreen('chats');
    });
    
    // Message input
    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // Auto-resize textarea
    messageInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });
    
    // Auth forms
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        
        showLoading();
        auth.signInWithEmailAndPassword(email, password)
            .then(() => hideLoading())
            .catch(error => {
                hideLoading();
                alert(error.message);
            });
    });
    
    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        
        showLoading();
        auth.createUserWithEmailAndPassword(email, password)
            .then((userCredential) => {
                return userCredential.user.updateProfile({
                    displayName: name,
                    photoURL: 'https://ui-avatars.com/api/?name=' + encodeURIComponent(name) + '&background=5468ff&color=fff'
                }).then(() => {
                    return database.ref('users/' + userCredential.user.uid).set({
                        displayName: name,
                        email: email,
                        photoURL: 'https://ui-avatars.com/api/?name=' + encodeURIComponent(name) + '&background=5468ff&color=fff'
                    });
                });
            })
            .then(() => hideLoading())
            .catch(error => {
                hideLoading();
                alert(error.message);
            });
    });
    
    // Auth navigation
    goToRegister.addEventListener('click', () => switchScreen('register'));
    goToLogin.addEventListener('click', () => switchScreen('login'));
    
    // Logout
    logoutButton.addEventListener('click', () => {
        showLoading();
        auth.signOut().finally(() => hideLoading());
    });
    
    // Dark mode toggle
    darkModeToggle.addEventListener('change', () => {
        document.body.classList.toggle('dark-mode');
        localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
    });
    
    // Profile form
    profileForm.addEventListener('submit', updateProfile);
    
    // Avatar upload
    avatarUpload.addEventListener('change', handleAvatarUpload);
    
    // Search/new chat
    searchUsersButton?.addEventListener('click', showUserSearch);
    newChatButton?.addEventListener('click', showUserSearch);
    
    // Check for dark mode preference
    if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark-mode');
        darkModeToggle.checked = true;
    }
    
    // Check for last screen on page load
    window.addEventListener('load', () => {
        auth.onAuthStateChanged(user => {
            if (user && sessionStorage.getItem('lastScreen')) {
                switchScreen(sessionStorage.getItem('lastScreen'));
            }
        });
    });
}

// Initialize the app
init();
// Add this to your setupEventListeners function
document.querySelector('.edit-avatar').addEventListener('click', () => {
    avatarUpload.click();
});