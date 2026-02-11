// Shopping Cart functionality for Park Avenue Bakery
// Handles adding items to cart, updating quantities, and checkout

// HTML-escape helper to prevent XSS when rendering user/storage data
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

class ShoppingCart {
    constructor() {
        this.items = [];
        this.MAX_QUANTITY = 99;

        // Task 1 & 3: Category caps
        this.CATEGORY_CAPS = {
            breads: { max: 4, label: 'loaves' },
            'cookies-bars': { max: 12, label: 'cookies/bars' },
            pastries: { max: 12, label: 'pastries' }
        };

        // Task 2: Large order threshold
        this.LARGE_ORDER_THRESHOLD = 10;

        this.loadCart();
        this.init();
    }

    init() {
        // Add to cart buttons
        document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.addItem(e));
        });

        // Category filters
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.filterCategory(e));
        });

        // Clear cart
        document.querySelector('.clear-cart-btn')?.addEventListener('click', () => {
            if (confirm('Are you sure you want to clear your cart?')) {
                this.clearCart();
            }
        });

        // Checkout
        document.querySelector('.checkout-btn')?.addEventListener('click', () => {
            this.checkout();
        });

        this.render();
    }

    // Task 1: Determine category from item ID
    getCategoryForItem(itemId) {
        if (itemId.startsWith('bread-') || itemId === 'test-1') return 'breads';
        if (itemId.startsWith('bar-') || itemId.startsWith('cookie-')) return 'cookies-bars';
        if (itemId.startsWith('pastry-')) return 'pastries';
        return null; // unknown category, no cap
    }

    // Task 1: Count items in a category
    getCategoryCount(category) {
        return this.items
            .filter(item => this.getCategoryForItem(item.id) === category)
            .reduce((sum, item) => sum + item.quantity, 0);
    }

    // Task 1: Check if category is at cap
    isCategoryAtCap(category) {
        if (!category || !this.CATEGORY_CAPS[category]) return false;
        return this.getCategoryCount(category) >= this.CATEGORY_CAPS[category].max;
    }

    // Task 1: Get cap message for a category
    getCategoryCapMessage(category) {
        const cap = this.CATEGORY_CAPS[category];
        if (!cap) return null;
        return `Maximum ${cap.max} ${cap.label} per order. Call us at (406) 449-8424 for larger quantities.`;
    }

    addItem(e) {
        const btn = e.currentTarget;
        const price = parseFloat(btn.dataset.price);

        // Check if pickup date has been selected
        let pickupDate = null;
        try {
            pickupDate = localStorage.getItem('pickupDate');
        } catch (e) {
            // Ignore storage errors
        }

        if (!pickupDate) {
            this.showNotification('Please select a pickup date first.');
            const dateSection = document.getElementById('pickupDateSection');
            if (dateSection) {
                dateSection.scrollIntoView({ behavior: 'smooth' });
            }
            return;
        }

        // Validate price is a positive finite number
        if (!Number.isFinite(price) || price <= 0) {
            this.showNotification('Unable to add item — invalid price.');
            return;
        }

        const itemId = btn.dataset.id;

        // Task 2: Check large order threshold
        if (this.getTotalItems() + 1 >= this.LARGE_ORDER_THRESHOLD) {
            this.showLargeOrderMessage();
            return;
        }

        // Task 1: Check category cap
        const category = this.getCategoryForItem(itemId);
        if (category && this.isCategoryAtCap(category)) {
            this.showNotification(this.getCategoryCapMessage(category));
            return;
        }

        const item = {
            id: itemId,
            name: btn.dataset.name,
            price: price,
            image: btn.dataset.image,
            quantity: 1
        };

        const existingItem = this.items.find(i => i.id === item.id);

        if (existingItem) {
            // Task 1: Check if incrementing would exceed category cap
            if (category && this.getCategoryCount(category) + 1 > this.CATEGORY_CAPS[category].max) {
                this.showNotification(this.getCategoryCapMessage(category));
                return;
            }
            if (existingItem.quantity >= this.MAX_QUANTITY) {
                this.showNotification(`Maximum quantity (${this.MAX_QUANTITY}) reached.`);
                return;
            }
            existingItem.quantity++;
        } else {
            this.items.push(item);
        }

        this.saveCart();
        this.render();
        this.showNotification(`${item.name} added to cart!`);
    }

    removeItem(id) {
        this.items = this.items.filter(item => item.id !== id);
        this.saveCart();
        this.render();
    }

    updateQuantity(id, change) {
        const item = this.items.find(i => i.id === id);
        if (item) {
            const newQty = item.quantity + change;
            if (newQty <= 0) {
                this.removeItem(id);
            } else if (change > 0) {
                // Task 2: Check large order threshold when increasing
                if (this.getTotalItems() + change >= this.LARGE_ORDER_THRESHOLD) {
                    this.showLargeOrderMessage();
                    return;
                }
                // Task 1: Check category cap when increasing
                const category = this.getCategoryForItem(id);
                if (category && this.CATEGORY_CAPS[category]) {
                    const currentCount = this.getCategoryCount(category);
                    if (currentCount + change > this.CATEGORY_CAPS[category].max) {
                        this.showNotification(this.getCategoryCapMessage(category));
                        return;
                    }
                }
                if (newQty > this.MAX_QUANTITY) {
                    this.showNotification(`Maximum quantity (${this.MAX_QUANTITY}) reached.`);
                    return;
                }
                item.quantity = newQty;
                this.saveCart();
                this.render();
            } else {
                item.quantity = newQty;
                this.saveCart();
                this.render();
            }
        }
    }

    clearCart() {
        this.items = [];
        this.saveCart();
        this.render();
    }

    getTotal() {
        return this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    }

    getTotalItems() {
        return this.items.reduce((sum, item) => sum + item.quantity, 0);
    }

    render() {
        const cartItemsContainer = document.getElementById('cartItems');
        const cartCount = document.querySelector('.cart-count');
        const totalAmount = document.querySelector('.total-amount');
        const checkoutBtn = document.querySelector('.checkout-btn');

        if (!cartItemsContainer || !cartCount || !totalAmount || !checkoutBtn) return;

        // Update cart count
        const totalItems = this.getTotalItems();
        cartCount.textContent = `${totalItems} ${totalItems === 1 ? 'item' : 'items'}`;

        // Update total
        totalAmount.textContent = `$${this.getTotal().toFixed(2)}`;

        // Task 5: Checkout button states
        if (totalItems === 0) {
            // State: Empty cart
            checkoutBtn.disabled = true;
            checkoutBtn.className = 'checkout-btn';
            checkoutBtn.innerHTML = '<i class="fas fa-credit-card"></i> Checkout';
            this.hideLargeOrderMessage();
        } else if (totalItems >= this.LARGE_ORDER_THRESHOLD) {
            // State: Large order blocked
            checkoutBtn.disabled = true;
            checkoutBtn.className = 'checkout-btn checkout-blocked';
            checkoutBtn.innerHTML = '<i class="fas fa-phone"></i> Call to Order';
            this.showLargeOrderMessage();
        } else {
            // State: Ready to checkout
            checkoutBtn.disabled = false;
            checkoutBtn.className = 'checkout-btn checkout-ready';
            checkoutBtn.innerHTML = '<i class="fas fa-credit-card"></i> Checkout';
            this.hideLargeOrderMessage();
        }

        // Render cart items
        if (this.items.length === 0) {
            cartItemsContainer.innerHTML = `
                <div class="empty-cart">
                    <i class="fas fa-shopping-cart"></i>
                    <p>Your cart is empty</p>
                </div>
            `;
        } else {
            // Build DOM safely to avoid innerHTML XSS with user data
            cartItemsContainer.innerHTML = '';
            this.items.forEach(item => {
                const cartItem = document.createElement('div');
                cartItem.className = 'cart-item';

                const imgDiv = document.createElement('div');
                imgDiv.className = 'cart-item-image';
                const img = document.createElement('img');
                img.src = item.image;
                img.alt = item.name;
                imgDiv.appendChild(img);

                const detailsDiv = document.createElement('div');
                detailsDiv.className = 'cart-item-details';

                const h4 = document.createElement('h4');
                h4.textContent = item.name;

                const priceDiv = document.createElement('div');
                priceDiv.className = 'cart-item-price';
                priceDiv.textContent = `$${item.price.toFixed(2)}`;

                const controlsDiv = document.createElement('div');
                controlsDiv.className = 'cart-item-controls';

                const minusBtn = document.createElement('button');
                minusBtn.className = 'quantity-btn';
                minusBtn.setAttribute('aria-label', `Decrease quantity of ${item.name}`);
                minusBtn.innerHTML = '<i class="fas fa-minus"></i>';
                minusBtn.addEventListener('click', () => this.updateQuantity(item.id, -1));

                const qtySpan = document.createElement('span');
                qtySpan.className = 'quantity';
                qtySpan.textContent = item.quantity;

                const plusBtn = document.createElement('button');
                plusBtn.className = 'quantity-btn';
                plusBtn.setAttribute('aria-label', `Increase quantity of ${item.name}`);
                plusBtn.innerHTML = '<i class="fas fa-plus"></i>';
                plusBtn.addEventListener('click', () => this.updateQuantity(item.id, 1));

                // Task 1: Disable plus button if category is at cap or large order threshold
                const itemCategory = this.getCategoryForItem(item.id);
                if (this.isCategoryAtCap(itemCategory) || totalItems >= this.LARGE_ORDER_THRESHOLD) {
                    plusBtn.disabled = true;
                    plusBtn.title = this.isCategoryAtCap(itemCategory) ? 'Category limit reached' : 'Order limit reached';
                }

                const removeBtn = document.createElement('button');
                removeBtn.className = 'remove-item';
                removeBtn.setAttribute('aria-label', `Remove ${item.name} from cart`);
                removeBtn.innerHTML = '<i class="fas fa-trash"></i>';
                removeBtn.addEventListener('click', () => this.removeItem(item.id));

                controlsDiv.append(minusBtn, qtySpan, plusBtn, removeBtn);
                detailsDiv.append(h4, priceDiv, controlsDiv);
                cartItem.append(imgDiv, detailsDiv);
                cartItemsContainer.appendChild(cartItem);
            });
        }

        // Task 1: Update menu "Add to Cart" buttons for category caps
        this.updateMenuButtonStates();
    }

    // Task 1: Update menu button states based on category caps
    updateMenuButtonStates() {
        const totalItems = this.getTotalItems();
        document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
            const itemId = btn.dataset.id;
            const category = this.getCategoryForItem(itemId);

            // Skip if button is already disabled by guardrails (unavailable item)
            if (btn.closest('.menu-item')?.classList.contains('unavailable')) return;

            // Check large order threshold
            if (totalItems >= this.LARGE_ORDER_THRESHOLD) {
                btn.classList.add('cap-reached');
                btn.disabled = true;
                btn.title = 'Order limit reached';
                return;
            }

            // Check category cap
            if (category && this.isCategoryAtCap(category)) {
                btn.classList.add('cap-reached');
                btn.disabled = true;
                btn.title = this.getCategoryCapMessage(category);
            } else {
                btn.classList.remove('cap-reached');
                // Only re-enable if not disabled by guardrails
                if (!btn.closest('.menu-item')?.classList.contains('unavailable')) {
                    btn.disabled = false;
                    btn.title = '';
                }
            }
        });
    }

    // Task 2 & 5: Show large order message in cart footer
    showLargeOrderMessage() {
        let msg = document.getElementById('largeOrderMsg');
        if (!msg) {
            msg = document.createElement('div');
            msg.id = 'largeOrderMsg';
            msg.className = 'large-order-message';
            msg.innerHTML = `
                <p><i class="fas fa-info-circle"></i> Orders of 10+ items require a phone call or custom order request.</p>
                <div class="large-order-actions">
                    <a href="tel:4064498424" class="btn-call"><i class="fas fa-phone"></i> (406) 449-8424</a>
                    <a href="custom-orders.html" class="btn-custom"><i class="fas fa-clipboard-list"></i> Custom Order</a>
                </div>
            `;
            const cartFooter = document.querySelector('.cart-footer');
            if (cartFooter) {
                cartFooter.insertBefore(msg, cartFooter.firstChild);
            }
        }
        msg.style.display = 'block';
    }

    // Task 2 & 5: Hide large order message
    hideLargeOrderMessage() {
        const msg = document.getElementById('largeOrderMsg');
        if (msg) msg.style.display = 'none';
    }

    filterCategory(e) {
        const category = e.target.dataset.category;

        // Update active button
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        e.target.classList.add('active');

        // Filter items - also respect availability from order guardrails
        document.querySelectorAll('.menu-item').forEach(item => {
            const matchesCategory = category === 'all' || item.dataset.category === category;
            const isUnavailable = item.classList.contains('unavailable');

            if (matchesCategory && !isUnavailable) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
    }

    checkout() {
        if (this.items.length === 0) return;

        // Task 2: Safety check for large orders
        if (this.getTotalItems() >= this.LARGE_ORDER_THRESHOLD) {
            this.showLargeOrderMessage();
            this.showNotification('Orders of 10+ items require a phone call. Please use the contact options above.');
            return;
        }

        // Get pickup date from order guardrails
        let pickupDate = null;
        try {
            pickupDate = localStorage.getItem('pickupDate');
        } catch (e) {
            // Ignore storage errors
        }

        if (!pickupDate) {
            this.showNotification('Please select a pickup date before checkout.');
            const dateSection = document.getElementById('pickupDateSection');
            if (dateSection) {
                dateSection.scrollIntoView({ behavior: 'smooth' });
            }
            return;
        }

        // Validate cart items if order guardrails is available
        if (typeof window.getOrderGuardrails === 'function') {
            const guardrails = window.getOrderGuardrails();
            if (guardrails) {
                const validation = guardrails.validateCartItems(this.items);
                if (!validation.valid) {
                    this.showNotification(validation.errors[0]);
                    return;
                }
            }
        }

        // Save order details to sessionStorage for checkout page
        try {
            sessionStorage.setItem('checkoutOrder', JSON.stringify({
                items: this.items,
                subtotal: this.getTotal(),
                pickupDate: pickupDate,
                timestamp: new Date().toISOString()
            }));
        } catch (e) {
            this.showNotification('Unable to proceed to checkout. Please try again.');
            return;
        }

        // Redirect to checkout page
        window.location.href = 'checkout.html';
    }

    showNotification(message) {
        // Simple notification
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            background: var(--terracotta);
            color: white;
            padding: 1rem 2rem;
            border-radius: 8px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.2);
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 2000);
    }

    saveCart() {
        try {
            localStorage.setItem('bakeryCart', JSON.stringify(this.items));
        } catch (e) {
            // Storage full or disabled — cart will not persist across page loads
        }
    }

    loadCart() {
        try {
            const saved = localStorage.getItem('bakeryCart');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) {
                    // Validate each item has required fields
                    this.items = parsed.filter(item =>
                        item && typeof item.id === 'string' &&
                        typeof item.name === 'string' &&
                        Number.isFinite(item.price) && item.price > 0 &&
                        Number.isFinite(item.quantity) && item.quantity > 0
                    );
                }
            }
        } catch (e) {
            this.items = [];
        }
    }
}

// Add animation CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(400px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(400px); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Initialize cart
const cart = new ShoppingCart();
