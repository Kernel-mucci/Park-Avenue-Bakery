// dashboard.js
// Park Avenue Bakery - Prep Dashboard Frontend Logic

class PrepDashboard {
    constructor() {
        this.currentDate = this.getTodayString();
        this.refreshInterval = null;
        this.data = null;
        this.init();
    }

    async init() {
        // Check authentication first
        const isAuthenticated = await this.checkAuth();
        if (!isAuthenticated) {
            window.location.href = '/dashboard/login.html';
            return;
        }

        // Show dashboard content
        this.hideLoading();

        // Setup event listeners
        this.setupEventListeners();

        // Update clock
        this.updateClock();
        setInterval(() => this.updateClock(), 1000);

        // Load initial data
        await this.loadData();

        // Setup auto-refresh (every 5 minutes)
        this.refreshInterval = setInterval(() => this.loadData(), 5 * 60 * 1000);
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
        // Refresh button
        document.getElementById('refreshBtn')?.addEventListener('click', () => {
            this.loadData();
        });

        // Print button
        document.getElementById('printBtn')?.addEventListener('click', () => {
            window.print();
        });

        // Logout button
        document.getElementById('logoutBtn')?.addEventListener('click', () => {
            this.logout();
        });

        // Date navigation
        document.getElementById('prevDayBtn')?.addEventListener('click', () => {
            this.changeDate(-1);
        });

        document.getElementById('todayBtn')?.addEventListener('click', () => {
            this.currentDate = this.getTodayString();
            this.loadData();
        });

        document.getElementById('nextDayBtn')?.addEventListener('click', () => {
            this.changeDate(1);
        });

        // View alerts button
        document.getElementById('viewAlertsBtn')?.addEventListener('click', () => {
            this.showAlertsModal();
        });

        // Close modal button
        document.getElementById('closeModalBtn')?.addEventListener('click', () => {
            this.hideAlertsModal();
        });

        // Close modal on backdrop click
        document.getElementById('alertsModal')?.addEventListener('click', (e) => {
            if (e.target.id === 'alertsModal') {
                this.hideAlertsModal();
            }
        });
    }

    getTodayString() {
        // Get today's date in Mountain Time
        const now = new Date();
        const mtTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Denver' }));
        return mtTime.toISOString().split('T')[0];
    }

    changeDate(days) {
        const date = new Date(this.currentDate + 'T12:00:00');
        date.setDate(date.getDate() + days);
        this.currentDate = date.toISOString().split('T')[0];
        this.loadData();
    }

    updateClock() {
        const now = new Date();
        const mtTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Denver' }));

        // Format date
        const dateOptions = { weekday: 'short', month: 'short', day: 'numeric' };
        const dateStr = mtTime.toLocaleDateString('en-US', dateOptions);

        // Format time
        const timeOptions = { hour: 'numeric', minute: '2-digit', hour12: true };
        const timeStr = mtTime.toLocaleTimeString('en-US', timeOptions);

        const currentDateEl = document.getElementById('currentDate');
        const currentTimeEl = document.getElementById('currentTime');

        if (currentDateEl) currentDateEl.textContent = dateStr;
        if (currentTimeEl) currentTimeEl.textContent = timeStr;
    }

    async loadData() {
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.disabled = true;
            refreshBtn.textContent = '⟳ Loading...';
        }

        try {
            const response = await fetch(`/api/prep-dashboard/orders?date=${this.currentDate}`);

            if (response.status === 401) {
                window.location.href = '/dashboard/login.html';
                return;
            }

            if (!response.ok) {
                throw new Error('Failed to load data');
            }

            this.data = await response.json();
            this.render();

        } catch (error) {
            console.error('Error loading data:', error);
            this.showError('Failed to load orders. Please try refreshing.');
        } finally {
            if (refreshBtn) {
                refreshBtn.disabled = false;
                refreshBtn.textContent = '⟳ Refresh';
            }
        }
    }

    render() {
        if (!this.data) return;

        // Update bake list title
        const isToday = this.currentDate === this.getTodayString();
        const titleEl = document.getElementById('bakeListTitle');
        if (titleEl) {
            if (isToday) {
                titleEl.textContent = "Today's Bake List";
            } else {
                const date = new Date(this.currentDate + 'T12:00:00');
                const dateStr = date.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric'
                });
                titleEl.textContent = `Bake List for ${dateStr}`;
            }
        }

        // Update today button state
        const todayBtn = document.getElementById('todayBtn');
        if (todayBtn) {
            todayBtn.classList.toggle('active', isToday);
        }

        // Render bake lists
        this.renderBakeList('breadsList', this.data.bakeList?.breads || []);
        this.renderBakeList('barsList', this.data.bakeList?.bars || []);
        this.renderBakeList('cookiesList', this.data.bakeList?.cookies || []);

        // Render schedule
        this.renderSchedule(this.data.pickupSchedule || []);

        // Render totals
        this.renderTotals(this.data.totals || {});

        // Render alerts
        this.renderAlerts(this.data.alerts || {});

        // Update last refresh time
        this.updateLastRefresh();
    }

    renderBakeList(elementId, items) {
        const listEl = document.getElementById(elementId);
        if (!listEl) return;

        if (items.length === 0) {
            listEl.innerHTML = '<li class="empty-message">No orders</li>';
            return;
        }

        listEl.innerHTML = items.map(item => `
            <li>
                <span class="checkbox"></span>
                <span class="item-name">${this.escapeHtml(item.name)}</span>
                <span class="item-quantity">${item.quantity}</span>
            </li>
        `).join('');
    }

    renderSchedule(schedule) {
        const scheduleEl = document.getElementById('scheduleList');
        if (!scheduleEl) return;

        if (schedule.length === 0) {
            scheduleEl.innerHTML = '<div class="empty-message">No pickups scheduled</div>';
            return;
        }

        scheduleEl.innerHTML = schedule.map(slot => `
            <div class="schedule-item ${slot.hasSameDayAlert ? 'has-alert' : ''}">
                <span class="schedule-time">${slot.displayTime}</span>
                <span class="schedule-orders">${slot.orderCount} order${slot.orderCount !== 1 ? 's' : ''} (${slot.itemCount} items)</span>
                ${slot.hasSameDayAlert ? '<span class="schedule-alert">⚠</span>' : ''}
            </div>
        `).join('');
    }

    renderTotals(totals) {
        const totalOrdersEl = document.getElementById('totalOrders');
        const totalItemsEl = document.getElementById('totalItems');
        const totalBreadsEl = document.getElementById('totalBreads');
        const totalBarsEl = document.getElementById('totalBars');
        const totalCookiesEl = document.getElementById('totalCookies');

        if (totalOrdersEl) totalOrdersEl.textContent = totals.orders || 0;
        if (totalItemsEl) totalItemsEl.textContent = totals.items || 0;
        if (totalBreadsEl) totalBreadsEl.textContent = totals.breads || 0;
        if (totalBarsEl) totalBarsEl.textContent = totals.bars || 0;
        if (totalCookiesEl) totalCookiesEl.textContent = totals.cookies || 0;
    }

    renderAlerts(alerts) {
        const alertsSection = document.getElementById('alertsSection');
        const alertCountEl = document.getElementById('alertCount');

        if (!alertsSection) return;

        if (alerts.sameDayOrders > 0) {
            alertsSection.style.display = 'block';
            alertsSection.classList.add('has-alerts');
            if (alertCountEl) alertCountEl.textContent = alerts.sameDayOrders;
        } else {
            alertsSection.style.display = 'none';
            alertsSection.classList.remove('has-alerts');
        }
    }

    showAlertsModal() {
        const modal = document.getElementById('alertsModal');
        const modalBody = document.getElementById('alertsModalBody');

        if (!modal || !modalBody) return;

        const alerts = this.data?.alerts?.sameDayOrdersList || [];

        if (alerts.length === 0) {
            modalBody.innerHTML = '<p>No same-day orders to display.</p>';
        } else {
            modalBody.innerHTML = alerts.map(order => `
                <div class="modal-order-item">
                    <strong>Order #${this.escapeHtml(order.id)}</strong><br>
                    Pickup: ${this.escapeHtml(order.time)}<br>
                    Items: ${order.items}
                </div>
            `).join('');
        }

        modal.style.display = 'flex';
    }

    hideAlertsModal() {
        const modal = document.getElementById('alertsModal');
        if (modal) modal.style.display = 'none';
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
        // Simple error display - could be enhanced with a toast system
        alert(message);
    }

    async logout() {
        try {
            await fetch('/api/prep-dashboard/auth', {
                method: 'DELETE'
            });
        } catch (e) {
            // Ignore errors
        }

        // Clear refresh interval
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }

        // Redirect to login
        window.location.href = '/dashboard/login.html';
    }

    escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
}

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', () => {
    new PrepDashboard();
});
