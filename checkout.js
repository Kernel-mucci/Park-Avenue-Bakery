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
        if (!this.loadOrder()) return; // Halt if no order (redirect already triggered)

        // Set pickup date from order data (pre-selected in menu)
        this.setPickupDate();

        // Render order summary
        this.renderOrderSummary();

        // Load available time slots for the pickup date
        this.loadAvailableTimeSlots();

        // Setup event listeners
        this.setupEventListeners();

        // Check for error messages in URL
        this.checkForErrors();
    }

    loadOrder() {
        try {
            const orderJson = sessionStorage.getItem('checkoutOrder');

            if (!orderJson) {
                alert('No order found. Redirecting to menu...');
                window.location.href = 'menu.html';
                return false;
            }

            const parsed = JSON.parse(orderJson);

            // Validate structure
            if (!parsed || !Array.isArray(parsed.items) || parsed.items.length === 0) {
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

    setPickupDate() {
        const pickupDateInput = document.getElementById('pickupDate');
        if (!pickupDateInput) return;

        const today = new Date();
        const minDate = today.toISOString().split('T')[0];
        pickupDateInput.setAttribute('min', minDate);

        // Use the pickup date from the order (set in menu page)
        if (this.orderData.pickupDate) {
            pickupDateInput.value = this.orderData.pickupDate;
        } else {
            // Fallback to tomorrow if no date was set
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            pickupDateInput.value = tomorrow.toISOString().split('T')[0];
        }

        // Add change listener to reload time slots when date changes
        pickupDateInput.addEventListener('change', () => {
            this.loadAvailableTimeSlots();
        });
    }

    async loadAvailableTimeSlots() {
        const pickupDateInput = document.getElementById('pickupDate');
        const pickupTimeSelect = document.getElementById('pickupTime');

        if (!pickupDateInput || !pickupTimeSelect) return;

        const pickupDate = pickupDateInput.value;
        if (!pickupDate) return;

        // Show loading state
        pickupTimeSelect.innerHTML = '<option value="">Loading available times...</option>';
        pickupTimeSelect.disabled = true;

        try {
            const response = await fetch(`/api/order-rules?pickupDate=${pickupDate}&type=slots`);

            if (!response.ok) {
                throw new Error('Failed to load time slots');
            }

            const data = await response.json();

            if (!data.available || !data.slots || data.slots.length === 0) {
                pickupTimeSelect.innerHTML = '<option value="">No slots available for this date</option>';
                this.showMessage(data.reason || 'No pickup slots available for this date.', 'warning');
                return;
            }

            // Populate time slots
            pickupTimeSelect.innerHTML = '<option value="">Select a time</option>';
            data.slots.forEach(slot => {
                const option = document.createElement('option');
                option.value = slot.time;
                option.textContent = this.formatTime(slot.time);
                if (slot.remainingSlots <= 2) {
                    option.textContent += ' (limited slots)';
                }
                pickupTimeSelect.appendChild(option);
            });

        } catch (error) {
            console.error('Error loading time slots:', error);
            // Fallback to default time slots
            this.loadDefaultTimeSlots(pickupTimeSelect);
        } finally {
            pickupTimeSelect.disabled = false;
        }
    }

    formatTime(time24) {
        const [hours, minutes] = time24.split(':');
        const hour = parseInt(hours, 10);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        return `${hour12}:${minutes} ${ampm}`;
    }

    loadDefaultTimeSlots(pickupTimeSelect) {
        const defaultSlots = [
            '07:00', '07:30', '08:00', '08:30', '09:00', '09:30',
            '10:00', '10:30', '11:00', '11:30', '12:00', '12:30',
            '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
            '16:00', '16:30', '17:00', '17:30'
        ];

        pickupTimeSelect.innerHTML = '<option value="">Select a time</option>';
        defaultSlots.forEach(time => {
            const option = document.createElement('option');
            option.value = time;
            option.textContent = this.formatTime(time);
            pickupTimeSelect.appendChild(option);
        });
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
        // Create a toast notification using textContent to prevent XSS
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        const span = document.createElement('span');
        span.textContent = message;

        const closeBtn = document.createElement('button');
        closeBtn.textContent = '\u00D7';
        closeBtn.addEventListener('click', () => toast.remove());

        toast.append(span, closeBtn);
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

        // Build DOM safely to prevent XSS from sessionStorage data
        summaryItemsContainer.innerHTML = '';
        this.orderData.items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'summary-item';

            const details = document.createElement('div');
            details.className = 'summary-item-details';

            const nameSpan = document.createElement('span');
            nameSpan.className = 'item-name';
            nameSpan.textContent = item.name;

            const qtySpan = document.createElement('span');
            qtySpan.className = 'item-quantity';
            qtySpan.textContent = `x${item.quantity}`;

            const priceSpan = document.createElement('span');
            priceSpan.className = 'item-price';
            priceSpan.textContent = `$${(item.price * item.quantity).toFixed(2)}`;

            details.append(nameSpan, qtySpan);
            div.append(details, priceSpan);
            summaryItemsContainer.appendChild(div);
        });

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
        const random = Math.floor(Math.random() * 1000000);
        return `PAB-${timestamp}-${random}`;
    }

    async validateOrderWithGuardrails(formData) {
        try {
            const orderForValidation = {
                pickupDate: formData.pickupDate,
                pickupTime: formData.pickupTime,
                items: this.orderData.items.map(item => ({
                    id: item.id,
                    name: item.name,
                    quantity: item.quantity
                }))
            };

            const response = await fetch('/api/order-rules', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ order: orderForValidation })
            });

            const result = await response.json();

            // Show warnings if any
            if (result.warnings && result.warnings.length > 0) {
                result.warnings.forEach(warning => {
                    this.showMessage(warning, 'warning');
                });
            }

            return {
                valid: response.ok && result.valid !== false,
                errors: result.errors || [],
                warnings: result.warnings || []
            };

        } catch (error) {
            console.error('Order validation error:', error);
            // If validation API fails, allow order to proceed (graceful degradation)
            return { valid: true, errors: [], warnings: [] };
        }
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
        payBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Validating order...';

        try {
            const formData = this.getFormData();
            const totals = this.calculateTotals();

            // Validate order against guardrails before proceeding
            const validationResult = await this.validateOrderWithGuardrails(formData);
            if (!validationResult.valid) {
                this.showMessage(validationResult.errors[0] || 'Order validation failed', 'error');
                payBtn.disabled = false;
                payBtn.innerHTML = originalText;
                return;
            }

            payBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating checkout...';

            // Prepare order data for the API
            const orderForClover = {
                customer: formData,
                items: this.orderData.items,
                totals: totals,
                orderNumber: this.generateOrderNumber()
            };

            // Call the Vercel serverless function
            const response = await fetch('/api/create-checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ orderData: orderForClover })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to create checkout session');
            }

            if (!result.checkoutUrl) {
                throw new Error('No checkout URL received from payment service');
            }

            // Save order details to sessionStorage ONLY after successful API response
            // (before redirect to Clover, but after server validated the order)
            try {
                sessionStorage.setItem('completedOrder', JSON.stringify(orderForClover));
            } catch (e) {
                // Non-fatal: confirmation page may not display details
            }

            // Update button text before redirect
            payBtn.innerHTML = '<i class="fas fa-external-link-alt"></i> Redirecting to payment...';

            // Redirect to Clover Hosted Checkout
            window.location.href = result.checkoutUrl;

        } catch (error) {
            // Show user-friendly error message (no raw error.message to avoid XSS/info leak)
            this.showMessage(
                'Unable to process payment. Please try again or contact us at (406) 449-8424.',
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
const checkoutStyle = document.createElement('style');
checkoutStyle.textContent = `
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
document.head.appendChild(checkoutStyle);
