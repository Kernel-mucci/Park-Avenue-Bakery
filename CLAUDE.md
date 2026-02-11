# CLAUDE.md - Park Avenue Bakery

## Project Overview

Park Avenue Bakery is a production e-commerce website for a European-style bakery in Helena, Montana. It features an online ordering system with a shopping cart, checkout flow, Clover payment gateway integration via Vercel serverless functions, and a staff prep dashboard for order management.

**Owner:** EXPO (Raymond's restaurant operations consulting company)
**Pilot Client:** Park Avenue Bakery (owned by Lindsey and Hannah)
**Purpose:** Validate the "Guardrails" philosophy—preventing operational problems through systematic constraints before they occur.

## Tech Stack

- **Frontend:** Vanilla HTML5, CSS3, JavaScript (ES6+) — no frameworks or bundlers
- **Backend:** Vercel serverless functions (Node.js) for payment processing and dashboard APIs
- **Payment:** Clover Hosted Checkout API
- **Data Storage:** Upstash Redis (checklist data persistence), localStorage/sessionStorage (cart)
- **Hosting:** Vercel
- **External CDN:** Google Fonts (Cormorant Garamond, Questrial), Font Awesome 6.4.0, Elfsight (Instagram widget)

There is no package.json, no build step, and no NPM dependencies in the frontend. All code is vanilla.

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
├── custom-orders.html         # Custom orders page (cakes + catering via Formspree)
├── gallery.html               # Image gallery
│
├── styles.css                 # Main stylesheet (~2,760 lines)
├── menu-styles.css            # Supplemental menu section styles
├── dashboard.css              # Prep dashboard styles
│
├── script.js                  # Site-wide JS (nav, scroll effects, animations)
├── cart.js                    # ShoppingCart class (add/remove, localStorage, guardrails)
├── checkout.js                # CheckoutManager class (form, payment API call)
├── confirmation.js            # OrderConfirmation class (display order details)
├── order-guardrails.js        # Order validation rules (advance notice, cutoffs, limits)
├── order-rules.js             # Shared order rules configuration
│
├── dashboard.js               # Prep dashboard logic
├── checklists.js              # Checklist hub page logic
├── checklist-flow.js          # Individual checklist completion flow
├── history.js                 # Checklist history view
│
├── api/
│   ├── create-checkout.js     # Vercel serverless: creates Clover checkout session
│   ├── webhook.js             # Vercel serverless: handles Clover payment webhooks
│   └── prep-dashboard/        # Dashboard API endpoints
│       ├── index.js           # Bake list & pickup schedule
│       ├── orders.js          # Order management
│       ├── auth.js            # Dashboard authentication
│       └── checklists/        # Checklist APIs
│
├── dashboard/
│   ├── login.html             # Dashboard login page
│   ├── index.html             # Main dashboard (bake list + pickup schedule)
│   ├── checklists.html        # Checklist hub
│   ├── checklist.html         # Checklist completion flow
│   └── history.html           # Checklist history
│
├── images/                    # All site images
├── README.md                  # Setup and integration guide
└── CLAUDE.md                  # This file
```

## Completed Features

### E-Commerce & Ordering System ✅

- Full shopping cart with localStorage persistence
- 41 products across categories: breads, pastries, cakes, sandwiches, breakfast, desserts, drinks
- Category filtering on menu page
- Checkout flow with customer info and pickup scheduling
- Clover payment integration via Vercel serverless functions
- Order confirmation page

### Order Guardrails ✅

- **Specialty bread 24-hour notice:** Sourdough, ciabatta, multigrain require advance ordering
- **Same-day cutoff:** Orders can't be placed too late for next-day prep
- **Pickup date minimum:** Tomorrow is earliest selectable date
- **Per-order category caps:**
  - Breads: max 4 loaves per order
  - Cookies/Bars: max 12 items per order
  - Pastries: max 12 items per order (future use)
- **Large order redirect:** 10+ items blocks checkout, directs to phone/custom orders
- **Cart re-validation:** When pickup date changes, unavailable items auto-removed

### Custom Orders ✅

- Dedicated page for custom cake orders and catering requests
- Formspree integration for form submissions

### Menu Enhancements ✅

- Specialty bread highlighting with visual indicators
- Advance notice badges on applicable items

### Staff Prep Dashboard ✅

- Password-protected access (DASHBOARD_PASSWORD env var)
- Today's bake list pulled from orders
- Pickup schedule with customer details
- Auto-refresh functionality
- "Mark Ready" button per order
- Printable pickup sheets

### LineCheck Checklists ✅

- 5 daily checklists seeded:
  - Baker Opening (4am) - 12 items
  - Pastry Opening (5am) - 9 items
  - FOH Opening (6:30am) - 13 items
  - Closing (5:30pm) - 19 items
  - Night Prep (5pm) - 6 items
- Item types: checkbox, number (with unit), photo, select, text
- Temperature alerts (cooler >40°F, freezer >0°F, proofer outside 75-85°F)
- Photo proof requirements
- Mobile-optimized UI with 64px touch targets
- Data persistence via Upstash Redis

## Architecture & Data Flow

### Ordering Flow

1. **menu.html + cart.js** — User browses items, adds to cart. Cart state stored in `localStorage` under key `bakeryCart`.
2. **Order guardrails** — Rules enforced in `cart.js`: specialty bread notices, category caps, total item limits.
3. **checkout.html + checkout.js** — Cart data transferred via `sessionStorage` (key `checkoutOrder`). User fills contact/pickup form. On submit, POST to `/api/create-checkout`.
4. **api/create-checkout.js** — Vercel function creates Clover checkout session, returns redirect URL.
5. **Clover Hosted Checkout** — User completes payment on Clover's hosted page.
6. **order-confirmation.html + confirmation.js** — Displays order details, clears cart/checkout data.

### Dashboard Flow

1. **dashboard/login.html** — Staff enters password (env var `DASHBOARD_PASSWORD`)
2. **dashboard/index.html** — Shows today's bake list and pickup schedule from API
3. **dashboard/checklists.html** — Hub showing today's available checklists with status
4. **dashboard/checklist.html?id=[templateId]** — Completion flow, one section at a time
5. **dashboard/history.html** — View past completions with filters

### Data Storage

| Data | Storage | Key/Location |
|------|---------|--------------|
| Shopping cart | localStorage | `bakeryCart` |
| Checkout order | sessionStorage | `checkoutOrder` |
| Completed order | sessionStorage | `completedOrder` |
| Checklist completions | Upstash Redis | API-managed |
| Dashboard auth | sessionStorage | `dashboardAuth` |

## Code Conventions

### JavaScript

- **Class-based OOP** — Core logic in classes: `ShoppingCart`, `CheckoutManager`, `OrderConfirmation`
- **Pattern:** Constructor calls `init()` method for DOM setup and event listeners
- **DOM manipulation:** `innerHTML` template literals for rendering; `classList` for state
- **Async/await** for all API calls
- **No modules/imports** — Scripts loaded via `<script>` tags
- **Storage keys:** `bakeryCart` (localStorage), `checkoutOrder`/`completedOrder` (sessionStorage)

### CSS

- **CSS custom properties** on `:root`:
  - `--cream: #FAF7F0` (primary background)
  - `--warm-brown: #8B6F47` (secondary text)
  - `--deep-brown: #4A3422` (primary text/headings)
  - `--terracotta: #C97C5D` (accent/CTA color)
  - `--sage: #A4B494` (subtle accents)
  - `--butter: #F4E4C1` (section backgrounds)
  - `--light-sage: #D4E2D4` (background variation)
- **BEM-inspired naming** — e.g., `.menu-item`, `.menu-item-image`, `.cart-item-controls`
- **Layout:** CSS Grid and Flexbox
- **Responsive breakpoints:** 1024px (tablet), 768px (mobile)
- **Dashboard-specific:** 64px minimum touch targets, 18px minimum body text

### HTML

- Semantic elements: `<header>`, `<nav>`, `<section>`, `<footer>`
- Data attributes: `data-id`, `data-category`, `data-price`, `data-name`, `data-image`
- Font Awesome icons: `<i class="fas fa-*">`

## Environment Variables (Vercel)

| Variable | Purpose |
|----------|---------|
| `CLOVER_API_KEY` | Clover API key (server-side only) |
| `CLOVER_MERCHANT_ID` | Clover merchant ID |
| `DASHBOARD_PASSWORD` | Staff dashboard access |
| `KV_REST_API_URL` | Upstash Redis connection URL |
| `KV_REST_API_TOKEN` | Upstash Redis auth token |

## Key Files Reference

| File | Purpose | Key Export |
|------|---------|------------|
| `cart.js` | Cart logic, localStorage, filtering, guardrails | `ShoppingCart` |
| `checkout.js` | Form validation, Clover API integration | `CheckoutManager` |
| `order-guardrails.js` | Order validation rules | validation functions |
| `dashboard.js` | Prep dashboard bake list/pickup | (procedural) |
| `checklists.js` | Checklist hub page | (procedural) |
| `checklist-flow.js` | Checklist completion UI | (procedural) |
| `api/create-checkout.js` | Create Clover sessions | `handler(req, res)` |
| `api/webhook.js` | Payment webhooks | `handler(req, res)` |

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

Categories: `breads`, `pastries`, `cakes`, `sandwiches`, `cookies`, `bars`, `breakfast`, `desserts`, `drinks`

### Adding a specialty bread (requires advance notice)

Add `data-specialty="true"` to the button and include the notice badge in the item.

### Modifying order guardrails

Edit `cart.js` — look for `CATEGORY_CAPS` and `LARGE_ORDER_THRESHOLD` constants.

### Changing pickup time slots

Edit the `<select>` dropdown in `checkout.html`.

### Adding a new checklist

Add template to the `CHECKLIST_TEMPLATES` object in the checklists API.

## Notes for AI Assistants

- **No build step or package manager.** Do not introduce one unless explicitly requested.
- All JS runs in browser via `<script>` tags — no ES modules, imports, or bundling.
- Montana has no sales tax — `TAX_RATE = 0` is intentional.
- Dashboard password stored in env var `DASHBOARD_PASSWORD`.
- Checklist data persists in Upstash Redis, not localStorage (serverless function lifecycle issue).
- Image assets are in `/images/` with relative paths.
- Responsive design — always test at 1024px and 768px breakpoints.
- Dashboard touch targets — minimum 64px for kitchen environment (gloved hands).
- When editing HTML — maintain consistent header/footer across all pages.
- Order guardrails implemented: specialty bread notice, date restrictions, category caps, large order redirect.
