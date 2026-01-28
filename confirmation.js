// Order Confirmation Manager for Park Avenue Bakery
// Displays order confirmation details after successful payment

class OrderConfirmation {
    constructor() {
        this.orderData = null;
        this.init();
    }

    init() {
        if (!this.loadOrder()) return; // Halt if no order (redirect already triggered)
        this.renderConfirmation();
        this.clearCheckoutData();
    }

    loadOrder() {
        try {
            const orderJson = sessionStorage.getItem('completedOrder');

            if (!orderJson) {
                alert('No order found. Redirecting to menu...');
                window.location.href = 'menu.html';
                return false;
            }

            const parsed = JSON.parse(orderJson);

            if (!parsed || !Array.isArray(parsed.items) || !parsed.totals) {
                alert('Invalid order data. Redirecting to menu...');
                window.location.href = 'menu.html';
                return false;
            }

            this.orderData = parsed;
            return true;
        } catch (e) {
            alert('Error loading order. Redirecting to menu...');
            window.location.href = 'menu.html';
            return false;
        }
    }

    renderConfirmation() {
        // Use textContent for all user-supplied data to prevent XSS
        const orderNumberEl = document.getElementById('orderNumber');
        const pickupDateEl = document.getElementById('pickupDate');
        const pickupTimeEl = document.getElementById('pickupTime');
        const customerNameEl = document.getElementById('customerName');
        const customerEmailEl = document.getElementById('customerEmail');
        const customerPhoneEl = document.getElementById('customerPhone');

        if (orderNumberEl) orderNumberEl.textContent = this.orderData.orderNumber;
        if (pickupDateEl) pickupDateEl.textContent = this.formatDate(this.orderData.customer.pickupDate);
        if (pickupTimeEl) pickupTimeEl.textContent = this.formatTime(this.orderData.customer.pickupTime);
        if (customerNameEl) customerNameEl.textContent = this.orderData.customer.fullName;
        if (customerEmailEl) customerEmailEl.textContent = this.orderData.customer.email;
        if (customerPhoneEl) customerPhoneEl.textContent = this.orderData.customer.phone;

        // Build order items using DOM API to prevent innerHTML XSS
        const itemsContainer = document.getElementById('confirmationItems');
        if (itemsContainer) {
            itemsContainer.innerHTML = '';
            this.orderData.items.forEach(item => {
                const div = document.createElement('div');
                div.className = 'confirmation-item';

                const infoSpan = document.createElement('span');
                infoSpan.className = 'item-info';

                const nameStrong = document.createElement('strong');
                nameStrong.textContent = item.name;

                const qtySpan = document.createElement('span');
                qtySpan.className = 'item-qty';
                qtySpan.textContent = `x${item.quantity}`;

                const priceSpan = document.createElement('span');
                priceSpan.className = 'item-price';
                priceSpan.textContent = `$${(item.price * item.quantity).toFixed(2)}`;

                infoSpan.append(nameStrong, qtySpan);
                div.append(infoSpan, priceSpan);
                itemsContainer.appendChild(div);
            });
        }

        // Totals (no tax in Montana)
        const confirmTotalEl = document.getElementById('confirmTotal');
        if (confirmTotalEl) {
            confirmTotalEl.textContent = `$${this.orderData.totals.total.toFixed(2)}`;
        }
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    formatTime(timeString) {
        const [hours, minutes] = timeString.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${minutes} ${ampm}`;
    }

    clearCheckoutData() {
        // Clear cart and checkout data
        try {
            localStorage.removeItem('bakeryCart');
            sessionStorage.removeItem('checkoutOrder');
        } catch (e) {
            // Non-critical: storage may be unavailable
        }
        // Keep completedOrder for page refresh
    }
}

// Initialize confirmation when page loads
document.addEventListener('DOMContentLoaded', () => {
    new OrderConfirmation();
});
