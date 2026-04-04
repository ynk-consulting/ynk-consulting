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
let app, db, analytics;
try {
    app = firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    analytics = firebase.analytics();
    console.log("Firebase initialized");
} catch (error) {
    console.warn("Firebase not properly configured yet. Using dummy mode.", error);
}

// --------------------------------------------------------
// QnA Board Logic Placeholder
// --------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    // Expose functions globally for HTML onclick handlers
    window.submitForm = async function () {
        if (!db) {
            alert("Firebase is not connected yet. Please add your config.");
            return;
        }

        // Grab form values
        const name = document.querySelector('input[placeholder="Enter your name"]').value;
        const email = document.querySelector('input[placeholder="Enter your email"]').value;
        const type = document.querySelector('select').value;
        const title = document.querySelector('input[placeholder="Briefly summarize your question"]').value;
        const content = document.querySelector('textarea').value;
        const isPrivate = document.getElementById('privatePost').checked;
        const password = isPrivate ? document.getElementById('passwordFieldContainer').querySelector('input').value : "";

        try {
            // Save to Firestore 'qna' collection
            await db.collection("qna").add({
                authorName: name,
                authorEmail: email,
                inquiryType: type,
                title: title,
                content: content,
                isPrivate: isPrivate,
                password: password, // Note: storing plaintext is not secure, but acceptable for this static scope
                status: "Waiting",
                answer: "",
                createdAt: new Date()
            });
            alert('Your question has been successfully submitted and is pending admin approval.');
            document.getElementById('qnaForm').reset();
            document.getElementById('passwordFieldContainer').style.display = 'none';
            window.showBoard(); // Using the existing HTML toggle
            loadBoardData();
        } catch (e) {
            console.error("Error adding document: ", e);
            alert("Failed to submit question. Check console.");
        }
    };

    // Pagination state
    window.qnaPostsData = {};
    window.qnaCurrentPage = 1;
    const rowsPerPage = 7;

    function renderPagination(totalItems) {
        const totalPages = Math.ceil(totalItems / rowsPerPage);
        const paginationEl = document.getElementById('qna-pagination');
        const spacerEl = document.getElementById('pagination-spacer');
        const footerEl = document.querySelector('.qna-board-footer');

        if (!paginationEl) return;

        if (totalItems <= rowsPerPage) {
            paginationEl.style.display = 'none';
            if (spacerEl) spacerEl.style.display = 'none';
            if (footerEl) footerEl.style.justifyContent = 'flex-end';
            return;
        }

        paginationEl.style.display = 'flex';
        if (spacerEl) spacerEl.style.display = 'block';
        if (footerEl) footerEl.style.justifyContent = 'space-between';

        paginationEl.innerHTML = '';

        // Prev
        const prevLi = document.createElement('li');
        prevLi.innerHTML = `<a href="#" class="page-link"><i class="fas fa-chevron-left"></i></a>`;
        prevLi.onclick = (e) => { e.preventDefault(); if (window.qnaCurrentPage > 1) { window.qnaCurrentPage--; renderTablePage(); renderPagination(totalItems); } };
        paginationEl.appendChild(prevLi);

        // Pages
        for (let i = 1; i <= totalPages; i++) {
            const li = document.createElement('li');
            li.innerHTML = `<a href="#" class="page-link ${i === window.qnaCurrentPage ? 'active' : ''}">${i}</a>`;
            li.onclick = (e) => { e.preventDefault(); window.qnaCurrentPage = i; renderTablePage(); renderPagination(totalItems); };
            paginationEl.appendChild(li);
        }

        // Next
        const nextLi = document.createElement('li');
        nextLi.innerHTML = `<a href="#" class="page-link"><i class="fas fa-chevron-right"></i></a>`;
        nextLi.onclick = (e) => { e.preventDefault(); if (window.qnaCurrentPage < totalPages) { window.qnaCurrentPage++; renderTablePage(); renderPagination(totalItems); } };
        paginationEl.appendChild(nextLi);
    }

    function renderTablePage() {
        const tbody = document.querySelector('.qna-table tbody');
        const items = Object.values(window.qnaPostsData).sort((a, b) => b.createdAt - a.createdAt);
        const start = (window.qnaCurrentPage - 1) * rowsPerPage;
        const pageItems = items.slice(start, start + rowsPerPage);

        if (items.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="padding: 3rem 1rem; color: #718096; text-align: center;">There are no registered questions yet.</td></tr>';
            return;
        }

        let html = '';
        let index = items.length - start;

        pageItems.forEach((data) => {
            const d = data.createdAt ? data.createdAt.toDate() : new Date();
            const dateStr = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
            let badgeClass = data.status === 'Answered' ? 'badge-answered' : 'badge-waiting';
            let iconHtml = data.isPrivate ? '<i class="fas fa-lock icon-lock"></i>' : '';

            html += `
                <tr>
                    <td class="col-no">${index--}</td>
                    <td class="col-type">${data.inquiryType || 'General'}</td>
                    <td class="col-title" style="text-align: left;">
                        <a href="#" class="item-title-link" onclick="openPost('${data.id}', ${data.isPrivate}, '${data.password}')">
                            ${iconHtml} ${typeof data.title === 'string' ? data.title.replace(/</g, "&lt;") : ''}
                        </a>
                    </td>
                    <td class="col-author">${typeof data.authorName === 'string' ? data.authorName.replace(/</g, "&lt;") : ''}</td>
                    <td class="col-date">${dateStr}</td>
                    <td class="col-status">
                        <span class="status-badge ${badgeClass}">${data.status || 'Waiting'}</span>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
        renderPagination(items.length);
    }

    // Load Board Data from Firestore
    async function loadBoardData() {
        if (!db) return;
        try {
            db.collection("qna").orderBy("createdAt", "desc").onSnapshot((querySnapshot) => {
                window.qnaPostsData = {}; // clear
                querySnapshot.forEach((doc) => {
                    window.qnaPostsData[doc.id] = { id: doc.id, ...doc.data() };
                });
                renderTablePage();
            });
        } catch (error) {
            console.error("Error loading documents: ", error);
        }
    }

    // Modal / View Logic Placeholder
    window.openPost = function (id, isPrivate, validPassword) {
        if (isPrivate) {
            const pwdInput = prompt("This is a private post. Please enter the 4-digit password:");
            if (pwdInput !== validPassword) {
                alert("Incorrect password. Access denied.");
                return;
            }
        }

        const data = window.qnaPostsData[id];
        if (!data) return;

        const d = data.createdAt ? data.createdAt.toDate() : new Date();
        const dateStr = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

        document.getElementById('modal-title').innerText = data.title;
        document.getElementById('modal-author').innerText = data.authorName;
        document.getElementById('modal-date').innerText = dateStr;
        document.getElementById('modal-content').innerText = data.content;

        const answerSection = document.getElementById('modal-answer-section');
        const answerContent = document.getElementById('modal-answer-content');
        if (data.status === 'Answered' && data.answer) {
            answerContent.innerText = data.answer;
            answerSection.style.display = 'block';
        } else {
            answerSection.style.display = 'none';
        }

        document.getElementById('qna-modal').style.display = 'flex';
    };

    // UI Toggle functions
    window.showWriteForm = function () {
        document.getElementById('qna-board-view').style.display = 'none';
        document.getElementById('qna-write-view').style.display = 'block';
        const wrapper = document.querySelector('.qna-wrapper');
        if (wrapper) window.scrollTo({ top: wrapper.offsetTop - 100, behavior: 'smooth' });
    };

    window.showBoard = function () {
        document.getElementById('qna-write-view').style.display = 'none';
        document.getElementById('qna-board-view').style.display = 'block';
        const wrapper = document.querySelector('.qna-wrapper');
        if (wrapper) window.scrollTo({ top: wrapper.offsetTop - 100, behavior: 'smooth' });
    };

    // Password checkbox toggle
    const privatePostCb = document.getElementById('privatePost');
    if (privatePostCb) {
        privatePostCb.addEventListener('change', function () {
            const pwdContainer = document.getElementById('passwordFieldContainer');
            if (this.checked) {
                pwdContainer.style.display = 'block';
                pwdContainer.querySelector('input').setAttribute('required', 'true');
            } else {
                pwdContainer.style.display = 'none';
                pwdContainer.querySelector('input').removeAttribute('required');
            }
        });
    }

    // Auto-load on init
    if (app) {
        loadBoardData();
    }
});
