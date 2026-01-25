// Checkout Manager for Park Avenue Bakery
// Handles checkout process and Clover payment integration

class CheckoutManager {
    constructor() {
    this.orderData = null;
    this.TAX_RATE = 0; // No sales tax in Montana
    
    // API keys now stored securely in Vercel
    // Not in frontend code anymore!
    
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
        document.getElementById('pickupDate').setAttribute('min', minDate);
        document.getElementById('pickupDate').value = minDate;
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
        const totalElement = document.getElementById('summaryTotal');
        if (totalElement) {
            totalElement.textContent = `$${totals.total.toFixed(2)}`;
        }
    }

    setupEventListeners() {
        document.getElementById('payNowBtn').addEventListener('click', () => {
            this.processPayment();
        });
    }

    validateForm() {
        const form = document.getElementById('checkoutForm');
        
        if (!form.checkValidity()) {
            form.reportValidity();
            return false;
        }
        
        return true;
    }

    getFormData() {
        return {
            fullName: document.getElementById('fullName').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value,
            pickupDate: document.getElementById('pickupDate').value,
            pickupTime: document.getElementById('pickupTime').value,
            notes: document.getElementById('notes').value
        };
    }

    async processPayment() {
        // Validate form
        if (!this.validateForm()) {
            return;
        }
        
        // Disable button
        const payBtn = document.getElementById('payNowBtn');
        payBtn.disabled = true;
        payBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        
        try {
            const formData = this.getFormData();
            const totals = this.calculateTotals();
            
            // Prepare order data for Clover
            const orderForClover = {
                customer: formData,
                items: this.orderData.items,
                totals: totals,
                orderNumber: this.generateOrderNumber()
            };
            
            // Save order details to sessionStorage for confirmation page
            sessionStorage.setItem('completedOrder', JSON.stringify(orderForClover));
            
            // Create Clover Hosted Checkout
            await this.createCloverCheckout(orderForClover);
            
        } catch (error) {
            console.error('Payment error:', error);
            alert('There was an error processing your payment. Please try again.');
            payBtn.disabled = false;
            payBtn.innerHTML = '<i class="fas fa-lock"></i> Pay Now with Clover';
        }
    }

    async createCloverCheckout(orderData) {
    try {
        // Call YOUR Vercel serverless function
        const response = await fetch('/api/create-checkout', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({ orderData })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to create checkout');
        }

        const { checkoutUrl } = await response.json();
        
        // Redirect customer to Clover's payment page
        window.location.href = checkoutUrl;

    } catch (error) {
        console.error('Checkout error:', error);
        throw error;
    }
}

    generateOrderNumber() {
        // Generate date prefix (MMDD format)
        const now = new Date();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const datePrefix = month + day;
        
        // Generate random 5-digit number (10000-99999)
        const randomDigits = Math.floor(10000 + Math.random() * 90000);
        
        // Combine: MMDD-XXXXX (e.g., 0123-45678)
        return `${datePrefix}-${randomDigits}`;
    }
}

// Initialize checkout manager when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Make checkoutManager global for debugging
    window.checkoutManager = new CheckoutManager();
});
