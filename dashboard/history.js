// history.js
// Park Avenue Bakery - Checklist History Page

class ChecklistHistory {
    constructor() {
        this.completions = [];
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
        this.setDefaultDates();
        await this.loadHistory();
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
        document.getElementById('logoutBtn')?.addEventListener('click', () => this.logout());
        document.getElementById('applyFilters')?.addEventListener('click', () => this.loadHistory());
    }

    setDefaultDates() {
        const today = this.getTodayString();
        const weekAgo = this.getDateDaysAgo(7);

        document.getElementById('dateFrom').value = weekAgo;
        document.getElementById('dateTo').value = today;
    }

    getTodayString() {
        const now = new Date();
        const mtTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Denver' }));
        return mtTime.toISOString().split('T')[0];
    }

    getDateDaysAgo(days) {
        const now = new Date();
        const mtTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Denver' }));
        mtTime.setDate(mtTime.getDate() - days);
        return mtTime.toISOString().split('T')[0];
    }

    async loadHistory() {
        const fromDate = document.getElementById('dateFrom').value;
        const toDate = document.getElementById('dateTo').value;
        const templateId = document.getElementById('checklistType').value;

        let url = `/api/prep-dashboard/checklists/history?from=${fromDate}&to=${toDate}`;
        if (templateId) {
            url += `&templateId=${templateId}`;
        }

        try {
            const response = await fetch(url);

            if (response.status === 401) {
                window.location.href = '/dashboard/login.html';
                return;
            }

            if (!response.ok) {
                throw new Error('Failed to load history');
            }

            const data = await response.json();
            this.completions = data.completions || [];
            this.render();

        } catch (error) {
            console.error('Error loading history:', error);
            this.showError('Failed to load history. Please try again.');
        }
    }

    render() {
        const list = document.getElementById('historyList');
        if (!list) return;

        if (this.completions.length === 0) {
            list.innerHTML = '<div class="empty-message">No completed checklists found for this period.</div>';
            return;
        }

        // Group by date
        const byDate = {};
        for (const completion of this.completions) {
            if (!byDate[completion.date]) {
                byDate[completion.date] = [];
            }
            byDate[completion.date].push(completion);
        }

        const sortedDates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));

        list.innerHTML = sortedDates.map(date => `
            <div class="history-date-group">
                <h3 class="history-date">${this.formatDate(date)}</h3>
                <div class="history-items">
                    ${byDate[date].map(c => this.renderCompletion(c)).join('')}
                </div>
            </div>
        `).join('');
    }

    renderCompletion(completion) {
        const completedTime = completion.completedAt
            ? new Date(completion.completedAt).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            })
            : 'In Progress';

        const statusClass = completion.completedAt ? 'complete' : 'in-progress';
        const progressPercent = completion.total > 0
            ? Math.round((completion.progress / completion.total) * 100)
            : 0;

        return `
            <div class="history-item ${statusClass}">
                <div class="history-item-header">
                    <span class="history-item-name">${this.escapeHtml(completion.templateName)}</span>
                    <span class="history-item-time">${completedTime}</span>
                </div>
                <div class="history-item-meta">
                    <span class="history-item-by">By: ${this.escapeHtml(completion.completedBy || 'Staff')}</span>
                    <span class="history-item-progress">${completion.progress}/${completion.total}</span>
                </div>
                ${completion.alerts > 0 ? `
                    <div class="history-item-alerts">
                        &#9888; ${completion.alerts} alert${completion.alerts > 1 ? 's' : ''}
                    </div>
                ` : ''}
            </div>
        `;
    }

    formatDate(dateString) {
        const date = new Date(dateString + 'T12:00:00');
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });
    }

    showError(message) {
        const list = document.getElementById('historyList');
        if (list) {
            list.innerHTML = `<div class="error-message">${this.escapeHtml(message)}</div>`;
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
    new ChecklistHistory();
});
