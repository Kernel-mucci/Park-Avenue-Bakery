// checklists.js
// Park Avenue Bakery - Checklists Hub Page

class ChecklistsHub {
    constructor() {
        this.data = null;
        this.init();
    }

    async init() {
        // Check authentication
        const isAuthenticated = await this.checkAuth();
        if (!isAuthenticated) {
            window.location.href = '/dashboard/login.html';
            return;
        }

        this.hideLoading();
        this.setupEventListeners();
        this.updateClock();
        setInterval(() => this.updateClock(), 1000);

        await this.loadChecklists();
    }

    async checkAuth() {
        try {
            const response = await fetch('/api/prep-dashboard/auth');
            const data = await response.json();
            return data.authenticated === true;
        } catch (e) {
            return false;
        }
    }

    hideLoading() {
        const loadingOverlay = document.getElementById('loadingOverlay');
        const dashboardContent = document.getElementById('dashboardContent');
        if (loadingOverlay) loadingOverlay.style.display = 'none';
        if (dashboardContent) dashboardContent.style.display = 'block';
    }

    setupEventListeners() {
        document.getElementById('logoutBtn')?.addEventListener('click', () => {
            this.logout();
        });
    }

    updateClock() {
        const now = new Date();
        const mtTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Denver' }));

        const dateOptions = { weekday: 'long', month: 'long', day: 'numeric' };
        const dateStr = mtTime.toLocaleDateString('en-US', dateOptions);

        const timeOptions = { hour: 'numeric', minute: '2-digit', hour12: true };
        const timeStr = mtTime.toLocaleTimeString('en-US', timeOptions);

        const currentDateEl = document.getElementById('currentDate');
        const currentTimeEl = document.getElementById('currentTime');

        if (currentDateEl) currentDateEl.textContent = dateStr;
        if (currentTimeEl) currentTimeEl.textContent = timeStr;
    }

    async loadChecklists() {
        try {
            const response = await fetch('/api/prep-dashboard/checklists');

            if (response.status === 401) {
                window.location.href = '/dashboard/login.html';
                return;
            }

            if (!response.ok) {
                throw new Error('Failed to load checklists');
            }

            this.data = await response.json();
            this.renderChecklists();
            this.updateLastRefresh();

        } catch (error) {
            console.error('Error loading checklists:', error);
            this.showError('Failed to load checklists. Please try refreshing.');
        }
    }

    renderChecklists() {
        const grid = document.getElementById('checklistsGrid');
        if (!grid || !this.data) return;

        if (this.data.checklists.length === 0) {
            grid.innerHTML = '<div class="empty-message">No checklists configured</div>';
            return;
        }

        grid.innerHTML = this.data.checklists.map(checklist => {
            const statusClass = this.getStatusClass(checklist.status);
            const statusIcon = this.getStatusIcon(checklist.status);
            const progressPercent = checklist.total > 0
                ? Math.round((checklist.progress / checklist.total) * 100)
                : 0;

            return `
                <a href="checklist.html?id=${checklist.templateId}" class="checklist-card ${statusClass}">
                    <div class="checklist-card-header">
                        <span class="checklist-time">${checklist.scheduledTimeDisplay}</span>
                        <span class="checklist-status-icon">${statusIcon}</span>
                    </div>
                    <h3 class="checklist-name">${this.escapeHtml(checklist.name)}</h3>
                    <div class="checklist-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${progressPercent}%"></div>
                        </div>
                        <span class="progress-text">${checklist.progress} / ${checklist.total}</span>
                    </div>
                    <div class="checklist-meta">
                        ${this.renderMeta(checklist)}
                    </div>
                    ${checklist.alerts > 0 ? `
                        <div class="checklist-alerts">
                            <span class="alert-badge">&#9888; ${checklist.alerts} alert${checklist.alerts > 1 ? 's' : ''}</span>
                        </div>
                    ` : ''}
                </a>
            `;
        }).join('');
    }

    getStatusClass(status) {
        switch (status) {
            case 'complete': return 'status-complete';
            case 'in-progress': return 'status-in-progress';
            default: return 'status-not-started';
        }
    }

    getStatusIcon(status) {
        switch (status) {
            case 'complete': return '&#10003;'; // checkmark
            case 'in-progress': return '&#8987;'; // hourglass
            default: return '&#9675;'; // circle
        }
    }

    renderMeta(checklist) {
        if (checklist.status === 'complete') {
            const completedTime = new Date(checklist.completedAt);
            const timeStr = completedTime.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            });
            return `<span class="meta-complete">Completed by ${this.escapeHtml(checklist.completedBy)} at ${timeStr}</span>`;
        } else if (checklist.status === 'in-progress') {
            return `<span class="meta-progress">In progress by ${this.escapeHtml(checklist.startedBy || 'Staff')}</span>`;
        } else {
            return `<span class="meta-pending">Not started</span>`;
        }
    }

    updateLastRefresh() {
        const lastRefreshEl = document.getElementById('lastRefresh');
        if (lastRefreshEl) {
            const now = new Date();
            const timeStr = now.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            });
            lastRefreshEl.textContent = `Last refreshed: ${timeStr}`;
        }
    }

    showError(message) {
        const grid = document.getElementById('checklistsGrid');
        if (grid) {
            grid.innerHTML = `<div class="error-message">${this.escapeHtml(message)}</div>`;
        }
    }

    async logout() {
        try {
            await fetch('/api/prep-dashboard/auth', { method: 'DELETE' });
        } catch (e) {
            // Ignore errors
        }
        window.location.href = '/dashboard/login.html';
    }

    escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    new ChecklistsHub();
});
