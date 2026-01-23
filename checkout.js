// Checkout Manager for Park Avenue Bakery
// Handles checkout process and Clover payment integration

class CheckoutManager {
    constructor() {
        this.orderData = null;
        this.TAX_RATE = 0.08; // 8% tax
        
        // IMPORTANT: Replace these with your actual Clover credentials
        this.CLOVER_API_KEY = 'YOUR_CLOVER_API_KEY'; // Replace with your actual API key
        this.CLOVER_MERCHANT_ID = 'YOUR_MERCHANT_ID'; // Replace with your merchant ID
        
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
        
        // Update totals
        document.getElementById('summarySubtotal').textContent = `$${totals.subtotal.toFixed(2)}`;
        document.getElementById('summaryTax').textContent = `$${totals.tax.toFixed(2)}`;
        document.getElementById('summaryTotal').textContent = `$${totals.total.toFixed(2)}`;
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
        const totals = orderData.totals;
        const amountInCents = Math.round(totals.total * 100);
        
        // Clover Hosted Checkout configuration
        const checkoutData = {
            customer: {
                email: orderData.customer.email,
                firstName: orderData.customer.fullName.split(' ')[0],
                lastName: orderData.customer.fullName.split(' ').slice(1).join(' ') || '',
                phoneNumber: orderData.customer.phone
            },
            shoppingCart: {
                lineItems: orderData.items.map(item => ({
                    name: item.name,
                    unitQty: item.quantity,
                    price: Math.round(item.price * 100) // Convert to cents
                }))
            }
        };
        
        // IMPORTANT: This is a simplified example
        // You'll need to implement proper server-side integration with Clover
        // For now, we'll simulate the payment and redirect to confirmation
        
        // In production, you would:
        // 1. Send order data to your server
        // 2. Your server creates a Clover charge/checkout session
        // 3. Redirect user to Clover Hosted Checkout
        // 4. Clover redirects back to your order-confirmation.html
        
        // For demonstration purposes, we'll directly redirect to confirmation
        console.log('Order data for Clover:', orderData);
        console.log('Checkout data:', checkoutData);
        
        // Simulate payment processing
        setTimeout(() => {
            // Redirect to confirmation page
            window.location.href = 'order-confirmation.html';
        }, 1500);
        
        /* PRODUCTION CODE - Uncomment and configure when ready:
        
        const response = await fetch('https://checkout.clover.com/v1/charges', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.CLOVER_API_KEY}`,
                'Content-Type': 'application/json',
                'X-Clover-Merchant-Id': this.CLOVER_MERCHANT_ID
            },
            body: JSON.stringify({
                amount: amountInCents,
                currency: 'usd',
                source: checkoutData,
                metadata: {
                    orderNumber: orderData.orderNumber,
                    pickupDate: orderData.customer.pickupDate,
                    pickupTime: orderData.customer.pickupTime
                }
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to create checkout session');
        }
        
        const result = await response.json();
        
        // Redirect to Clover Hosted Checkout
        window.location.href = result.hosted_checkout_url;
        
        */
    }

    generateOrderNumber() {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000);
        return `PAB-${timestamp}-${random}`;
    }
}

// Initialize checkout manager when page loads
document.addEventListener('DOMContentLoaded', () => {
    const checkoutManager = new CheckoutManager();
});
