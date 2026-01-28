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

    addItem(e) {
        const btn = e.currentTarget;
        const price = parseFloat(btn.dataset.price);

        // Validate price is a positive finite number
        if (!Number.isFinite(price) || price <= 0) {
            this.showNotification('Unable to add item — invalid price.');
            return;
        }

        const item = {
            id: btn.dataset.id,
            name: btn.dataset.name,
            price: price,
            image: btn.dataset.image,
            quantity: 1
        };

        const existingItem = this.items.find(i => i.id === item.id);

        if (existingItem) {
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
            } else if (newQty > this.MAX_QUANTITY) {
                this.showNotification(`Maximum quantity (${this.MAX_QUANTITY}) reached.`);
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

        // Enable/disable checkout button
        checkoutBtn.disabled = this.items.length === 0;

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
    }

    filterCategory(e) {
        const category = e.target.dataset.category;

        // Update active button
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        e.target.classList.add('active');

        // Filter items
        document.querySelectorAll('.menu-item').forEach(item => {
            if (category === 'all' || item.dataset.category === category) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
    }

    checkout() {
        if (this.items.length === 0) return;

        // Save order details to sessionStorage for checkout page
        try {
            sessionStorage.setItem('checkoutOrder', JSON.stringify({
                items: this.items,
                subtotal: this.getTotal(),
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
