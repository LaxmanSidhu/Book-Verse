/**
 * BookVerse - About Page Script  
 * Handles stats fetching and recommendation form
 */

let personStats = {};

/**
 * Initialize page on load
 */
document.addEventListener('DOMContentLoaded', () => {
    initializeNavbar();
    initializeForm();
    fetchAllStats();
});

/**
 * Initialize navbar functionality
 */
function initializeNavbar() {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.classList.remove('active');
    });
    document.querySelector('a[href="about.html"]').classList.add('active');
}

/**
 * Initialize form event listeners
 */
function initializeForm() {
    const form = document.getElementById('recommendationForm');
    form.addEventListener('submit', handleFormSubmit);

    // Real-time validation
    document.getElementById('nameInput').addEventListener('blur', validateName);
    document.getElementById('bookNameInput').addEventListener('blur', validateBookName);
    document.getElementById('messageInput').addEventListener('blur', validateMessage);

    // Check if EmailJS is loaded
    if (typeof emailjs === 'undefined') {
        console.error('EmailJS library not loaded. Please check your internet connection or script inclusion.');
        return;
    }

    // Initialize EmailJS
    emailjs.init(EMAILJS_PUBLIC_KEY);
}

/**
 * Fetch book counts from all sheets
 * Each fetch is independent - if one fails, others still show
 */
async function fetchAllStats() {
    const statsGrid = document.getElementById('statsGrid');
    const statsLoading = document.getElementById('statsLoading');

    statsLoading.classList.remove('hidden');
    statsGrid.innerHTML = '';

    // Fetch stats for each person (exclude read_list)
    const statEntries = Object.entries(SHEETS).filter(([key]) => key !== 'read_list');
    const statPromises = statEntries.map(([key, person]) => {
        return fetchPersonBookCount(key, person);
    });

    // Wait for all promises to resolve (doesn't throw on individual failures)
    const results = await Promise.allSettled(statPromises);

    statsLoading.classList.add('hidden');

    // Process results
    results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
            const { person, count } = result.value;
            const card = createStatCard(person, count);
            statsGrid.appendChild(card);
        } else {
            console.warn('Failed to fetch stats for person ' + index, result.reason);
            // Still show card with error state
            const [, person] = statEntries[index];
            const card = createStatCardError(person);
            statsGrid.appendChild(card);
        }
    });

    // Show error message if all failed
    const successfulCards = results.filter(r => r.status === 'fulfilled').length;
    if (successfulCards === 0) {
        document.getElementById('statsError').classList.remove('hidden');
    }
}

/**
 * Parse CSV data and return array of rows
 * Uses PapaParse to correctly handle multiline content in cells
 * Row count is based on actual data structure, not text line splitting
 * @param {string} csvText - Raw CSV text from Google Sheets
 * @returns {Array} Array of parsed rows (each row is an array of cell values)
 */
function parseCSVForCounting(csvText) {
    if (!csvText || typeof csvText !== 'string') return [];

    const config = {
        header: false,
        skipEmptyLines: true,
        delimiter: ','
    };

    const result = Papa.parse(csvText, config);

    if (result.errors.length > 0) {
        console.warn('CSV parsing errors:', result.errors);
    }

    // result.data is an array of rows, each row is an array of cell values
    // This correctly handles multiline content in cells
    return result.data || [];
}

/**
 * Fetch book count for a single person
 * Counts rows based on actual data structure, not text line breaks
 * Multiline content within cells does NOT affect row count
 * @param {string} key - Person key
 * @param {object} person - Person config object
 * @returns {Promise} Resolves with person and count
 */
async function fetchPersonBookCount(key, person) {
    try {
        const csvUrl = BASE_URL + person.gid;

        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        const response = await fetch(csvUrl, {
            signal: controller.signal,
            mode: 'cors' // Ensure CORS mode
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error('HTTP ' + response.status);
        }

        const csvText = await response.text();
        const rows = parseCSVForCounting(csvText);

        // Count books: total rows minus 1 for header row
        // Row count is based on the parsed data array length
        // NOT on string splitting - this handles multiline cells correctly
        const bookCount = Math.max(0, rows.length - 1);

        return {
            person: person.name,
            count: bookCount,
            icon: '🕮'
        };
    } catch (error) {
        if (error.name === 'AbortError') {
            console.error('Timeout fetching count for ' + person.name);
            throw new Error('Request timeout');
        }
        console.error('Error fetching count for ' + person.name + ':', error);
        throw error;
    }
}

/**
 * Create a stat card element
 * @param {string} personName - Person's name
 * @param {number} count - Number of books
 * @returns {HTMLElement} Stat card element
 */
function createStatCard(personName, count) {
    const template = document.getElementById('statCardTemplate');
    const cardFragment = template.content.cloneNode(true);

    const nameEl = cardFragment.querySelector('.stat-name');
    const numberEl = cardFragment.querySelector('.stat-number');
    const labelEl = cardFragment.querySelector('.stat-label');

    nameEl.textContent = personName;
    numberEl.textContent = count;
    labelEl.textContent = `book${count !== 1 ? 's' : ''} read`;

    return cardFragment;
}

/**
 * Create an error stat card
 * @param {object} person - Person object
 * @returns {HTMLElement} Error stat card
 */
function createStatCardError(person) {
    const template = document.getElementById('statCardErrorTemplate');
    const cardFragment = template.content.cloneNode(true);

    const nameEl = cardFragment.querySelector('.stat-name');
    nameEl.textContent = person.name;

    return cardFragment;
}

/**
 * Set inline form status message
 */
function setFormStatus(message, type) {
    const statusEl = document.getElementById('formStatusMessage');
    if (!statusEl) return;

    statusEl.textContent = message;
    statusEl.classList.remove('hidden', 'status-success', 'status-error');
    statusEl.classList.add(type === 'success' ? 'status-success' : 'status-error');
}

/**
 * Clear inline form status message
 */
function clearFormStatus() {
    const statusEl = document.getElementById('formStatusMessage');
    if (!statusEl) return;

    statusEl.textContent = '';
    statusEl.classList.add('hidden');
    statusEl.classList.remove('status-success', 'status-error');
}

/**
 * Handle form submission
 */
async function handleFormSubmit(e) {
    e.preventDefault();

    clearFormStatus();

    const isValid = validateName() && validateBookName() && validateMessage();
    if (!isValid) return;

    const formData = {
        name: document.getElementById('nameInput').value.trim(),
        bookName: document.getElementById('bookNameInput').value.trim(),
        message: document.getElementById('messageInput').value.trim(),
        timestamp: new Date().toLocaleString()
    };

    const submitBtn = document.querySelector('.submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';

    try {
        const response = await Promise.race([
            emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
                from_name: formData.name,
                book_name: formData.bookName,
                message: formData.message,
                timestamp: formData.timestamp
            }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Email send timeout')), 15000))
        ]);

        console.log('SUCCESS:', response);
        setFormStatus('Your recommendation has been received. We\'ll read it soon!', 'success');

        document.getElementById('recommendationForm').reset();
        clearAllErrors();

    } catch (error) {
        console.error('FAILED:', error);
        setFormStatus('Unable to send message. Please try again.', 'error');

    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Recommendation';
    }
}

/**
 * Validate name field
 */
function validateName() {
    const nameInput = document.getElementById('nameInput');
    const nameError = document.getElementById('nameError');
    const isValid = nameInput.value.trim().length > 0;

    if (!isValid) {
        nameError.classList.remove('hidden');
        nameInput.classList.add('error');
    } else {
        nameError.classList.add('hidden');
        nameInput.classList.remove('error');
    }

    return isValid;
}

/**
 * Validate book name field
 */
function validateBookName() {
    const bookNameInput = document.getElementById('bookNameInput');
    const bookNameError = document.getElementById('bookNameError');
    const isValid = bookNameInput.value.trim().length > 0;

    if (!isValid) {
        bookNameError.classList.remove('hidden');
        bookNameInput.classList.add('error');
    } else {
        bookNameError.classList.add('hidden');
        bookNameInput.classList.remove('error');
    }

    return isValid;
}

/**
 * Validate message field
 */
function validateMessage() {
    const messageInput = document.getElementById('messageInput');
    const messageError = document.getElementById('messageError');
    const isValid = messageInput.value.trim().length > 0;

    if (!isValid) {
        messageError.classList.remove('hidden');
        messageInput.classList.add('error');
    } else {
        messageError.classList.add('hidden');
        messageInput.classList.remove('error');
    }

    return isValid;
}

/**
 * Clear all error messages
 */
function clearAllErrors() {
    document.querySelectorAll('.form-error').forEach(el => {
        el.classList.add('hidden');
    });
    document.querySelectorAll('.form-input, .form-textarea').forEach(el => {
        el.classList.remove('error');
    });
}
