/* ==========================================================================
   Premium Animations Script
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    initReveals();
    initParallax();
    initStagger();
    init3DTilt();
    
    // We export or attach a global function to re-init tilt/stagger when new DOM is injected (e.g., API loads)
    window.PremiumAnimations = {
        init3DTilt,
        animatePriceCounter,
        initStaggerForNewItems
    };
});

/* 1. Hero Reveal */
function initReveals() {
    // We add 'reveal-blur' to elements we want to reveal, then remove it shortly after load
    const revealElements = document.querySelectorAll('.reveal-blur');
    setTimeout(() => {
        revealElements.forEach(el => el.classList.add('is-revealed'));
    }, 100);
}

/* 2. Hero Parallax & Glow */
function initParallax() {
    const heroBanner = document.getElementById('hero-banner');
    if (!heroBanner) return;

    heroBanner.addEventListener('mousemove', (e) => {
        const rect = heroBanner.getBoundingClientRect();
        const x = e.clientX - rect.left; // x position within the element.
        const y = e.clientY - rect.top;  // y position within the element.

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = ((y - centerY) / centerY) * -5; // Max 5 deg
        const rotateY = ((x - centerX) / centerX) * 5;  // Max 5 deg

        heroBanner.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
    });

    heroBanner.addEventListener('mouseleave', () => {
        heroBanner.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
    });
}

/* 3. Game Cards 3D Tilt */
function init3DTilt() {
    const cards = document.querySelectorAll('.game-card:not(.tilt-initialized)');
    
    cards.forEach(card => {
        card.classList.add('tilt-initialized', 'tilt-card');
        
        // Wrap content if not wrapped already
        if (!card.querySelector('.tilt-card-inner')) {
            const inner = document.createElement('div');
            inner.className = 'tilt-card-inner';
            while(card.firstChild) {
                inner.appendChild(card.firstChild);
            }
            card.appendChild(inner);
        }

        const innerElement = card.querySelector('.tilt-card-inner');

        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            // Max tilt angle = 8 degrees
            const rotateX = ((y - centerY) / centerY) * -8;
            const rotateY = ((x - centerX) / centerX) * 8;
            
            innerElement.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
            
            // Glare position
            innerElement.style.setProperty('--glare-x', `${(x / rect.width) * 100}%`);
            innerElement.style.setProperty('--glare-y', `${(y / rect.height) * 100}%`);
        });

        card.addEventListener('mouseleave', () => {
            innerElement.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg)`;
        });
    });
}

/* 4. Stagger Entrance */
function initStagger() {
    const observerOptions = {
        root: null,
        rootMargin: '0px 0px -50px 0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const items = entry.target.querySelectorAll('.stagger-item');
                items.forEach((item, index) => {
                    setTimeout(() => {
                        item.classList.add('is-revealed');
                    }, index * 100); // 100ms stagger between items
                });
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    const containers = document.querySelectorAll('.stagger-container');
    containers.forEach(container => observer.observe(container));
}

function initStaggerForNewItems(containerSelector) {
    const container = document.querySelector(containerSelector);
    if (!container) return;
    
    // Add stagger-item to children if they don't have it
    const children = container.querySelectorAll('.game-card');
    children.forEach((child, index) => {
        if (!child.classList.contains('stagger-item')) {
            child.classList.add('stagger-item');
            setTimeout(() => {
                child.classList.add('is-revealed');
            }, index * 80);
        }
    });
}

/* 5. Count Up Animation */
function animatePriceCounter(element, startVal, endVal, duration = 1000, prefix = '', suffix = '') {
    if (!element) return;
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        
        // easeOutQuart
        const easeProgress = 1 - Math.pow(1 - progress, 4);
        const currentVal = startVal + (endVal - startVal) * easeProgress;
        
        if (Number.isInteger(endVal)) {
            element.textContent = `${prefix}${Math.floor(currentVal)}${suffix}`;
        } else {
            element.textContent = `${prefix}${currentVal.toFixed(2)}${suffix}`;
        }
        
        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            element.textContent = `${prefix}${endVal}${suffix}`;
        }
    };
    window.requestAnimationFrame(step);
}
