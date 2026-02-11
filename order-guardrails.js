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

        // Task 4: Re-validate cart against new date's available items
        this.revalidateCart();
    }

    // Task 4: Re-validate cart items when pickup date changes
    revalidateCart() {
        if (typeof cart === 'undefined' || !this.availableItems) return;

        const availableIds = this.getAvailableItemIds();
        const removedItems = [];

        // Find items in cart that are no longer available
        cart.items = cart.items.filter(item => {
            if (availableIds.includes(item.id)) {
                return true; // keep
            } else {
                removedItems.push(item.name);
                return false; // remove
            }
        });

        if (removedItems.length > 0) {
            cart.saveCart();
            cart.render();

            // Notify user
            const message = removedItems.length === 1
                ? `${removedItems[0]} was removed from your cart — not available for this pickup date.`
                : `${removedItems.length} items were removed from your cart — not available for this pickup date: ${removedItems.join(', ')}`;

            cart.showNotification(message);
        }
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

        // Get specialty and everyday bread IDs
        const specialtyBreadIds = this.getSpecialtyBreadIds();
        const everydayBreadIds = this.getEverydayBreadIds();

        menuItems.forEach(item => {
            const addBtn = item.querySelector('.add-to-cart-btn');
            if (!addBtn) return;

            const itemId = addBtn.dataset.id;

            // Clean up any previous specialty styling
            item.classList.remove('specialty-bread');
            const existingBadge = item.querySelector('.specialty-badge');
            if (existingBadge) existingBadge.remove();
            const existingCutoff = item.querySelector('.cutoff-notice');
            if (existingCutoff) existingCutoff.remove();

            if (availableIds.includes(itemId)) {
                item.style.display = '';
                item.classList.remove('unavailable');
                addBtn.disabled = false;

                // Add specialty bread styling if applicable
                if (specialtyBreadIds.includes(itemId)) {
                    this.addSpecialtyBreadStyling(item);
                }
            } else {
                item.style.display = 'none';
                item.classList.add('unavailable');
                addBtn.disabled = true;
                hiddenCount++;
            }
        });

        // Reorder breads and add section headers
        this.reorderBreadsWithSections(specialtyBreadIds, everydayBreadIds);

        // Show info about hidden items
        if (hiddenCount > 0) {
            this.showPickupInfo();
        }
    }

    getSpecialtyBreadIds() {
        if (!this.availableItems || !this.availableItems.breads) return [];
        return this.availableItems.breads
            .filter(item => item.category === 'specialty-bread')
            .map(item => item.id);
    }

    getEverydayBreadIds() {
        if (!this.availableItems || !this.availableItems.breads) return [];
        return this.availableItems.breads
            .filter(item => item.category === 'everyday-bread')
            .map(item => item.id);
    }

    addSpecialtyBreadStyling(menuItem) {
        menuItem.classList.add('specialty-bread');

        // Add specialty badge at top of card
        const badge = document.createElement('div');
        badge.className = 'specialty-badge';
        badge.innerHTML = '<i class="fas fa-star"></i> TODAY\'S SPECIALTY';
        menuItem.insertBefore(badge, menuItem.firstChild);

        // Add cutoff notice to footer
        const footer = menuItem.querySelector('.menu-item-footer');
        if (footer) {
            const cutoffNotice = document.createElement('div');
            cutoffNotice.className = 'cutoff-notice';
            cutoffNotice.innerHTML = '<i class="fas fa-clock"></i> Order by 5pm day before';
            footer.parentNode.insertBefore(cutoffNotice, footer.nextSibling);
        }
    }

    reorderBreadsWithSections(specialtyBreadIds, everydayBreadIds) {
        const menuGrid = document.querySelector('.menu-items-grid');
        if (!menuGrid) return;

        // Get all bread menu items (visible ones)
        const allBreadItems = Array.from(menuGrid.querySelectorAll('.menu-item[data-category="breads"]'))
            .filter(item => item.style.display !== 'none');

        if (allBreadItems.length === 0) return;

        // Separate specialty and everyday breads
        const specialtyBreads = [];
        const everydayBreads = [];

        allBreadItems.forEach(item => {
            const btn = item.querySelector('.add-to-cart-btn');
            if (!btn) return;
            const itemId = btn.dataset.id;
            if (specialtyBreadIds.includes(itemId)) {
                specialtyBreads.push(item);
            } else {
                everydayBreads.push(item);
            }
        });

        // Find the first bread item position
        const firstBreadItem = menuGrid.querySelector('.menu-item[data-category="breads"]');
        if (!firstBreadItem) return;

        // Reorder: specialty breads first, then everyday breads (no headers)
        let insertAfter = null;

        // Move specialty breads to the front
        specialtyBreads.forEach((bread, index) => {
            if (index === 0) {
                menuGrid.insertBefore(bread, firstBreadItem);
            } else if (insertAfter && insertAfter.nextSibling) {
                menuGrid.insertBefore(bread, insertAfter.nextSibling);
            } else {
                menuGrid.appendChild(bread);
            }
            insertAfter = bread;
        });

        // Move everyday breads after specialty breads
        everydayBreads.forEach(bread => {
            if (insertAfter && insertAfter.nextSibling) {
                menuGrid.insertBefore(bread, insertAfter.nextSibling);
            } else {
                menuGrid.appendChild(bread);
            }
            insertAfter = bread;
        });
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
        // Task 3: Future pastries support
        if (this.availableItems.pastries) {
            this.availableItems.pastries.forEach(item => ids.push(item.id));
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
