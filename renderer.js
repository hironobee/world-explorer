// renderer.js - runs in renderer context
// OOP classes and UI logic for World Explorer

/* ----------------------------
    OOP Models
   ---------------------------- */

class Country {
  constructor(rawData) {
    this.name = rawData?.name?.common || 'Unknown';
    this.officialName = rawData?.name?.official || '';
    this.capital = (rawData?.capital && rawData.capital[0]) || '—';
    this.region = rawData?.region || '—';
    this.subregion = rawData?.subregion || '—';
    this.population = rawData?.population || 0;
    this.area = rawData?.area || 0;
    this.languages = rawData?.languages ? Object.values(rawData.languages) : [];
    this.timezones = rawData?.timezones || [];
    this.flag = rawData?.flags?.png || rawData?.flags?.svg || '';
    this.maps = rawData?.maps || {};
    }
}

class Itinerary {
    constructor({id = null, country = '', date = '', notes = ''} = {}) {
        this.id = id ?? Itinerary.generateId();
        this.country = country;
        this.date = date;
        this.notes = notes;
        this.createdAt = new Date().toISOString();
    }

    static generateId() {
        return 'it-' + Math.random().toString(36).substring(2, 9);
    }
}

class ItineraryManager {
    constructor(storageKey = 'world_explorer_itineraries') {
        this.storageKey = storageKey;
        this.items = this.load();
    }

    load() {
        try {
            const raw = localStorage.getItem(this.storageKey);
            return raw ? JSON.parse(raw) : [];
        } catch (err) {
            console.error('Failed to load itineraries', err);
            return [];
        }
    }

    save() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.items));
    }

    add(it) {
        this.items.push(it);
        this.save();
    }

    update(id, fields) {
        const idx = this.items.findIndex(i => i.id === id);
        if (idx >= 0) {
            this.items[idx] = {...this.items[idx], ...fields};
            this.save();
        }
    }

    delete(id) {
        this.items = this.items.filter(i => i.id !== id);
        this.save();
    }

    getAll() {
        return this.items;
    }

    getById(id) {
        return this.items.find(i => i.id === id);
    }
}

/* ----------------------------
    API helpers
   ---------------------------- */
const RESTCOUNTRIES_BASE = 'https://restcountries.com/v3.1/name/';

async function fetchCountryByName(name) {
    const url = RESTCOUNTRIES_BASE + encodeURIComponent(name) + '?fullText=false';
    try {
        const res = await fetch(url);
        if (!res.ok) {
            throw new Error(`API error: ${res.status}`);
        }
        const data = await res.json();
        // The API returns array; take the first match
        if (!Array.isArray(data) || data.length === 0) throw new Error('No results found');
        return new Country(data[0]);
    } catch (err) {
        throw err;
    }
}

/* ----------------------------
    UI Logic (Search Page)
   ---------------------------- */
function el(id) {return document.getElementById(id);}

if (document.getElementById('searchBtn')) {
    const searchBtn = el('searchBtn');
    const input = el('countryInput');
    const result = el('result');
    const feedback = el('searchFeedback');

    searchBtn.addEventListener('click', async () => {
        const q = input.value.trim();
        feedback.textContent = '';
        result.innerHTML = `<p class="hint">Loading...</p>`;
        if (!q) {
            feedback.textContent = 'Please enter a country name.';
            result.innerHTML = '';
            return;
        }

        try {
            const country = await fetchCountryByName(q);
            renderCountry(country, result);
        } catch (err) {
            console.error(err);
            feedback.textContent = 'Could not find country or an error occurred.';
            result.innerHTML = '';
        }
    });

    // also allow Enter key
    input.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') searchBtn.click();
    });

    function renderCountry(country, container) {
        container.innerHTML = `
            <div class="result-card">
                <div class="flag-area">
                    <img class="flag" src="${country.flag}" alt="flag of ${country.name}">
                </div>
                <div class="meta">
                    <h2>${country.name} <small>(${country.officialName})</small></h2>
                    <p><strong>Capital:</strong> ${country.capital}</p>
                    <p><strong>Region / Subregion:</strong> ${country.region} / ${country.subregion}</p>
                    <p><strong>Population:</strong> ${country.population.toLocaleString()}</p>
                    <p><strong>Area:</strong> ${country.area.toLocaleString()} km²</p>
                    <p><strong>Languages:</strong> ${country.languages.join(', ') || '—'}</p>
                    <p><strong>Timezones:</strong> ${country.timezones.join(', ')}</p>
                    <p><strong>Maps:</strong> <a href="${country.maps.googleMaps || '#'}" target="_blank">Google Maps</a></p>
                    <div style="margin-top:10px;">
                        <button id="saveItBtn">Save to Itinerary</button>
                    </div>
                </div>
            </div>
            `;

            // attach save to itinerary button
            const saveBtn = document.getElementById('saveItBtn');
            if (saveBtn) {
                saveBtn.addEventListener('click', () => {
                    const manager = new ItineraryManager();
                    const it = new Itinerary({country: country.name, notes: `Searched on ${new Date().toLocaleDateString()}`});
                    manager.add(it);
                    // provide quick feedback
                    feedback.style.color = '#b8860b';
                    feedback.textContent = `Saved "${country.name}" to your itinerary. Open My Itinerary to edit details.`;
                    setTimeout(() => {feedback.textContent = ''; feedback.style.color = '';}, 3000);
                });
            }
    }
}

/* ----------------------------
    UI Logic (Itinerary Page)
   ---------------------------- */
if (document.getElementById('itineraryForm')) {
    const form = el('itineraryForm');
    const itCountry = el('itCountry');
    const itDate = el('itDate');
    const itNotes = el('itNotes');
    const itList = el('itList');
    const itFeedback = el('itFeedback');
    const clearBtn = el('clearBtn');

    const manager = new ItineraryManager();

    function renderList() {
        const items = manager.getAll();
        if (!items.length) {
            itList.innerHTML = `<p class="hint">No itineraries yet. Add one above or save directly from Search.</p>`;
            return;
        }
        itList.innerHTML = '';
        items.forEach(item => {
            const card = document.createElement('div');
            card.className = 'it-card';
            card.innerHTML = `
                <div class="left">
                    <div><strong>${item.country}</strong> ${item.date ? '| ' + item.date : ''}</div>
                    <div style="color: #666; font-size: 13px; margin-top:6px">${item.notes || '<em>No notes</em>'}</div>
                </div>
                <div class="it-actions">
                    <button class="edit">Edit</button>
                    <button class="delete">Delete</button>
                </div>
            `;
            // edit / delete events
            const editBtn = card.querySelector('.edit');
            const delBtn = card.querySelector('.delete');

            editBtn.addEventListener('click', () => {
                itCountry.value = item.country;
                itDate.value = item.date || '';
                itNotes.value = item.notes || '';
                // store the id in form dataset to indicate "editing"
                form.dataset.editId = item.id;
                itFeedback.textContent = 'Editing mode: make changes and press Add / Save.';
            });

            delBtn.addEventListener('click', () => {
                if (confirm(`Delete itinerary: ${item.country}?`)) {
                    manager.delete(item.id);
                    renderList();
                }
            });

            itList.appendChild(card);
        });
    }

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const country = itCountry.value.trim();
        const date = itDate.value;
        const notes = itNotes.value.trim();

        if (!country) {
            itFeedback.textContent = 'Country name is required.';
            return;
        }

        const editId = form.dataset.editId;
        if (editId) {
            manager.update(editId, {country, date, notes});
            delete form.dataset.editId;
            itFeedback.style.color = 'green';
            itFeedback.textContent = 'Itinerary updated.';
        } else {
            const it = new Itinerary({country, date, notes});
            manager.add(it);
            itFeedback.style.color = 'green';
            itFeedback.textContent = 'Itinerary added.';
        }

        // reset form
        setTimeout(() => {itFeedback.textContent = ''; itFeedback.style.color = '';}, 2000);
        renderList();
    });

    clearBtn.addEventListener('click', () => {
        form.reset();
        delete form.dataset.editId;
        itFeedback.textContent = '';
    });

    // initial render
    renderList();
}