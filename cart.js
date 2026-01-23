// Shopping Cart functionality for Park Avenue Bakery
// Handles adding items to cart, updating quantities, and checkout

class ShoppingCart {
    constructor() {
        this.items = [];
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
        const item = {
            id: btn.dataset.id,
            name: btn.dataset.name,
            price: parseFloat(btn.dataset.price),
            image: btn.dataset.image,
            quantity: 1
        };

        const existingItem = this.items.find(i => i.id === item.id);
        
        if (existingItem) {
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
            item.quantity += change;
            if (item.quantity <= 0) {
                this.removeItem(id);
            } else {
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
            cartItemsContainer.innerHTML = this.items.map(item => `
                <div class="cart-item">
                    <div class="cart-item-image">
                        <img src="${item.image}" alt="${item.name}">
                    </div>
                    <div class="cart-item-details">
                        <h4>${item.name}</h4>
                        <div class="cart-item-price">$${item.price.toFixed(2)}</div>
                        <div class="cart-item-controls">
                            <button class="quantity-btn" onclick="cart.updateQuantity('${item.id}', -1)">
                                <i class="fas fa-minus"></i>
                            </button>
                            <span class="quantity">${item.quantity}</span>
                            <button class="quantity-btn" onclick="cart.updateQuantity('${item.id}', 1)">
                                <i class="fas fa-plus"></i>
                            </button>
                            <button class="remove-item" onclick="cart.removeItem('${item.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `).join('');
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
        sessionStorage.setItem('checkoutOrder', JSON.stringify({
            items: this.items,
            subtotal: this.getTotal(),
            timestamp: new Date().toISOString()
        }));
        
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
        localStorage.setItem('bakeryCart', JSON.stringify(this.items));
    }

    loadCart() {
        const saved = localStorage.getItem('bakeryCart');
        if (saved) {
            this.items = JSON.parse(saved);
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
