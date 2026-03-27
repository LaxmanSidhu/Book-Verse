/**
 * BookVerse - Home Page Script
 * Handles dynamic person cards generation from config.js
 */

/**
 * Initialize navbar and dynamic cards on page load
 */
document.addEventListener('DOMContentLoaded', () => {
    generatePersonCards();
    generateReadListSection();
    initializeNavbar();
    fadeInAnimation();
});

/**
 * Generate person cards dynamically from SHEETS configuration
 */
function generatePersonCards() {
    const cardsGrid = document.getElementById('cardsGrid');
    
    if (!cardsGrid) return;
    
    // Clear existing cards
    cardsGrid.innerHTML = '';
    
    // Iterate through SHEETS configuration and create cards (exclude read_list)
    Object.entries(SHEETS).forEach(([key, person]) => {
        if (key !== 'read_list') {
            const card = createPersonCard(key, person);
            cardsGrid.appendChild(card);
        }
    });
}

/**
 * Generate the Read List section with distinct styling
 */
function generateReadListSection() {
    const readListSection = document.getElementById('readListSection');
    
    if (!readListSection || !SHEETS.read_list) return;
    
    // Clear existing content
    readListSection.innerHTML = '';
    
    const readList = SHEETS.read_list;
    const banner = createReadListBanner(readList);
    readListSection.appendChild(banner);
}

/**
 * Create the Read List banner element
 * @param {object} readList - Read List object
 * @returns {HTMLElement} The banner element
 */
function createReadListBanner(readList) {
    const banner = document.createElement('div');
    banner.className = 'read-list-banner';
    
    banner.innerHTML = `
        <div class="read-list-content">
            <div class="read-list-image">
                <img src="${readList.thumbnail}" alt="${readList.name}" onerror="this.src='https://via.placeholder.com/400x200?text=Upcoming+Books'">
            </div>
            <div class="read-list-info">
                <h3 class="read-list-title">${readList.name}</h3>
                <p class="read-list-description">${readList.description}</p>
                <a href="books.html?person=read_list" class="read-list-link">See what we'll be reading next →</a>
            </div>
        </div>
    `;
    
    // Add click handler
    banner.addEventListener('click', () => {
        window.location.href = `books.html?person=read_list`;
    });
    
    return banner;
}

/**
 * Create a single person card element
 * @param {string} key - The key of the person in SHEETS
 * @param {object} person - Person object containing name, gid, thumbnail, description
 * @returns {HTMLElement} The card element
 */
function createPersonCard(key, person) {
    const template = document.getElementById('personCardTemplate');
    const card = template.content.cloneNode(true);
    
    const img = card.querySelector('.card-image');
    const name = card.querySelector('.card-name');
    const description = card.querySelector('.card-description');
    const link = card.querySelector('.card-link');
    
    img.src = person.thumbnail;
    img.alt = person.name;
    name.textContent = person.name;
    description.textContent = person.description || 'Curated book collection';
    link.href = `books.html?person=${key}`;
    
    // Add click handler for navigation
    const cardElement = card.querySelector('.reader-card');
    cardElement.addEventListener('click', () => {
        window.location.href = `books.html?person=${key}`;
    });
    
    return card;
}

/**
 * Initialize navbar functionality
 */
function initializeNavbar() {
    const navLinks = document.querySelectorAll('.nav-link');
    
    // Set active link based on current page
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (window.location.pathname.includes(href) || (href === 'index.html' && window.location.pathname.endsWith('/'))) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
    
    // Add smooth click navigation
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
        });
    });
}

/**
 * Navbar scroll effect
 */
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

/**
 * Smooth fade-in animation on page load
 */
function fadeInAnimation() {
    document.body.style.opacity = '0';
    setTimeout(() => {
        document.body.style.transition = 'opacity 0.8s ease-in';
        document.body.style.opacity = '1';
    }, 100);
}