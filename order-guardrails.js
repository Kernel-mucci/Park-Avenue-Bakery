// order-guardrails.js
// Client-side order guardrails for Park Avenue Bakery
// Handles pickup date selection, item availability, and order validation

class OrderGuardrails {
    constructor() {
        this.pickupDate = null;
        this.availableItems = null;
        this.init();
    }

    init() {
        this.setupDatePicker();
        this.loadSavedPickupDate();
    }

    setupDatePicker() {
        const dateInput = document.getElementById('pickupDate');
        const loadMenuBtn = document.getElementById('loadMenuBtn');

        if (!dateInput || !loadMenuBtn) return;

        // Set minimum date to today
        const today = new Date();
        const todayStr = this.formatDate(today);
        dateInput.min = todayStr;

        // Set maximum date to 14 days out
        const maxDate = new Date();
        maxDate.setDate(maxDate.getDate() + 14);
        dateInput.max = this.formatDate(maxDate);

        // Handle date selection
        loadMenuBtn.addEventListener('click', () => this.handleDateSelection());
        dateInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleDateSelection();
        });
    }

    formatDate(date) {
        return date.toISOString().split('T')[0];
    }

    loadSavedPickupDate() {
        try {
            const savedDate = localStorage.getItem('pickupDate');
            if (savedDate) {
                const dateInput = document.getElementById('pickupDate');
                const savedDateObj = new Date(savedDate);
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                // Only load if date is still valid (not in the past)
                if (savedDateObj >= today) {
                    dateInput.value = savedDate;
                    this.handleDateSelection();
                } else {
                    localStorage.removeItem('pickupDate');
                }
            }
        } catch (e) {
            console.warn('Could not load saved pickup date');
        }
    }

    async handleDateSelection() {
        const dateInput = document.getElementById('pickupDate');
        const selectedDate = dateInput.value;

        if (!selectedDate) {
            this.showError('Please select a pickup date');
            return;
        }

        // Check if date is in the past
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const selectedDateObj = new Date(selectedDate);

        if (selectedDateObj < today) {
            this.showError('Please select a future date');
            return;
        }

        this.pickupDate = selectedDate;

        // Save to localStorage
        try {
            localStorage.setItem('pickupDate', selectedDate);
        } catch (e) {
            console.warn('Could not save pickup date');
        }

        // Fetch available items from API
        await this.fetchAvailableItems(selectedDate);
    }

    async fetchAvailableItems(pickupDate) {
        const loadMenuBtn = document.getElementById('loadMenuBtn');
        const originalText = loadMenuBtn.textContent;
        loadMenuBtn.textContent = 'Loading...';
        loadMenuBtn.disabled = true;

        try {
            const response = await fetch(`/api/order-rules?pickupDate=${pickupDate}`);

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to load menu');
            }

            this.availableItems = await response.json();
            this.updateMenuDisplay();
            this.showMenuSection();

        } catch (error) {
            console.error('Error fetching available items:', error);
            // If API fails, show all items (graceful degradation)
            this.showAllItems();
            this.showMenuSection();
            this.showInfo('Showing all menu items. Some items may not be available for your selected date.');
        } finally {
            loadMenuBtn.textContent = originalText;
            loadMenuBtn.disabled = false;
        }
    }

    updateMenuDisplay() {
        const menuItems = document.querySelectorAll('.menu-item');
        const availableIds = this.getAvailableItemIds();
        let hiddenCount = 0;

        menuItems.forEach(item => {
            const addBtn = item.querySelector('.add-to-cart-btn');
            if (!addBtn) return;

            const itemId = addBtn.dataset.id;

            if (availableIds.includes(itemId)) {
                item.style.display = '';
                item.classList.remove('unavailable');
                addBtn.disabled = false;
            } else {
                item.style.display = 'none';
                item.classList.add('unavailable');
                addBtn.disabled = true;
                hiddenCount++;
            }
        });

        // Show info about hidden items
        if (hiddenCount > 0) {
            this.showPickupInfo();
        }
    }

    getAvailableItemIds() {
        if (!this.availableItems) return [];

        const ids = [];

        if (this.availableItems.breads) {
            this.availableItems.breads.forEach(item => ids.push(item.id));
        }
        if (this.availableItems.bars) {
            this.availableItems.bars.forEach(item => ids.push(item.id));
        }
        if (this.availableItems.cookies) {
            this.availableItems.cookies.forEach(item => ids.push(item.id));
        }

        return ids;
    }

    showAllItems() {
        const menuItems = document.querySelectorAll('.menu-item');
        menuItems.forEach(item => {
            item.style.display = '';
            item.classList.remove('unavailable');
            const addBtn = item.querySelector('.add-to-cart-btn');
            if (addBtn) addBtn.disabled = false;
        });
    }

    showMenuSection() {
        const menuLayout = document.getElementById('menuLayout');
        const specialtyNotice = document.getElementById('specialtyNotice');

        if (menuLayout) {
            menuLayout.style.display = '';
        }

        if (specialtyNotice) {
            specialtyNotice.style.display = 'block';
        }

        // Update date section to show selected date
        const pickupDateSection = document.getElementById('pickupDateSection');
        if (pickupDateSection) {
            pickupDateSection.classList.add('date-selected');
        }
    }

    showPickupInfo() {
        const infoDiv = document.getElementById('pickupDateInfo');
        if (!infoDiv) return;

        const dateObj = new Date(this.pickupDate + 'T12:00:00');
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayName = dayNames[dateObj.getDay()];

        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const formattedDate = dateObj.toLocaleDateString('en-US', options);

        let message = `Showing items available for pickup on ${formattedDate}.`;

        // Add specialty bread info based on day
        const specialtyInfo = this.getSpecialtyBreadForDay(dateObj.getDay());
        if (specialtyInfo) {
            message += ` ${specialtyInfo}`;
        }

        infoDiv.textContent = message;
        infoDiv.className = 'pickup-date-info info';
    }

    getSpecialtyBreadForDay(dayOfWeek) {
        const specialties = {
            0: null, // Sunday - no specialty breads
            1: 'Norwegian Farm is available today!',
            2: 'Sourdough Rye is available today!',
            3: 'Old World Italian and Blackfoot are available today!',
            4: 'Golden Raisin Pecan is available today!',
            5: 'Old World Italian, Challah, and Cranberry Wild Rice are available today!',
            6: 'Rustic Multigrain is available today!'
        };
        return specialties[dayOfWeek];
    }

    showError(message) {
        const infoDiv = document.getElementById('pickupDateInfo');
        if (infoDiv) {
            infoDiv.textContent = message;
            infoDiv.className = 'pickup-date-info error';
        }
    }

    showInfo(message) {
        const infoDiv = document.getElementById('pickupDateInfo');
        if (infoDiv) {
            infoDiv.textContent = message;
            infoDiv.className = 'pickup-date-info info';
        }
    }

    // Get the currently selected pickup date
    getPickupDate() {
        return this.pickupDate;
    }

    // Validate cart items against available items
    validateCartItems(cartItems) {
        if (!this.availableItems || !this.pickupDate) {
            return { valid: true, errors: [], warnings: [] };
        }

        const availableIds = this.getAvailableItemIds();
        const errors = [];
        const warnings = [];

        cartItems.forEach(item => {
            if (!availableIds.includes(item.id)) {
                errors.push(`${item.name} is not available for pickup on your selected date.`);
            }
        });

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }
}

// Initialize on page load
let orderGuardrails;
document.addEventListener('DOMContentLoaded', () => {
    orderGuardrails = new OrderGuardrails();
});

// Export for use in other scripts
if (typeof window !== 'undefined') {
    window.OrderGuardrails = OrderGuardrails;
    window.getOrderGuardrails = () => orderGuardrails;
}
