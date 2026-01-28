// Mobile Menu Toggle
const mobileToggle = document.querySelector('.mobile-toggle');
const navLinks = document.querySelector('.nav-links');

if (mobileToggle) {
    mobileToggle.addEventListener('click', () => {
        mobileToggle.classList.toggle('active');
        navLinks.classList.toggle('active');
    });

    // Close menu when clicking a link
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', () => {
            mobileToggle.classList.remove('active');
            navLinks.classList.remove('active');
        });
    });
}

// Throttle helper — ensures callback runs at most once per animation frame
function throttleRAF(fn) {
    let ticking = false;
    return function() {
        if (!ticking) {
            ticking = true;
            requestAnimationFrame(() => {
                fn();
                ticking = false;
            });
        }
    };
}

// Header Scroll Effect
const header = document.getElementById('header');

const handleHeaderScroll = () => {
    const currentScroll = window.pageYOffset;
    if (currentScroll > 100) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
};

// Smooth Scroll for Anchor Links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Scroll Reveal Animation
const revealElements = document.querySelectorAll('[data-scroll-reveal]');

const revealOnScroll = () => {
    revealElements.forEach(element => {
        const elementTop = element.getBoundingClientRect().top;
        const elementBottom = element.getBoundingClientRect().bottom;
        const windowHeight = window.innerHeight;

        if (elementTop < windowHeight - 100 && elementBottom > 0) {
            element.classList.add('revealed');
        }
    });
};

// Parallax Effect for Hero
const heroOverlay = document.querySelector('.hero-overlay');

const handleParallax = () => {
    if (heroOverlay) {
        const scrolled = window.pageYOffset;
        const parallaxSpeed = 0.5;
        heroOverlay.style.transform = `translateY(${scrolled * parallaxSpeed}px)`;
    }
};

// Single throttled scroll handler instead of three separate listeners
const onScroll = throttleRAF(() => {
    handleHeaderScroll();
    revealOnScroll();
    handleParallax();
});

window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('load', revealOnScroll);
revealOnScroll(); // Initial check

// Tilt Effect for Feature Cards
const tiltElements = document.querySelectorAll('[data-tilt]');

tiltElements.forEach(element => {
    element.addEventListener('mouseenter', function() {
        this.style.transition = 'transform 0.1s ease-out';
    });

    element.addEventListener('mousemove', function(e) {
        const rect = this.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = (y - centerY) / 20;
        const rotateY = (centerX - x) / 20;

        this.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-10px)`;
    });

    element.addEventListener('mouseleave', function() {
        this.style.transition = 'transform 0.4s ease';
        this.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateY(0)';
    });
});

// Lazy Loading Images
const lazyImages = document.querySelectorAll('img[data-src]');

const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
            observer.unobserve(img);
        }
    });
});

lazyImages.forEach(img => imageObserver.observe(img));

// Counter Animation for Stats
const animateCounters = () => {
    const counters = document.querySelectorAll('.stat-number');

    counters.forEach(counter => {
        const target = counter.textContent;

        // Only animate numbers
        if (!isNaN(parseInt(target))) {
            const updateCount = () => {
                const count = parseInt(counter.textContent);
                const increment = Math.ceil(parseInt(target) / 50);

                if (count < parseInt(target)) {
                    counter.textContent = count + increment;
                    setTimeout(updateCount, 30);
                } else {
                    counter.textContent = target;
                }
            };

            // Reset and start animation when visible
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        counter.textContent = '0';
                        updateCount();
                        observer.unobserve(counter);
                    }
                });
            });

            observer.observe(counter);
        }
    });
};

// Initialize counter animation
animateCounters();

// Form Validation (for contact page)
const contactForm = document.getElementById('contact-form');

if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const message = document.getElementById('message').value;

        // Basic validation
        if (name && email && message) {
            // Show success message
            alert('Thank you for your message! We\'ll get back to you soon.');
            contactForm.reset();
        } else {
            alert('Please fill in all fields.');
        }
    });
}

// Add loading animation
window.addEventListener('load', () => {
    document.body.classList.add('loaded');
});

// Cursor Follow Effect (subtle)
let cursor = document.querySelector('.custom-cursor');
if (!cursor) {
    cursor = document.createElement('div');
    cursor.className = 'custom-cursor';
    document.body.appendChild(cursor);
}

document.addEventListener('mousemove', (e) => {
    cursor.style.left = e.clientX + 'px';
    cursor.style.top = e.clientY + 'px';
});

// Add hover effects to interactive elements
const interactiveElements = document.querySelectorAll('a, button, .feature-card, .menu-category, .instagram-card');

interactiveElements.forEach(element => {
    element.addEventListener('mouseenter', () => {
        cursor.classList.add('hover');
    });

    element.addEventListener('mouseleave', () => {
        cursor.classList.remove('hover');
    });
});
