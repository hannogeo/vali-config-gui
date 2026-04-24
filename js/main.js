import { COUNTRIES } from './countries.js'

// State: Store country codes and their individual counts
let selectedCountries = new Map(); // Map<string, number>
const config = {
  countryCodes: [],
  distributionStrategy: {
    key: "FixedCountByMaxMinDistance",
    locationCountGoal: 0,
    minMinDistance: 200
  },
  countryDistribution: {},
  globalLocationFilter: ""
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
const downloadBtn = document.getElementById('download-btn');
const totalCountDisplay = document.getElementById('total-count-display');

function init() {
  renderCountryList("");
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
    item.style.padding = "0.5rem";
    item.style.cursor = "pointer";
    item.style.borderRadius = "4px";
    item.style.fontSize = "0.875rem";
    item.style.display = "flex";
    item.style.justifyContent = "space-between";
    item.style.backgroundColor = isSelected ? "rgba(139, 92, 246, 0.2)" : "transparent";
    
    item.innerHTML = `<span>${country.name}</span> <span style="color: var(--text-muted); font-size: 0.75rem;">${country.code}</span>`;
    
    item.onclick = () => toggleCountry(country.code);
    countryListContainer.appendChild(item);
  });
}

function toggleCountry(code) {
  if (selectedCountries.has(code)) {
    selectedCountries.delete(code);
  } else {
    // Default count to 1000 when first selected
    selectedCountries.set(code, 1000);
  }
  renderSelectedCountries();
  renderCountryList(countrySearch.value);
  updateConfig();
}

function renderSelectedCountries() {
  selectedCountriesDiv.innerHTML = "";
  
  if (selectedCountries.size === 0) {
    selectedCountriesDiv.innerHTML = '<p style="color: var(--text-muted); font-size: 0.8rem; padding: 1rem;">No countries selected. Search and click countries above to add them.</p>';
    return;
  }

  selectedCountries.forEach((count, code) => {
    const country = COUNTRIES.find(c => c.code === code);
    if (!country) return;

    const row = document.createElement('div');
    row.className = 'selected-country-row';
    row.style.display = 'flex';
    row.style.alignItems = 'center';
    row.style.gap = '1rem';
    row.style.background = 'rgba(255, 255, 255, 0.03)';
    row.style.padding = '0.75rem';
    row.style.borderRadius = '8px';
    row.style.marginBottom = '0.5rem';
    row.style.border = '1px solid var(--border)';

    row.innerHTML = `
      <div style="flex-grow: 1;">
        <div style="font-weight: 600; font-size: 0.9rem;">${country.name}</div>
        <div style="color: var(--text-muted); font-size: 0.7rem;">${country.code}</div>
      </div>
      <div style="display: flex; align-items: center; gap: 0.5rem;">
        <label style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">Locs:</label>
        <input type="number" value="${count}" class="country-count-input" data-code="${code}" 
               style="width: 100px; padding: 0.4rem; font-size: 0.85rem; background: var(--bg-dark);" />
      </div>
      <button class="remove-country-btn" data-code="${code}" 
              style="background: rgba(239, 68, 68, 0.1); color: #ef4444; width: 28px; height: 28px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; border: 1px solid rgba(239, 68, 68, 0.2);">
        &times;
      </button>
    `;

    // Handle count change
    const input = row.querySelector('.country-count-input');
    input.oninput = (e) => {
      const val = parseInt(e.target.value) || 0;
      selectedCountries.set(code, val);
      updateConfig();
    };

    // Handle remove
    row.querySelector('.remove-country-btn').onclick = () => toggleCountry(code);

    selectedCountriesDiv.appendChild(row);
  });
}

function updateConfig() {
  config.countryCodes = Array.from(selectedCountries.keys());
  
  // Calculate total and build distribution
  let total = 0;
  const distribution = {};
  selectedCountries.forEach((count, code) => {
    total += count;
    distribution[code] = count;
  });

  config.countryDistribution = distribution;
  
  // Strategy
  config.distributionStrategy.key = strategyKey.value;
  if (strategyKey.value === "MaxCountByFixedMinDistance") {
    config.distributionStrategy.FixedMinDistance = parseInt(minDistance.value);
    delete config.distributionStrategy.locationCountGoal;
    delete config.distributionStrategy.minMinDistance;
  } else {
    config.distributionStrategy.locationCountGoal = total;
    config.distributionStrategy.minMinDistance = parseInt(minDistance.value);
    delete config.distributionStrategy.FixedMinDistance;
  }

  // Filter
  config.globalLocationFilter = globalFilter.value;

  // Output
  if (panoStrategy.value || outputPitch.value !== "0" || outputZoom.value !== "0") {
    config.output = config.output || {};
    if (panoStrategy.value) config.output.panoVerificationStrategy = panoStrategy.value;
    else delete config.output.panoVerificationStrategy;
    
    if (outputPitch.value !== "0") config.output.globalPitch = parseFloat(outputPitch.value);
    else delete config.output.globalPitch;
    
    if (outputZoom.value !== "0") config.output.globalZoom = parseFloat(outputZoom.value);
    else delete config.output.globalZoom;

    if (Object.keys(config.output).length === 0) delete config.output;
  } else {
    delete config.output;
  }

  // UI Updates
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

function setupEventListeners() {
  countrySearch.oninput = (e) => renderCountryList(e.target.value);
  strategyKey.onchange = updateConfig;
  minDistance.oninput = updateConfig;
  globalFilter.oninput = updateConfig;
  panoStrategy.onchange = updateConfig;
  outputPitch.oninput = updateConfig;
  outputZoom.oninput = updateConfig;

  const activePresets = new Set();

  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const filter = btn.dataset.filter || "";
      
      if (filter === "") {
        // Clear all
        activePresets.clear();
        globalFilter.value = "";
      } else {
        // Toggle preset
        if (activePresets.has(filter)) {
          activePresets.delete(filter);
        } else {
          activePresets.add(filter);
        }
        
        // Rebuild filter string
        globalFilter.value = Array.from(activePresets).join(" and ");
      }
      
      // Update UI highlights
      document.querySelectorAll('.preset-btn').forEach(b => {
        const f = b.dataset.filter;
        if (f && activePresets.has(f)) {
          b.classList.add('active');
        } else {
          b.classList.remove('active');
        }
      });

      updateConfig();
    });
  });

  // Clear presets if user manually edits the filter
  globalFilter.oninput = (e) => {
    activePresets.clear();
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    updateConfig();
  };

  downloadBtn.onclick = () => {
    const total = Array.from(selectedCountries.values()).reduce((a, b) => a + b, 0);
    const filename = updateFilename(total);
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };
}

init();
