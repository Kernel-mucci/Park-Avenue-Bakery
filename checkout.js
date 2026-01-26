// Checkout Manager for Park Avenue Bakery
// Handles checkout process and Clover payment integration via Vercel serverless function

class CheckoutManager {
    constructor() {
        this.orderData = null;
        this.TAX_RATE = 0; // No sales tax in Montana
        this.init();
    }

    init() {
        // Load order from sessionStorage
        this.loadOrder();
        
        // Set minimum pickup date to tomorrow
        this.setMinPickupDate();
        
        // Render order summary
        this.renderOrderSummary();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Check for error messages in URL
        this.checkForErrors();
    }

    loadOrder() {
        const orderJson = sessionStorage.getItem('checkoutOrder');
        
        if (!orderJson) {
            alert('No order found. Redirecting to menu...');
            window.location.href = 'menu.html';
            return;
        }
        
        this.orderData = JSON.parse(orderJson);
    }

    setMinPickupDate() {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const minDate = tomorrow.toISOString().split('T')[0];
        const pickupDateInput = document.getElementById('pickupDate');
        if (pickupDateInput) {
            pickupDateInput.setAttribute('min', minDate);
            pickupDateInput.value = minDate;
        }
    }

    checkForErrors() {
        const urlParams = new URLSearchParams(window.location.search);
        const error = urlParams.get('error');
        
        if (error === 'payment_failed') {
            this.showMessage('Payment failed. Please try again.', 'error');
        } else if (error === 'payment_cancelled') {
            this.showMessage('Payment was cancelled. You can try again when ready.', 'warning');
        }
    }

    showMessage(message, type = 'info') {
        // Create a toast notification
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <span>${message}</span>
            <button onclick="this.parentElement.remove()">&times;</button>
        `;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            background: ${type === 'error' ? '#dc3545' : type === 'warning' ? '#ffc107' : '#17a2b8'};
            color: ${type === 'warning' ? '#000' : '#fff'};
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            display: flex;
            align-items: center;
            gap: 1rem;
            animation: slideIn 0.3s ease;
        `;
        document.body.appendChild(toast);
        
        // Auto remove after 5 seconds
        setTimeout(() => toast.remove(), 5000);
    }

    calculateTotals() {
        const subtotal = this.orderData.subtotal;
        const tax = subtotal * this.TAX_RATE;
        const total = subtotal + tax;
        
        return {
            subtotal: subtotal,
            tax: tax,
            total: total
        };
    }

    renderOrderSummary() {
        const summaryItemsContainer = document.getElementById('summaryItems');
        const totals = this.calculateTotals();
        
        if (!summaryItemsContainer) return;
        
        // Render items
        summaryItemsContainer.innerHTML = this.orderData.items.map(item => `
            <div class="summary-item">
                <div class="summary-item-details">
                    <span class="item-name">${item.name}</span>
                    <span class="item-quantity">x${item.quantity}</span>
                </div>
                <span class="item-price">$${(item.price * item.quantity).toFixed(2)}</span>
            </div>
        `).join('');
        
        // Update total (no tax in Montana)
        const summaryTotal = document.getElementById('summaryTotal');
        if (summaryTotal) {
            summaryTotal.textContent = `$${totals.total.toFixed(2)}`;
        }
    }

    setupEventListeners() {
        const payBtn = document.getElementById('payNowBtn');
        if (payBtn) {
            payBtn.addEventListener('click', () => {
                this.processPayment();
            });
        }
    }

    validateForm() {
        const form = document.getElementById('checkoutForm');
        
        if (!form || !form.checkValidity()) {
            if (form) form.reportValidity();
            return false;
        }
        
        return true;
    }

    getFormData() {
        return {
            fullName: document.getElementById('fullName')?.value || '',
            email: document.getElementById('email')?.value || '',
            phone: document.getElementById('phone')?.value || '',
            pickupDate: document.getElementById('pickupDate')?.value || '',
            pickupTime: document.getElementById('pickupTime')?.value || '',
            notes: document.getElementById('notes')?.value || ''
        };
    }

    generateOrderNumber() {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000);
        return `PAB-${timestamp}-${random}`;
    }

    async processPayment() {
        // Validate form
        if (!this.validateForm()) {
            return;
        }
        
        // Get button and disable it
        const payBtn = document.getElementById('payNowBtn');
        const originalText = payBtn.innerHTML;
        payBtn.disabled = true;
        payBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating checkout...';
        
        try {
            const formData = this.getFormData();
            const totals = this.calculateTotals();
            
            // Prepare order data for the API
            const orderForClover = {
                customer: formData,
                items: this.orderData.items,
                totals: totals,
                orderNumber: this.generateOrderNumber()
            };
            
            // Save order details to sessionStorage for confirmation page
            sessionStorage.setItem('completedOrder', JSON.stringify(orderForClover));
            
            console.log('Sending order to API:', orderForClover);
            
            // Call the Vercel serverless function
            const response = await fetch('/api/create-checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ orderData: orderForClover })
            });
            
            const result = await response.json();
            console.log('API Response:', result);
            
            if (!response.ok) {
                throw new Error(result.details || result.error || 'Failed to create checkout session');
            }
            
            if (!result.checkoutUrl) {
                throw new Error('No checkout URL received from payment service');
            }
            
            // Update button text before redirect
            payBtn.innerHTML = '<i class="fas fa-external-link-alt"></i> Redirecting to payment...';
            
            // Redirect to Clover Hosted Checkout
            console.log('Redirecting to:', result.checkoutUrl);
            window.location.href = result.checkoutUrl;
            
        } catch (error) {
            console.error('Payment error:', error);
            
            // Show user-friendly error message
            this.showMessage(
                `Payment Error: ${error.message}. Please try again or contact us at (406) 449-8424.`,
                'error'
            );
            
            // Re-enable button
            payBtn.disabled = false;
            payBtn.innerHTML = originalText;
        }
    }
}

// Initialize checkout manager when page loads
document.addEventListener('DOMContentLoaded', () => {
    new CheckoutManager();
});

// Add CSS animation for toast
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    .toast button {
        background: none;
        border: none;
        font-size: 1.5rem;
        cursor: pointer;
        color: inherit;
        padding: 0;
        line-height: 1;
    }
`;
document.head.appendChild(style);
