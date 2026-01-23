# Park Avenue Bakery - Online Ordering System

Complete ordering system with shopping cart, checkout, and Clover payment integration for Park Avenue Bakery website.

## 📁 Files Included

### HTML Files
- `menu.html` - Menu page with product listings and shopping cart
- `checkout.html` - Checkout page with customer information form
- `order-confirmation.html` - Order confirmation page after payment

### JavaScript Files
- `cart.js` - Shopping cart functionality (add/remove items, quantities, localStorage persistence)
- `checkout.js` - Checkout process and Clover payment integration
- `confirmation.js` - Order confirmation display

### CSS Files
- `ordering-styles.css` - All styles for the ordering system

## 🚀 Setup Instructions

### 1. File Placement
Copy all files to your website root directory:
```
your-website/
├── menu.html
├── checkout.html
├── order-confirmation.html
├── cart.js
├── checkout.js
├── confirmation.js
├── ordering-styles.css
└── styles.css (your existing styles)
```

### 2. Add CSS to Your Main Stylesheet
Add this line to your `styles.css` or `<head>` section:
```html
<link rel="stylesheet" href="ordering-styles.css">
```

Or copy the contents of `ordering-styles.css` and paste into your existing `styles.css` file.

### 3. Update Navigation Links
Make sure your header navigation includes a link to the menu:
```html
<a href="menu.html" class="btn-nav">Order Online</a>
```

### 4. Configure Clover Integration

#### Get Clover Credentials
1. Sign up for a Clover account: https://www.clover.com/
2. Get your API credentials from the Clover dashboard:
   - Merchant ID
   - API Key (Public Key)

#### Update checkout.js
Open `checkout.js` and replace these values (lines 10-11):
```javascript
this.CLOVER_API_KEY = 'YOUR_ACTUAL_CLOVER_PUBLIC_KEY';
this.CLOVER_MERCHANT_ID = 'YOUR_ACTUAL_MERCHANT_ID';
```

#### Configure Clover Webhook (Optional)
Set up a webhook in your Clover dashboard to receive payment confirmations:
- Endpoint URL: `https://yourwebsite.com/webhook/clover`
- Events: Payment successful, Payment failed

#### Set Return URL
In your Clover dashboard, configure the return URL to:
```
https://yourwebsite.com/order-confirmation.html
```

### 5. Server-Side Integration (Production)

For production use, you should implement server-side payment processing:

1. Create a server endpoint (Node.js example):
```javascript
// server.js
app.post('/api/create-checkout', async (req, res) => {
  const { orderData } = req.body;
  
  // Create Clover charge
  const response = await fetch('https://checkout.clover.com/v1/charges', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.CLOVER_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      amount: orderData.amount,
      currency: 'usd',
      // ... other data
    })
  });
  
  const result = await response.json();
  res.json({ checkoutUrl: result.hosted_checkout_url });
});
```

2. Update `checkout.js` to call your server:
```javascript
async createCloverCheckout(orderData) {
  const response = await fetch('/api/create-checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderData })
  });
  
  const { checkoutUrl } = await response.json();
  window.location.href = checkoutUrl;
}
```

## 🎨 Customization

### Adding Menu Items
Edit `menu.html` and add more items following this pattern:
```html
<div class="menu-item" data-category="breads">
    <div class="menu-item-image">
        <img src="your-image.jpg" alt="Product Name">
    </div>
    <div class="menu-item-content">
        <h3>Product Name</h3>
        <p>Product description</p>
        <div class="menu-item-footer">
            <span class="price">$9.99</span>
            <button class="add-to-cart-btn" 
                    data-id="unique-id" 
                    data-name="Product Name" 
                    data-price="9.99"
                    data-image="your-image.jpg">
                <i class="fas fa-cart-plus"></i> Add to Cart
            </button>
        </div>
    </div>
</div>
```

### Changing Tax Rate
Montana has no sales tax, so tax is set to 0. If you need to add tax for another location, edit `checkout.js` line 9:
```javascript
this.TAX_RATE = 0.08; // Change to your tax rate (e.g., 0.06 for 6%)
```

### Modifying Pickup Times
Edit `checkout.html` to add or remove time slots in the pickup time dropdown.

### Styling Adjustments
All ordering system styles are in `ordering-styles.css`. Common customizations:
- Colors: Update CSS variables in your main `styles.css`
- Cart sidebar width: Change `grid-template-columns: 1fr 400px` in `.menu-layout`
- Item grid columns: Adjust `minmax(300px, 1fr)` in `.menu-items-grid`

## 📱 Features

✅ Shopping cart with localStorage persistence
✅ Add/remove items, update quantities
✅ Category filtering
✅ Customer information form
✅ Pickup date/time selection
✅ No sales tax (Montana)
✅ Clover payment integration
✅ Order confirmation page
✅ Fully responsive design
✅ Toast notifications
✅ Form validation

## 🐛 Troubleshooting

### Cart not persisting
- Check browser localStorage is enabled
- Clear browser cache and try again

### Checkout button not working
- Verify all JavaScript files are loaded
- Check browser console for errors
- Ensure Clover credentials are set

### Styles not applying
- Verify `ordering-styles.css` is linked in HTML
- Check for CSS conflicts with existing styles
- Clear browser cache

### Payment not processing
- Verify Clover API credentials
- Check Clover dashboard for test mode settings
- Review browser console for API errors

## 📞 Support

For issues with:
- **Clover Integration**: https://docs.clover.com/
- **Website Code**: Check browser console for errors
- **General Questions**: Contact Park Avenue Bakery

## 📝 Notes

- The current checkout.js includes a simulation mode for testing
- For production, implement proper server-side Clover integration
- Test thoroughly in Clover sandbox mode before going live
- Consider adding email notifications for orders
- Implement order management system for bakery staff

## 🔒 Security Considerations

- Never expose secret API keys in frontend code
- Use environment variables for sensitive data
- Implement HTTPS for production
- Validate all user inputs server-side
- Use Clover's hosted checkout for PCI compliance

## 📄 License

Copyright © 2026 Park Avenue Bakery. All rights reserved.
