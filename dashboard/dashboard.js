// dashboard.js
// Park Avenue Bakery - Prep Dashboard Frontend Logic

class PrepDashboard {
    constructor() {
        this.currentDate = this.getTodayString();
        this.refreshInterval = null;
        this.data = null;
        this.expandedSlots = new Set(); // Track which time slots are expanded
        this.init();
    }

    async init() {
        // Clear old ready status at midnight
        this.clearExpiredReadyStatus();

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

        // Check for midnight reset every minute
        setInterval(() => this.clearExpiredReadyStatus(), 60 * 1000);
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

        // Print bake list button
        document.getElementById('printBtn')?.addEventListener('click', () => {
            this.printBakeList();
        });

        // Print all pickup sheets button
        document.getElementById('printAllSheetsBtn')?.addEventListener('click', () => {
            this.printAllPickupSheets();
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
        this.expandedSlots.clear(); // Clear expanded slots when changing date
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

        // Render schedule with expandable slots
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

        scheduleEl.innerHTML = schedule.map(slot => {
            const isExpanded = this.expandedSlots.has(slot.time);
            const readyCount = this.getReadyCountForSlot(slot);
            const allReady = readyCount === slot.orders.length && slot.orders.length > 0;

            // Build status class
            let statusClass = slot.status || 'normal';
            if (allReady) statusClass = 'all-ready';

            return `
                <div class="time-slot ${statusClass} ${isExpanded ? 'expanded' : ''}" data-time="${slot.time}">
                    <div class="time-slot-header" onclick="window.dashboard.toggleSlot('${slot.time}')">
                        <span class="expand-icon">${isExpanded ? '▼' : '▶'}</span>
                        <span class="slot-time">${slot.displayTime}</span>
                        <span class="slot-summary">
                            ${slot.orderCount} order${slot.orderCount !== 1 ? 's' : ''} (${slot.itemCount} items)
                        </span>
                        <span class="slot-ready-status">
                            ${allReady ? '✓ Ready' : `${readyCount}/${slot.orderCount}`}
                        </span>
                        <button class="btn-print-slot" onclick="event.stopPropagation(); window.dashboard.printSlot('${slot.time}')" title="Print pickup sheet">
                            &#128424;
                        </button>
                    </div>
                    ${isExpanded ? this.renderSlotOrders(slot) : ''}
                </div>
            `;
        }).join('');
    }

    renderSlotOrders(slot) {
        if (!slot.orders || slot.orders.length === 0) {
            return '<div class="slot-orders"><div class="empty-message">No orders</div></div>';
        }

        return `
            <div class="slot-orders">
                ${slot.orders.map(order => this.renderOrderCard(order)).join('')}
            </div>
        `;
    }

    renderOrderCard(order) {
        const isReady = this.isOrderReady(order.id);
        return `
            <div class="order-card ${isReady ? 'ready' : ''}" data-order-id="${order.id}">
                <div class="order-card-header">
                    <span class="order-number">Order #${this.escapeHtml(order.orderNumber)}</span>
                    <label class="ready-checkbox">
                        Ready:
                        <input type="checkbox"
                               ${isReady ? 'checked' : ''}
                               onchange="window.dashboard.toggleOrderReady('${order.id}', this.checked)">
                    </label>
                </div>
                <div class="order-card-customer">
                    <strong>${this.escapeHtml(order.customerName)}</strong>
                    ${order.customerPhone ? ` • ${this.escapeHtml(order.customerPhone)}` : ''}
                </div>
                <div class="order-card-items">
                    ${order.items.map(item => `
                        <div class="order-item">
                            <span class="item-qty">${item.quantity}x</span>
                            <span class="item-name">${this.escapeHtml(item.name)}</span>
                        </div>
                    `).join('')}
                </div>
                <div class="order-card-footer">
                    <span class="order-placed">Placed: ${this.escapeHtml(order.placedAtDisplay || 'Unknown')}</span>
                    ${order.total && order.total !== '0.00' ? `<span class="order-total">$${order.total}</span>` : ''}
                </div>
            </div>
        `;
    }

    toggleSlot(time) {
        if (this.expandedSlots.has(time)) {
            this.expandedSlots.delete(time);
        } else {
            this.expandedSlots.add(time);
        }
        this.renderSchedule(this.data?.pickupSchedule || []);
    }

    // Ready status management with localStorage
    getReadyStatusKey() {
        return `bakery_ready_status_${this.currentDate}`;
    }

    getReadyStatus() {
        try {
            const stored = localStorage.getItem(this.getReadyStatusKey());
            return stored ? JSON.parse(stored) : {};
        } catch (e) {
            return {};
        }
    }

    saveReadyStatus(status) {
        try {
            localStorage.setItem(this.getReadyStatusKey(), JSON.stringify(status));
        } catch (e) {
            console.error('Error saving ready status:', e);
        }
    }

    isOrderReady(orderId) {
        const status = this.getReadyStatus();
        return status[orderId] === true;
    }

    toggleOrderReady(orderId, isReady) {
        const status = this.getReadyStatus();
        if (isReady) {
            status[orderId] = true;
        } else {
            delete status[orderId];
        }
        this.saveReadyStatus(status);

        // Update the UI
        const card = document.querySelector(`[data-order-id="${orderId}"]`);
        if (card) {
            card.classList.toggle('ready', isReady);
        }

        // Re-render schedule to update ready counts
        this.renderSchedule(this.data?.pickupSchedule || []);
    }

    getReadyCountForSlot(slot) {
        if (!slot.orders) return 0;
        return slot.orders.filter(order => this.isOrderReady(order.id)).length;
    }

    clearExpiredReadyStatus() {
        // Clear ready status for dates other than today
        const today = this.getTodayString();
        try {
            const keys = Object.keys(localStorage).filter(key =>
                key.startsWith('bakery_ready_status_') && !key.endsWith(today)
            );
            keys.forEach(key => localStorage.removeItem(key));
        } catch (e) {
            // Ignore errors
        }
    }

    // Print functions
    printBakeList() {
        const printContainer = document.getElementById('printContainer');
        if (!printContainer) return;

        const date = new Date(this.currentDate + 'T12:00:00');
        const dateStr = date.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });
        const now = new Date();
        const generatedTime = now.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });

        const bakeList = this.data?.bakeList || {};
        const totals = this.data?.totals || {};
        const schedule = this.data?.pickupSchedule || [];

        printContainer.innerHTML = `
            <div class="print-page print-bake-list">
                <div class="print-header">
                    <h1>PARK AVENUE BAKERY</h1>
                    <h2>BAKE LIST</h2>
                    <p>${dateStr}</p>
                    <p class="generated-time">Generated: ${generatedTime}</p>
                </div>

                <div class="print-section">
                    <h3>BREADS</h3>
                    ${this.renderPrintBakeCategory(bakeList.breads || [])}
                </div>

                <div class="print-section">
                    <h3>BARS</h3>
                    ${this.renderPrintBakeCategory(bakeList.bars || [])}
                </div>

                <div class="print-section">
                    <h3>COOKIES</h3>
                    ${this.renderPrintBakeCategory(bakeList.cookies || [])}
                </div>

                <div class="print-totals">
                    <p><strong>Total Orders:</strong> ${totals.orders || 0}</p>
                    <p><strong>Total Items:</strong> ${totals.items || 0}</p>
                    <p>Breads: ${totals.breads || 0} | Bars: ${totals.bars || 0} | Cookies: ${totals.cookies || 0}</p>
                </div>

                <div class="page-break"></div>

                <div class="print-header">
                    <h1>PARK AVENUE BAKERY</h1>
                    <h2>PICKUP SCHEDULE OVERVIEW</h2>
                    <p>${dateStr}</p>
                </div>

                <div class="print-schedule-overview">
                    ${schedule.map(slot => `
                        <div class="print-schedule-slot">
                            <span class="slot-time">${slot.displayTime}</span>
                            <span class="slot-count">${slot.orderCount} order${slot.orderCount !== 1 ? 's' : ''}</span>
                            <span class="slot-items">${slot.itemCount} items</span>
                        </div>
                    `).join('') || '<p>No pickups scheduled</p>'}
                </div>
            </div>
        `;

        printContainer.classList.add('printing');
        window.print();
        setTimeout(() => {
            printContainer.classList.remove('printing');
            printContainer.innerHTML = '';
        }, 1000);
    }

    renderPrintBakeCategory(items) {
        if (!items || items.length === 0) {
            return '<p class="empty">No orders</p>';
        }
        return `
            <ul class="print-bake-items">
                ${items.map(item => `
                    <li>
                        <span class="print-checkbox">☐</span>
                        <span class="item-name">${this.escapeHtml(item.name)}</span>
                        <span class="item-dots"></span>
                        <span class="item-qty">${item.quantity}</span>
                    </li>
                `).join('')}
            </ul>
        `;
    }

    printSlot(time) {
        const slot = this.data?.pickupSchedule?.find(s => s.time === time);
        if (!slot) return;

        this.printPickupSheets([slot]);
    }

    printAllPickupSheets() {
        const schedule = this.data?.pickupSchedule || [];
        if (schedule.length === 0) {
            this.showError('No pickup slots to print.');
            return;
        }
        this.printPickupSheets(schedule);
    }

    printPickupSheets(slots) {
        const printContainer = document.getElementById('printContainer');
        if (!printContainer) return;

        const date = new Date(this.currentDate + 'T12:00:00');
        const dateStr = date.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });
        const now = new Date();
        const generatedTime = now.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });

        printContainer.innerHTML = slots.map((slot, index) => `
            <div class="print-page print-pickup-sheet ${index > 0 ? 'page-break-before' : ''}">
                <div class="print-header">
                    <h1>PARK AVENUE BAKERY</h1>
                    <h2>PICKUP SHEET: ${slot.displayTime}</h2>
                    <p>${dateStr}</p>
                    <p class="generated-time">Generated: ${generatedTime}</p>
                </div>

                <div class="print-orders">
                    ${slot.orders.map(order => `
                        <div class="print-order">
                            <div class="print-order-header">
                                <span class="order-number">ORDER #${this.escapeHtml(order.orderNumber)}</span>
                            </div>
                            <div class="print-order-customer">
                                <p><strong>Customer:</strong> ${this.escapeHtml(order.customerName)}</p>
                                ${order.customerPhone ? `<p><strong>Phone:</strong> ${this.escapeHtml(order.customerPhone)}</p>` : ''}
                            </div>
                            <ul class="print-order-items">
                                ${order.items.map(item => `
                                    <li>
                                        <span class="print-checkbox">☐</span>
                                        <span class="item-qty">${item.quantity}x</span>
                                        <span class="item-name">${this.escapeHtml(item.name)}</span>
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                    `).join('')}
                </div>

                <div class="print-slot-total">
                    <strong>TOTAL:</strong> ${slot.orderCount} order${slot.orderCount !== 1 ? 's' : ''}, ${slot.itemCount} items
                </div>
            </div>
        `).join('');

        printContainer.classList.add('printing');
        window.print();
        setTimeout(() => {
            printContainer.classList.remove('printing');
            printContainer.innerHTML = '';
        }, 1000);
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
                    <strong>Order #${this.escapeHtml(order.orderNumber || order.id)}</strong><br>
                    ${order.customerName ? `Customer: ${this.escapeHtml(order.customerName)}<br>` : ''}
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
let dashboard;
document.addEventListener('DOMContentLoaded', () => {
    dashboard = new PrepDashboard();
    window.dashboard = dashboard; // Make accessible for onclick handlers
});
