const params = new URLSearchParams(window.location.search);
const selectedPersonKey = (params.get('person') || 'myself').toLowerCase();
const personConfig = (typeof SHEETS !== 'undefined')
    ? (SHEETS[selectedPersonKey] || SHEETS.myself)
    : null;

const allBooks = [];
let filteredBooks = [];

const elements = {
    loadingState: document.getElementById('loadingState'),
    errorState: document.getElementById('errorState'),
    errorMessage: document.getElementById('errorMessage'),
    retryBtn: document.getElementById('retryBtn'),
    emptyState: document.getElementById('emptyState'),
    emptyMessage: document.getElementById('emptyMessage'),
    booksGrid: document.getElementById('booksGrid'),
    searchInput: document.getElementById('searchInput'),
    genreFilter: document.getElementById('genreFilter'),
    modal: document.getElementById('bookModal'),
    modalClose: document.querySelector('.modal-close'),
    modalBackdrop: document.querySelector('.modal-backdrop'),
    modalImage: document.getElementById('modalImage'),
    modalTitle: document.getElementById('modalTitle'),
    modalAuthor: document.getElementById('modalAuthor'),
    modalGenre: document.getElementById('modalGenre'),
    modalSummary: document.getElementById('modalSummary'),
};

function getSheetUrl() {
    if (typeof BASE_URL === 'undefined' || !personConfig?.gid) return null;
    return `${BASE_URL}${personConfig.gid}`;
}

async function fetchBooks() {
    const url = getSheetUrl();
    if (!url) {
        showErrorState('No data source configured.');
        return;
    }

    showLoadingState();

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.text();
        const books = parseCSV(data);

        allBooks.length = 0;
        allBooks.push(...books);
        filteredBooks = [...allBooks];

        if (allBooks.length === 0) {
            showEmptyState('No books to display.');
            return;
        }

        populateGenres(allBooks);
        renderBooks(filteredBooks);
    } catch (error) {
        console.error(error);
        showErrorState('Failed to load books. Please check your connection and try again.');
    }
}

function init() {
    if (!personConfig) {
        showErrorState('Invalid person selected.');
        return;
    }

    const pageTitle = document.getElementById('pageTitle');
    const pageSubtitle = document.getElementById('personDescription');
    if (pageTitle) pageTitle.textContent = `${personConfig.name}'s Books`;
    if (pageSubtitle) pageSubtitle.textContent = personConfig.description || 'Explore our complete library';

    elements.retryBtn?.addEventListener('click', fetchBooks);
    elements.searchInput?.addEventListener('input', applyFilters);
    elements.genreFilter?.addEventListener('change', applyFilters);

    setupModal();
    fetchBooks();
}

document.addEventListener('DOMContentLoaded', init);

/**
 * Parse CSV data into structured book objects
 * Uses PapaParse for proper CSV handling
 * Row count is based on actual data.length, not text content
 * Multiline content within cells is preserved and handled correctly
 * @param {string} text - Raw CSV text from Google Sheets
 * @returns {Array} Array of book objects with title, author, genre, link, summary
 */
function parseCSV(text) {
    if (!text) return [];

    const config = {
        header: false,
        skipEmptyLines: true,
        delimiter: ','
    };

    const result = Papa.parse(text, config);
    if (result.errors.length > 0) {
        console.error('CSV parsing errors:', result.errors);
        return [];
    }

    // result.data is an array of rows - row count = data.length
    // This correctly handles multiline content in cells
    const lines = result.data;
    if (lines.length < 2) return [];

    const rawHeaders = lines[0].map(h => h.replace(/"/g, '').trim().toLowerCase());

    const mapHeaderKey = (header) => {
        const normalized = header.replace(/[_\s]+/g, ' ').trim();
        if (normalized.includes('title') || normalized.includes('name')) return 'title';
        if (normalized.includes('author') || normalized.includes('writer')) return 'author';
        if (normalized.includes('genre') || normalized.includes('category')) return 'genre';
        if (normalized.includes('link') || normalized.includes('cover') || normalized.includes('image') || normalized.includes('url')) return 'link';
        if (normalized.includes('summary') || normalized.includes('description')) return 'summary';
        return null;
    };

    const headerMap = rawHeaders.reduce((map, header, idx) => {
        const key = mapHeaderKey(header);
        if (key) map[idx] = key;
        return map;
    }, {});

    return lines.slice(1).reduce((rows, line) => {
        const row = {};

        Object.entries(headerMap).forEach(([idx, key]) => {
            const raw = line[idx] || '';
            row[key] = raw.trim();
        });

        // Only keep rows that look like books (must have a title)
        if (row.title) rows.push(row);
        return rows;
    }, []);
}

function renderBooks(books) {
    if (!elements.booksGrid) return;
    elements.booksGrid.innerHTML = '';

    if (!books || books.length === 0) {
        showEmptyState('No books to display.');
        return;
    }

    showBooksGrid();

    const template = document.getElementById('bookCardTemplate');

    books.forEach(book => {
        const cardFragment = template.content.cloneNode(true);

        const title = book.title || 'Untitled';
        const author = book.author || 'Unknown author';
        const genre = book.genre || 'General';
        const link = book.link || '';

        const img = cardFragment.querySelector('.book-card-image img');
        const titleEl = cardFragment.querySelector('.book-title');
        const authorEl = cardFragment.querySelector('.book-author');
        const genreEl = cardFragment.querySelector('.genre-tag');

        img.src = link;
        img.alt = title;
        titleEl.textContent = title;
        authorEl.textContent = author;
        genreEl.textContent = genre;

        const card = cardFragment.querySelector('.book-card');
        card.addEventListener('click', () => openModal({ ...book, title, author, genre, link }));
        
        elements.booksGrid.appendChild(cardFragment);
    });
}

function populateGenres(books) {
    if (!elements.genreFilter) return;

    const genres = new Set();
    books.forEach(book => {
        if (book.genre) genres.add(book.genre.trim());
    });

    const options = [{ value: '', label: 'All Genres' }, ...[...genres].sort().map(g => ({ value: g, label: g }))];
    
    // Clear existing options
    elements.genreFilter.innerHTML = '';
    
    // Create and append option elements
    options.forEach(o => {
        const option = document.createElement('option');
        option.value = o.value;
        option.textContent = o.label;
        elements.genreFilter.appendChild(option);
    });
}

function applyFilters() {
    const query = elements.searchInput?.value?.trim().toLowerCase() || '';
    const selectedGenre = elements.genreFilter?.value || '';

    filteredBooks = allBooks.filter(book => {
        const title = (book.title || '').toLowerCase();
        const author = (book.author || '').toLowerCase();
        const genre = (book.genre || '').toLowerCase();

        const matchesQuery = !query || title.includes(query) || author.includes(query);
        const matchesGenre = !selectedGenre || genre === selectedGenre.toLowerCase();

        return matchesQuery && matchesGenre;
    });

    renderBooks(filteredBooks);
}

function showLoadingState() {
    toggleStateVisibility({ loading: true });
}

function showErrorState(message) {
    if (elements.errorMessage) elements.errorMessage.textContent = message;
    toggleStateVisibility({ error: true });
}

function showEmptyState(message) {
    if (elements.emptyMessage) elements.emptyMessage.textContent = message;
    toggleStateVisibility({ empty: true });
}

function showBooksGrid() {
    toggleStateVisibility({ books: true });
}

function toggleStateVisibility({ loading = false, error = false, empty = false, books = false } = {}) {
    setElementVisibility(elements.loadingState, loading);
    setElementVisibility(elements.errorState, error);
    setElementVisibility(elements.emptyState, empty);
    setElementVisibility(elements.booksGrid, books);
}

function setElementVisibility(el, visible) {
    if (!el) return;
    if (visible) el.classList.remove('hidden');
    else el.classList.add('hidden');
}

function setupModal() {
    if (!elements.modal) return;

    const closeModal = () => elements.modal.classList.add('hidden');
    elements.modalClose?.addEventListener('click', closeModal);
    elements.modalBackdrop?.addEventListener('click', closeModal);

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') closeModal();
    });
}

function openModal(book) {
    if (!elements.modal) return;

    elements.modalImage.src = book.link || 'https://placehold.co/400x600?text=No+Cover';
    elements.modalTitle.textContent = book.title || 'Untitled';
    elements.modalAuthor.textContent = book.author || 'Unknown';
    elements.modalGenre.textContent = book.genre || 'General';
    elements.modalSummary.textContent = book.summary || 'No summary available.';

    elements.modal.classList.remove('hidden');
}
