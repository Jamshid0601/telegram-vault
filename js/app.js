const tg = window.Telegram.WebApp;
const API_BASE_URL = 'http://localhost:3000'; // CHANGE THIS TO YOUR HOSTED BACKEND URL

// Expand WebApp
tg.expand();

// DOM Elements
const userView = document.getElementById('user-view');
const adminView = document.getElementById('admin-view');
const secretInput = document.getElementById('secret-key');
const btnAccess = document.getElementById('btn-access');
const resultArea = document.getElementById('result-area');
const secretsTableBody = document.getElementById('secrets-table-body');
const totalSecretsSpan = document.getElementById('total-secrets');
const btnRefresh = document.getElementById('btn-refresh');

// Init
document.addEventListener('DOMContentLoaded', () => {
    // Check if opened via Deep Link (startapp param)
    // Telegram Web App doesn't pass start_param in url directly mostly, it's in initData or handled differently
    // Actually, tg.initDataUnsafe.start_param is the standard way
    const startParam = tg.initDataUnsafe.start_param;

    if (startParam) {
        secretInput.value = startParam;
        // Auto-click if param exists
        handleAccessSecret(startParam);
    }

    // Check Admin Mode
    const user = tg.initDataUnsafe.user;
    // Hardcoded Admin ID Check on Frontend (Visual Only - Backend Must Verify)
    // NOTE: Replace 123456789 with your actual ID or fetch from env if using build process
    const ADMIN_ID = 123456789;

    if (user && user.id === ADMIN_ID) {
        // Toggle Admin View
        userView.classList.add('hidden');
        adminView.classList.remove('hidden');
        loadAdminDashboard();
    }
});

// User Actions
btnAccess.addEventListener('click', () => {
    const key = secretInput.value.trim();
    if (key) handleAccessSecret(key);
});

async function handleAccessSecret(key) {
    resultArea.innerHTML = 'Fetching...';
    try {
        const user = tg.initDataUnsafe.user;
        const viewerId = user ? user.id : 'unknown';

        const response = await fetch(`${API_BASE_URL}/api/secret/${key}?viewerId=${viewerId}`);
        const data = await response.json();

        if (response.ok) {
            renderGenericResult(data);
        } else {
            resultArea.innerHTML = `<span style="color:red">Error: ${data.error}</span>`;
        }
    } catch (err) {
        resultArea.innerHTML = `<span style="color:red">Network Error. Is Backend running?</span>`;
    }
}

function renderGenericResult(data) {
    // For fileID, we can't download directly easily unless we use the Bot API to getFileLink
    // Or we just show the metadata. 
    // In a real Mini App, 'web_app_download_file' isn't a standard method.
    // Usually, you send the file BACK to the user via the bot.
    // However, if content is text, show it.

    let html = `<h3>File Found!</h3>`;
    html += `<p>Type: <strong>${data.type}</strong></p>`;
    html += `<p>Uploader ID: ${data.uploaderId}</p>`;

    if (data.content) {
        html += `<div class="content-box">${data.content}</div>`;
    } else {
        html += `<p class="info">This is a Telegram file (ID: ${data.fileId}).<br>To download, please ask the bot directly or implement getFileLink proxy.</p>`;
    }

    resultArea.innerHTML = html;
}

// Admin Actions
btnRefresh.addEventListener('click', loadAdminDashboard);

async function loadAdminDashboard() {
    try {
        const user = tg.initDataUnsafe.user;
        const response = await fetch(`${API_BASE_URL}/api/admin/secrets`, {
            headers: {
                'x-telegram-user-id': user ? user.id : ''
            }
        });
        const secrets = await response.json();
        renderTable(secrets);
    } catch (err) {
        console.error(err);
        alert('Failed to load admin data');
    }
}

function renderTable(secrets) {
    secretsTableBody.innerHTML = '';
    const keys = Object.keys(secrets);
    totalSecretsSpan.textContent = keys.length;

    keys.forEach(key => {
        const item = secrets[key];
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${key.substring(0, 8)}...</td>
            <td>${item.type}</td>
            <td>${new Date(item.timestamp).toLocaleDateString()}</td>
            <td>
                <button class="delete-btn" onclick="deleteSecret('${key}')">Delete</button>
            </td>
        `;
        secretsTableBody.appendChild(row);
    });
}

// Global scope for onclick
window.deleteSecret = async (key) => {
    if (!confirm('Are you sure?')) return;
    try {
        const user = tg.initDataUnsafe.user;
        await fetch(`${API_BASE_URL}/api/admin/secrets/${key}`, {
            method: 'DELETE',
            headers: {
                'x-telegram-user-id': user ? user.id : ''
            }
        });
        loadAdminDashboard();
    } catch (err) {
        alert('Delete failed');
    }
};
