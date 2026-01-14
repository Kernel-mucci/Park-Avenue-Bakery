# Park Avenue Bakery Website

A modern, multi-page website for Park Avenue Bakery in Helena, Montana, featuring their official logo and brand identity.

## Features

- 6 responsive pages (Home, About, Menu, Custom Cakes, Gallery, Contact)
- Official Park Avenue Bakery logo in navigation
- Modern animations and scroll effects
- European artisan bakery aesthetic
- Mobile-friendly navigation
- Smooth scrolling and parallax effects

## Files Included

**HTML Pages:**
- `index.html` - Home page with hero, features, specials, and menu preview
- `about.html` - Bakery history and philosophy  
- `menu.html` - Complete menu by category
- `cakes.html` - Custom cakes information
- `gallery.html` - Photo gallery
- `contact.html` - Location and contact information

**Styling:**
- `styles.css` - Main stylesheet with logo styling
- `menu-styles.css` - Menu-specific styles

**JavaScript:**
- `script.js` - Animations and interactions

**Assets:**
- `images/Bakery-logo-color.png` - Official bakery logo

## Quick Start with GitHub Pages

### 1. Create Repository
- Go to github.com and create new repository
- Name it `park-avenue-bakery` (or any name)
- Make it **Public**

### 2. Upload Files
- Click "uploading an existing file"
- **Important:** Upload the entire `images` folder with the logo
- Drag all HTML, CSS, and JS files
- Click "Commit changes"

### 3. Enable GitHub Pages
- Go to repository **Settings**
- Click **Pages** in left sidebar
- Under "Source", select **main** branch
- Click **Save**

### 4. Visit Your Site!
After 1-2 minutes, your site will be live at:
```
https://YOUR-USERNAME.github.io/park-avenue-bakery/
```

## File Structure

```
park-avenue-bakery/
├── index.html
├── about.html
├── menu.html
├── cakes.html
├── gallery.html
├── contact.html
├── styles.css
├── menu-styles.css
├── script.js
├── images/
│   └── Bakery-logo-color.png
└── README.md
```

## Customization

### Replace Placeholder Images
All content images currently use Unsplash placeholders. To add real photos:

1. Add your photos to the `images` folder
2. Update image sources in HTML files:
   ```html
   <!-- Change from: -->
   <img src="https://images.unsplash.com/photo-..." alt="...">
   
   <!-- To: -->
   <img src="images/your-photo.jpg" alt="...">
   ```

### Update Contact Info
Current information (verify and update if needed):
- **Phone:** (406) 449-8424
- **Address:** 44 South Park Avenue, Helena, MT 59601
- **Hours:** Mon–Sat 7am–5:30pm, Sun 8am–2pm
- **Online ordering:** https://www.parkavenuebakery.net/shop/
- **Instagram:** @parkavenuebakery

Search and replace these values across all HTML files.

### Logo Customization
The logo is styled in `styles.css`. Current settings:
- Desktop: 60px height
- Mobile: 50px height
- Hover effect with slight scale and opacity change

To adjust logo size, edit the `.logo img` styles in `styles.css`.

### Color Scheme
Edit CSS variables in `styles.css`:
- **Cream:** #FAF7F0
- **Warm Brown:** #8B6F47
- **Deep Brown:** #4A3422
- **Terracotta:** #C97C5D
- **Sage:** #A4B494
- **Butter:** #F4E4C1

## Adding More Photos

To add a photo gallery or replace images:

1. Add photos to the `images` folder with descriptive names:
   - `bread-sourdough.jpg`
   - `pastry-croissant.jpg`
   - `cake-wedding-1.jpg`
   etc.

2. Update the HTML in gallery.html or other pages:
   ```html
   <img src="images/bread-sourdough.jpg" alt="Fresh sourdough bread">
   ```

## Custom Domain (Optional)

To use your own domain (like parkavenuebakery.com):

1. **Buy domain** from Namecheap, Google Domains, etc.

2. **Create CNAME file** in your repository:
   - Create new file named `CNAME` (no extension)
   - Inside, put just your domain: `parkavenuebakery.com`

3. **Update DNS records** at your domain registrar:
   ```
   Type: A     Name: @    Value: 185.199.108.153
   Type: A     Name: @    Value: 185.199.109.153
   Type: A     Name: @    Value: 185.199.110.153
   Type: A     Name: @    Value: 185.199.111.153
   Type: CNAME Name: www  Value: YOUR-USERNAME.github.io
   ```

4. **Wait 24-48 hours** for DNS propagation

## Browser Support

- ✅ Chrome, Firefox, Safari, Edge (latest versions)
- ✅ Fully responsive on mobile devices
- ✅ Works on tablets and all screen sizes

## Technical Details

**Fonts:** Google Fonts (Cormorant Garamond, Questrial)
**Images:** Logo included, content images are placeholders
**Hosting:** Optimized for GitHub Pages
**Performance:** Fast loading with CSS animations

## Troubleshooting

**Logo not showing:**
- Make sure `images` folder was uploaded to GitHub
- Check that `Bakery-logo-color.png` is in the `images` folder
- Verify the path in HTML is `images/Bakery-logo-color.png`

**Images not loading:**
- Check file paths are correct
- Make sure images are in the `images` folder
- File names are case-sensitive (use lowercase)

**Animations not working:**
- Make sure `script.js` was uploaded
- Check browser console (F12) for errors
- Try hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

## Support

Park Avenue Bakery
44 South Park Avenue
Helena, MT 59601
(406) 449-8424

Website created 2026
