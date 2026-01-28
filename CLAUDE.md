# CLAUDE.md - Park Avenue Bakery

## Project Overview

Park Avenue Bakery is a production e-commerce website for a European-style bakery in Helena, Montana. It features an online ordering system with a shopping cart, checkout flow, and Clover payment gateway integration via Vercel serverless functions.

## Tech Stack

- **Frontend:** Vanilla HTML5, CSS3, JavaScript (ES6+) — no frameworks or bundlers
- **Backend:** Vercel serverless functions (Node.js) for payment processing
- **Payment:** Clover Hosted Checkout API
- **Hosting:** Vercel
- **State:** localStorage (cart persistence), sessionStorage (checkout flow)
- **External CDN:** Google Fonts (Cormorant Garamond, Questrial), Font Awesome 6.4.0, Elfsight (Instagram widget)

There is no package.json, no build step, and no NPM dependencies. All code is vanilla.

## Repository Structure

```
/
├── index.html                 # Homepage (hero, specials, menu preview, CTA)
├── menu.html                  # Menu page with ordering system + cart sidebar
├── checkout.html              # Checkout form (contact, pickup, order summary)
├── order-confirmation.html    # Post-payment confirmation page
├── about.html                 # About page (story, philosophy, team)
├── contact.html               # Contact form page
├── cakes.html                 # Custom cakes showcase
├── gallery.html               # Image gallery
│
├── styles.css                 # Main stylesheet (~2,760 lines)
├── menu-styles.css            # Supplemental menu section styles (~104 lines)
│
├── script.js                  # Site-wide JS (nav, scroll effects, animations)
├── cart.js                    # ShoppingCart class (add/remove, localStorage)
├── checkout.js                # CheckoutManager class (form, payment API call)
├── confirmation.js            # OrderConfirmation class (display order details)
│
├── api/
│   ├── create-checkout.js     # Vercel serverless: creates Clover checkout session
│   └── webhook.js             # Vercel serverless: handles Clover payment webhooks
│
├── images/                    # All site images (22 files)
├── README.md                  # Setup and integration guide
└── CLAUDE.md                  # This file
```

## Architecture & Data Flow

### Ordering Flow

1. **menu.html + cart.js** — User browses items, adds to cart. Cart state stored in `localStorage` under key `bakeryCart`.
2. **checkout.html + checkout.js** — Cart data transferred via `sessionStorage` (key `checkoutOrder`). User fills contact/pickup form. On submit, a POST is made to `/api/create-checkout`.
3. **api/create-checkout.js** — Vercel function reads `CLOVER_API_KEY` and `CLOVER_MERCHANT_ID` from environment variables, creates a Clover checkout session, returns a redirect URL.
4. **Clover Hosted Checkout** — User completes payment on Clover's hosted page.
5. **order-confirmation.html + confirmation.js** — Displays order details from `sessionStorage` (key `completedOrder`), then clears cart/checkout data.

### Webhook

`api/webhook.js` receives Clover payment events (`payment.created`, `payment.failed`, `payment.refunded`). Currently a stub with TODO comments for email notifications and database updates.

## Code Conventions

### JavaScript

- **Class-based OOP** — Core logic lives in classes: `ShoppingCart`, `CheckoutManager`, `OrderConfirmation`
- **Pattern:** Constructor calls an `init()` method that sets up DOM references and event listeners
- **DOM manipulation:** Direct `innerHTML` template literals for rendering; `classList` for state
- **Async/await** for all API calls (payment processing)
- **No modules/imports** — All scripts loaded via `<script>` tags in HTML; classes instantiated on `DOMContentLoaded` or page load
- **Storage keys:** `bakeryCart` (localStorage), `checkoutOrder` and `completedOrder` (sessionStorage)

### CSS

- **CSS custom properties** defined on `:root`:
  - `--cream: #FAF7F0` (primary background)
  - `--warm-brown: #8B6F47` (secondary text)
  - `--deep-brown: #4A3422` (primary text/headings)
  - `--terracotta: #C97C5D` (accent/CTA color)
  - `--sage: #A4B494` (subtle accents)
  - `--butter: #F4E4C1` (section backgrounds)
  - `--light-sage: #D4E2D4` (background variation)
- **BEM-inspired naming** — e.g., `.menu-item`, `.menu-item-image`, `.menu-item-content`
- **Layout:** CSS Grid and Flexbox
- **Responsive breakpoints:** `max-width: 1024px` (tablet), `max-width: 768px` (mobile)
- **Animations:** `@keyframes` for scroll reveal, transitions on hover/interactions
- **z-index layers:** header at `1000`, modals/overlays at `10000`

### HTML

- Semantic elements: `<header>`, `<nav>`, `<section>`, `<footer>`
- Data attributes for JS interaction: `data-id`, `data-category`, `data-price`, `data-name`, `data-image`, `data-scroll-reveal`, `data-delay`
- Font Awesome icons via `<i class="fas fa-*">`
- ARIA labels on social links and interactive elements

## Environment Variables (Vercel)

Required for payment processing:

- `CLOVER_API_KEY` — Clover API public key
- `CLOVER_MERCHANT_ID` — Clover merchant identifier

These are read server-side only in `api/create-checkout.js`. Never expose them in frontend code.

## Key Files to Know

| File | What it does | Key class/export |
|------|-------------|-----------------|
| `cart.js` | Cart logic, localStorage, category filtering, toast notifications | `ShoppingCart` |
| `checkout.js` | Form validation, order summary, Clover API integration | `CheckoutManager` |
| `confirmation.js` | Renders order confirmation, clears session data | `OrderConfirmation` |
| `script.js` | Nav toggle, scroll effects, parallax, lazy loading, form validation | (procedural) |
| `styles.css` | All site styles including ordering system | N/A |
| `api/create-checkout.js` | Serverless endpoint to create Clover checkout sessions | `handler(req, res)` |
| `api/webhook.js` | Receives Clover payment event webhooks | `handler(req, res)` |

## Common Tasks

### Adding a new menu item

Add to `menu.html` inside `.menu-items-grid`:

```html
<div class="menu-item" data-category="breads">
    <div class="menu-item-image">
        <img src="images/your-image.jpg" alt="Item Name">
    </div>
    <div class="menu-item-content">
        <h3>Item Name</h3>
        <p>Description text</p>
        <div class="menu-item-footer">
            <span class="price">$9.99</span>
            <button class="add-to-cart-btn"
                    data-id="unique-id"
                    data-name="Item Name"
                    data-price="9.99"
                    data-image="images/your-image.jpg">
                <i class="fas fa-cart-plus"></i> Add to Cart
            </button>
        </div>
    </div>
</div>
```

The `data-id` must be unique. The `data-category` must match one of the filter buttons (breads, pastries, cakes, sandwiches).

### Changing the tax rate

Edit `checkout.js` — the `TAX_RATE` property is set to `0` (Montana has no sales tax). Change it in the `CheckoutManager` constructor.

### Modifying pickup time slots

Edit the `<select>` dropdown in `checkout.html`. Time slots are hardcoded as `<option>` elements.

### Adding a new page

1. Create the HTML file following the structure of existing pages (page hero, content sections, footer)
2. Link `styles.css` and `script.js` in `<head>` / before `</body>`
3. Add navigation link in the `<header>` of all pages

## Deployment

The site deploys to Vercel. The `api/` directory is automatically detected as serverless functions. No build configuration needed — Vercel serves the static files directly.

## Notes for AI Assistants

- There is **no build step or package manager**. Do not introduce one unless explicitly requested.
- All JS runs in the browser via `<script>` tags — there are no ES modules, imports, or bundling.
- The `styles.css` file is large (~2,760 lines). Ordering/checkout styles are at the bottom. `menu-styles.css` is a smaller supplemental file.
- The Clover API integration uses Vercel serverless functions to keep API keys secure. Frontend code never accesses Clover credentials directly.
- Montana has no sales tax — `TAX_RATE = 0` is intentional, not a bug.
- The webhook handler (`api/webhook.js`) is a stub. Email and database integrations are not yet implemented.
- Image assets are in `/images/` and referenced with relative paths.
- The site is fully responsive with breakpoints at 1024px and 768px.
- When editing HTML pages, maintain consistent header/footer across all pages.
