import { COUNTRIES } from './countries.js'

// State
let selectedCountries = new Map(); // Map<string, number>
const config = {
  distributionStrategy: {
    key: "FixedCountByMaxMinDistance",
    minMinDistance: 50,
    locationCountGoal: 0,
    countryDistributionFromMap: null
  },
  output: {
    locationTags: [],
    panoIdCountryCodes: [],
    globalHeadingExpression: null,
    countryHeadingExpressions: null,
    globalZoom: null,
    globalPitch: 0
  },
  globalLocationFilter: "",
  countryCodes: [],
  countryDistribution: {}
};

// DOM Elements
const countrySearch = document.getElementById('country-search');
const countryListContainer = document.getElementById('country-list-container');
const selectedCountriesDiv = document.getElementById('selected-countries');
const strategyKey = document.getElementById('strategy-key');
const minDistance = document.getElementById('min-distance');
const globalFilter = document.getElementById('global-filter');
const panoStrategy = document.getElementById('pano-strategy');
const outputPitch = document.getElementById('output-pitch');
const outputZoom = document.getElementById('output-zoom');
const jsonPreview = document.getElementById('json-preview');
const filenamePreview = document.getElementById('filename-preview');
const totalCountDisplay = document.getElementById('total-count-display');

function init() {
  renderCountryList("");
  renderSelectedCountries();
  setupEventListeners();
  updateConfig();
}

function renderCountryList(query) {
  countryListContainer.innerHTML = "";
  const q = query.toLowerCase();
  
  const filtered = COUNTRIES.filter(c => 
    c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
  );

  filtered.forEach(country => {
    const isSelected = selectedCountries.has(country.code);
    const item = document.createElement('div');
    item.className = `country-item ${isSelected ? 'selected' : ''}`;
    
    item.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.75rem;">
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <img src="https://flagcdn.com/w40/${country.code.toLowerCase()}.png" 
               srcset="https://flagcdn.com/w80/${country.code.toLowerCase()}.png 2x"
               width="20" alt="${country.name} flag" 
               style="border-radius: 4px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));">
          <span class="country-name">${country.name}</span>
        </div>
        ${isSelected ? '<svg width="16" height="16" fill="var(--primary)" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>' : ''}
      </div>
      <span class="country-code" style="margin-left: 2rem;">${country.code}</span>
    `;
    
    item.onclick = () => toggleCountry(country.code);
    countryListContainer.appendChild(item);
  });
}

function toggleCountry(code) {
  if (selectedCountries.has(code)) {
    selectedCountries.delete(code);
  } else {
    selectedCountries.set(code, 1000);
  }
  renderSelectedCountries();
  renderCountryList(countrySearch.value);
  updateConfig();
}

function renderSelectedCountries() {
  selectedCountriesDiv.innerHTML = "";
  
  if (selectedCountries.size === 0) {
    selectedCountriesDiv.innerHTML = `
      <div style="text-align: center; padding: 3rem; color: var(--text-muted); border: 2px dashed var(--border); border-radius: 16px;">
        <p style="font-size: 1rem; font-weight: 500;">No countries selected yet.</p>
        <p style="font-size: 0.85rem; margin-top: 0.5rem; opacity: 0.7;">Search and click countries above to start building your distribution.</p>
      </div>
    `;
    return;
  }

  selectedCountries.forEach((count, code) => {
    const country = COUNTRIES.find(c => c.code === code);
    if (!country) return;

    const row = document.createElement('div');
    row.className = 'selected-country-row';

    row.innerHTML = `
      <div style="display: flex; align-items: center; gap: 1rem;">
        <img src="https://flagcdn.com/w40/${code.toLowerCase()}.png" 
             srcset="https://flagcdn.com/w80/${code.toLowerCase()}.png 2x"
             width="24" alt="${country.name} flag" 
             style="border-radius: 4px; filter: drop-shadow(0 2px 6px rgba(0,0,0,0.3));">
        <div>
          <div style="font-weight: 700; font-size: 1.1rem; color: var(--text-main);">${country.name}</div>
          <div style="color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05rem;">ISO Code: ${country.code}</div>
        </div>
      </div>
      <div style="display: flex; align-items: center; gap: 1rem;">
        <label style="font-size: 0.7rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Locations</label>
        <input type="number" value="${count}" class="country-count-input" data-code="${code}" 
               style="width: 120px; padding: 0.6rem 0.75rem; font-size: 0.95rem; font-weight: 700; background: rgba(0,0,0,0.4); border-color: var(--border);" />
      </div>
      <button class="remove-btn" data-code="${code}" 
              style="background: rgba(244, 63, 94, 0.1); color: var(--accent); width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.25rem; transition: var(--transition);">
        <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"></path></svg>
      </button>
    `;

    const input = row.querySelector('.country-count-input');
    input.oninput = (e) => {
      const val = parseInt(e.target.value) || 0;
      selectedCountries.set(code, val);
      updateConfig();
    };

    const removeBtn = row.querySelector('.remove-btn');
    removeBtn.onmouseenter = () => {
      removeBtn.style.background = 'var(--accent)';
      removeBtn.style.color = 'white';
    };
    removeBtn.onmouseleave = () => {
      removeBtn.style.background = 'rgba(244, 63, 94, 0.1)';
      removeBtn.style.color = 'var(--accent)';
    };
    removeBtn.onclick = () => toggleCountry(code);

    selectedCountriesDiv.appendChild(row);
  });
}

function updateConfig() {
  const codes = Array.from(selectedCountries.keys());
  let total = 0;
  const distribution = {};
  selectedCountries.forEach((count, code) => {
    total += count;
    distribution[code] = count;
  });

  // Root level
  config.countryCodes = codes;
  config.countryDistribution = distribution;
  config.globalLocationFilter = globalFilter.value || null;

  // Strategy
  config.distributionStrategy = {
    key: strategyKey.value,
    minMinDistance: parseInt(minDistance.value),
    locationCountGoal: strategyKey.value === "MaxCountByFixedMinDistance" ? null : total,
    countryDistributionFromMap: null
  };
  
  if (strategyKey.value === "MaxCountByFixedMinDistance") {
    config.distributionStrategy.FixedMinDistance = parseInt(minDistance.value);
    delete config.distributionStrategy.minMinDistance;
  }

  // Output
  config.output = {
    locationTags: [],
    panoIdCountryCodes: codes,
    globalHeadingExpression: null,
    countryHeadingExpressions: null,
    globalZoom: outputZoom.value === "0" ? null : parseFloat(outputZoom.value),
    globalPitch: parseFloat(outputPitch.value),
    panoVerificationStrategy: panoStrategy.value || null
  };

  totalCountDisplay.textContent = total.toLocaleString();
  jsonPreview.textContent = JSON.stringify(config, null, 2);
  updateFilename(total);
}

function updateFilename(total) {
  const codes = Array.from(selectedCountries.keys());
  let name = "Config";
  
  if (codes.length === 1) {
    const c = COUNTRIES.find(x => x.code === codes[0]);
    name = c ? c.name : codes[0];
  } else if (codes.length > 1) {
    name = "Multi";
  }

  const filename = `${name.replace(/\s+/g, '')}${total}.json`;
  filenamePreview.textContent = `Filename: ${filename}`;
  return filename;
}

function downloadConfig() {
  const total = Array.from(selectedCountries.values()).reduce((a, b) => a + b, 0);
  const filename = updateFilename(total);
  const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function setupEventListeners() {
  countrySearch.oninput = (e) => renderCountryList(e.target.value);
  strategyKey.onchange = updateConfig;
  minDistance.oninput = updateConfig;
  
  const activePresets = new Set();

  document.querySelectorAll('.preset-btn').forEach(btn => {
    if (btn.id === 'toggle-preview-btn' || btn.id === 'close-preview-btn') return;
    
    btn.addEventListener('click', () => {
      const filter = btn.dataset.filter || "";
      
      if (filter === "") {
        activePresets.clear();
        globalFilter.value = "";
      } else {
        if (activePresets.has(filter)) activePresets.delete(filter);
        else activePresets.add(filter);
        globalFilter.value = Array.from(activePresets).join(" and ");
      }
      
      document.querySelectorAll('.preset-btn').forEach(b => {
        if (b.id === 'toggle-preview-btn' || b.id === 'close-preview-btn') return;
        const f = b.dataset.filter;
        if (f && activePresets.has(f)) b.classList.add('active');
        else b.classList.remove('active');
      });

      updateConfig();
    });
  });

  globalFilter.oninput = (e) => {
    activePresets.clear();
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    updateConfig();
  };

  panoStrategy.onchange = updateConfig;
  outputPitch.oninput = updateConfig;
  outputZoom.oninput = updateConfig;

  // Download buttons
  document.getElementById('download-btn-bottom').onclick = downloadConfig;
  document.getElementById('download-btn-sidebar').onclick = downloadConfig;

  // Preview Toggle
  const toggleBtn = document.getElementById('toggle-preview-btn');
  const closeBtn = document.getElementById('close-preview-btn');
  const sidebar = document.getElementById('sidebar');

  toggleBtn.onclick = () => sidebar.classList.remove('hidden');
  closeBtn.onclick = () => sidebar.classList.add('hidden');
  
  // Close on backdrop click
  sidebar.onclick = (e) => {
    if (e.target === sidebar) sidebar.classList.add('hidden');
  };
}

init();
