// Order Confirmation Manager for Park Avenue Bakery
// Displays order confirmation details after successful payment

class OrderConfirmation {
    constructor() {
        this.orderData = null;
        this.init();
    }

    init() {
        this.loadOrder();
        this.renderConfirmation();
        this.clearCheckoutData();
    }

    loadOrder() {
        const orderJson = sessionStorage.getItem('completedOrder');
        
        if (!orderJson) {
            alert('No order found. Redirecting to menu...');
            window.location.href = 'menu.html';
            return;
        }
        
        this.orderData = JSON.parse(orderJson);
    }

    renderConfirmation() {
        // Order details
        document.getElementById('orderNumber').textContent = this.orderData.orderNumber;
        document.getElementById('pickupDate').textContent = this.formatDate(this.orderData.customer.pickupDate);
        document.getElementById('pickupTime').textContent = this.formatTime(this.orderData.customer.pickupTime);
        document.getElementById('customerName').textContent = this.orderData.customer.fullName;
        document.getElementById('customerEmail').textContent = this.orderData.customer.email;
        document.getElementById('customerPhone').textContent = this.orderData.customer.phone;
        
        // Order items
        const itemsContainer = document.getElementById('confirmationItems');
        itemsContainer.innerHTML = this.orderData.items.map(item => `
            <div class="confirmation-item">
                <span class="item-info">
                    <strong>${item.name}</strong>
                    <span class="item-qty">x${item.quantity}</span>
                </span>
                <span class="item-price">$${(item.price * item.quantity).toFixed(2)}</span>
            </div>
        `).join('');
        
        // Totals
        document.getElementById('confirmSubtotal').textContent = `$${this.orderData.totals.subtotal.toFixed(2)}`;
        document.getElementById('confirmTax').textContent = `$${this.orderData.totals.tax.toFixed(2)}`;
        document.getElementById('confirmTotal').textContent = `$${this.orderData.totals.total.toFixed(2)}`;
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
        localStorage.removeItem('bakeryCart');
        sessionStorage.removeItem('checkoutOrder');
        // Keep completedOrder for page refresh
    }
}

// Initialize confirmation when page loads
document.addEventListener('DOMContentLoaded', () => {
    const orderConfirmation = new OrderConfirmation();
});
