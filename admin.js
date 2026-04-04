// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyBB428tlT4DdGXsPUSU-3GAJxhL0ccsxjM",
    authDomain: "ynk-qna.firebaseapp.com",
    projectId: "ynk-qna",
    storageBucket: "ynk-qna.firebasestorage.app",
    messagingSenderId: "852855963314",
    appId: "1:852855963314:web:73d98b6bfca8acb24713ab",
    measurementId: "G-DV08E0RY6L"
};

// Initialize Firebase using compat SDK for local file:// usage
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

document.addEventListener('DOMContentLoaded', () => {
    const loginSection = document.getElementById('login-section');
    const dashboardSection = document.getElementById('dashboard-section');
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const logoutBtn = document.getElementById('logout-btn');
    const tbody = document.getElementById('admin-table-body');

    // Modal Elements
    const modal = document.getElementById('post-modal');
    const closeModalBtn = document.getElementById('close-modal');
    const modalInfo = document.getElementById('modal-post-info');
    const answerText = document.getElementById('admin-answer-text');
    const submitAnswerBtn = document.getElementById('submit-answer-btn');
    const deletePostBtn = document.getElementById('delete-post-btn');

    let currentOpenPostId = null;

    // --- Authentication ---
    auth.onAuthStateChanged((user) => {
        if (user) {
            // User is signed in
            loginSection.style.display = 'none';
            dashboardSection.style.display = 'block';
            logoutBtn.style.display = 'inline-block';
            loadAdminData();
        } else {
            // User is signed out
            loginSection.style.display = 'block';
            dashboardSection.style.display = 'none';
            logoutBtn.style.display = 'none';
        }
    });

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('admin-email').value;
        const password = document.getElementById('admin-password').value;
        const btn = loginForm.querySelector('button');

        btn.innerText = 'Loging in...';
        btn.disabled = true;
        loginError.style.display = 'none';

        try {
            await auth.signInWithEmailAndPassword(email, password);
        } catch (error) {
            console.error(error);
            loginError.innerText = 'Login Failed: ' + error.message;
            loginError.style.display = 'block';
        } finally {
            btn.innerText = 'Login';
            btn.disabled = false;
        }
    });

    logoutBtn.addEventListener('click', async () => {
        try {
            await auth.signOut();
        } catch (error) {
            console.error("Sign out error", error);
        }
    });

    // --- Data Loading ---
    async function loadAdminData() {
        try {
            const querySnapshot = await db.collection("qna").orderBy("createdAt", "desc").get();

            if (querySnapshot.empty) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No questions have been submitted yet.</td></tr>';
                return;
            }

            let html = '';

            // Store data globally to avoid re-fetching on modal open
            window.adminPostsData = {};

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                window.adminPostsData[doc.id] = data;

                const d = data.createdAt ? data.createdAt.toDate() : new Date();
                const dateStr = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

                let badgeClass = data.status === 'Answered' ? 'status-answered' : 'status-waiting';
                let securityHtml = data.isPrivate
                    ? `<span style="color:#e53e3e; font-weight:600; font-size:0.85rem;"><i class="fas fa-lock"></i> Private (${data.password})</span>`
                    : `<span style="color:#718096; font-size:0.85rem;">Public</span>`;

                html += `
                    <tr>
                        <td style="font-size: 0.9rem; color: #718096;">${dateStr}</td>
                        <td>${data.inquiryType || 'General'}</td>
                        <td style="font-weight: 500;">${data.title}</td>
                        <td>${data.authorName}<br><span style="font-size: 0.8rem; color: #718096;">${data.authorEmail}</span></td>
                        <td>${securityHtml}</td>
                        <td><span class="status-badge ${badgeClass}">${data.status || 'Waiting'}</span></td>
                        <td>
                            <button class="btn" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;" onclick="openAdminPost('${doc.id}')">View / Reply</button>
                        </td>
                    </tr>
                `;
            });

            tbody.innerHTML = html;
        } catch (error) {
            console.error("Error loading documents: ", error);
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color: red;">Error loading data: ${error.message}</td></tr>`;
        }
    }

    // --- Modal Logic ---
    window.openAdminPost = function (id) {
        currentOpenPostId = id;
        const data = window.adminPostsData[id];

        let infoHtml = `
            <div class="post-detail">
                <strong>Author:</strong> ${data.authorName} (${data.authorEmail})
            </div>
            <div class="post-detail">
                <strong>Type:</strong> ${data.inquiryType || 'General'}
            </div>
            <div class="post-detail">
                <strong>Title:</strong> ${data.title}
            </div>
        `;

        if (data.isPrivate) {
            infoHtml += `<div class="private-notice" style="margin-bottom: 1rem;"><i class="fas fa-lock"></i> This is a private post. Users need password: <b>${data.password}</b> to read replies.</div>`;
        }

        infoHtml += `
            <div style="font-weight: 600; color: #4a5568; margin-bottom: 0.5rem;">Question Content:</div>
            <div class="post-content-box">${data.content}</div>
        `;

        modalInfo.innerHTML = infoHtml;
        answerText.value = data.answer || '';

        if (data.status === 'Answered') {
            submitAnswerBtn.innerText = 'Update Answer';
        } else {
            submitAnswerBtn.innerText = 'Save & Mark as Answered';
        }

        modal.style.display = 'flex';
    };

    closeModalBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        currentOpenPostId = null;
    });

    // Close on background click
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
            currentOpenPostId = null;
        }
    });

    // Submit Answer
    submitAnswerBtn.addEventListener('click', async () => {
        if (!currentOpenPostId) return;
        const val = answerText.value;
        const btnOriginal = submitAnswerBtn.innerText;
        submitAnswerBtn.innerText = 'Saving...';
        submitAnswerBtn.disabled = true;

        try {
            await db.collection("qna").doc(currentOpenPostId).update({
                answer: val,
                status: "Answered",
                answeredAt: new Date()
            });
            alert('Answer saved successfully!');
            modal.style.display = 'none';
            loadAdminData(); // Reload table
        } catch (error) {
            console.error("Error updating document: ", error);
            alert("Error saving answer. See console.");
        } finally {
            submitAnswerBtn.innerText = btnOriginal;
            submitAnswerBtn.disabled = false;
        }
    });

    // Delete Post
    deletePostBtn.addEventListener('click', async () => {
        if (!currentOpenPostId) return;

        if (confirm("Are you sure you want to permanently delete this question? This action cannot be undone.")) {
            try {
                await db.collection("qna").doc(currentOpenPostId).delete();
                alert('Question deleted.');
                modal.style.display = 'none';
                loadAdminData(); // Reload table
            } catch (e) {
                console.error("Error deleting document: ", e);
                alert("Failed to delete. See console.");
            }
        }
    });
});
