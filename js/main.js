import { COUNTRIES } from './countries.js'
import { SUBDIVISIONS } from './subdivisions.js'

// State
let selectedCountries = new Map(); // Map<string, number>
let subdivisionSelections = new Map(); // Map<string, Set<string>> (countryCode -> set of division codes)
let currentModalCountryCode = null;

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
const subdivisionsContainer = document.getElementById('subdivisions-container');
const subdivisionsModal = document.getElementById('subdivisions-modal');
const subdivisionsModalTitle = document.getElementById('subdivisions-modal-title');
const subdivisionsListContainer = document.getElementById('subdivisions-list-container');
const subdivisionSearch = document.getElementById('subdivision-search');

const strategyKey = document.getElementById('strategy-key');
const minDistance = document.getElementById('min-distance');
const globalFilter = document.getElementById('global-filter');
const panoStrategy = document.getElementById('pano-strategy');
const outputPitch = document.getElementById('output-pitch');
const outputZoom = document.getElementById('output-zoom');
const jsonPreview = document.getElementById('json-preview');
const filenamePreview = document.getElementById('filename-preview');
const totalCountDisplay = document.getElementById('total-count-display');
const downloadBtnBottom = document.getElementById('download-btn-bottom');
const downloadBtnSidebar = document.getElementById('download-btn-sidebar');

// Mutual exclusivity map for presets
const PRESET_CONFLICTS = {
  "Buildings200 eq 0 and Roads200 eq 1": ["Buildings25 gte 3 and Buildings100 gte 6"], // Rural conflicts with Urban
  "Buildings25 gte 3 and Buildings100 gte 6": ["Buildings200 eq 0 and Roads200 eq 1"]  // Urban conflicts with Rural
};

function init() {
  renderCountryList("");
  renderSelectedCountries();
  renderSubdivisionCountries();
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
    subdivisionSelections.delete(code);
  } else {
    selectedCountries.set(code, 1000);
    subdivisionSelections.set(code, new Set());
  }
  renderSelectedCountries();
  renderSubdivisionCountries();
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

function renderSubdivisionCountries() {
  subdivisionsContainer.innerHTML = "";
  if (selectedCountries.size === 0) {
    subdivisionsContainer.innerHTML = `
      <div style="text-align: center; padding: 3rem; color: var(--text-muted); border: 2px dashed var(--border); border-radius: 16px;">
        <p style="font-size: 1rem; font-weight: 500;">No countries selected yet.</p>
        <p style="font-size: 0.85rem; margin-top: 0.5rem; opacity: 0.7;">Select countries in Step 1 to manage their regions here.</p>
      </div>
    `;
    return;
  }

  selectedCountries.forEach((_, code) => {
    const country = COUNTRIES.find(c => c.code === code);
    if (!country) return;

    const set = subdivisionSelections.get(code);
    const selectedCount = set ? set.size : 0;
    const countryData = SUBDIVISIONS[code];
    const totalCount = countryData ? Object.keys(countryData.divisions).length : 0;
    const hasData = totalCount > 0;

    const row = document.createElement('div');
    row.className = 'selected-country-row';
    
    let infoHtml = '';
    if (!hasData) {
      infoHtml = `<span style="font-size: 0.8rem; color: var(--text-muted);">No subdivision data available</span>`;
    } else if (selectedCount === 0) {
      infoHtml = `<span style="font-size: 0.8rem; color: var(--text-muted);">All ${totalCount} regions included</span>`;
    } else {
      infoHtml = `<span style="font-size: 0.8rem; color: var(--primary); font-weight: 600;">${selectedCount} of ${totalCount} regions selected</span>`;
    }

    row.innerHTML = `
      <div style="display: flex; align-items: center; gap: 1rem;">
        <img src="https://flagcdn.com/w40/${code.toLowerCase()}.png" 
             srcset="https://flagcdn.com/w80/${code.toLowerCase()}.png 2x"
             width="24" alt="${country.name} flag" 
             style="border-radius: 4px; filter: drop-shadow(0 2px 6px rgba(0,0,0,0.3));">
        <div>
          <div style="font-weight: 700; font-size: 1rem; color: var(--text-main);">${country.name}</div>
          ${infoHtml}
        </div>
      </div>
      ${hasData ? `<button class="btn-secondary preset-btn" style="padding: 0.5rem 1rem;">Manage</button>` : ''}
    `;

    if (hasData) {
      const manageBtn = row.querySelector('button');
      manageBtn.onclick = () => openSubdivisionsModal(code);
    }

    subdivisionsContainer.appendChild(row);
  });
}

function openSubdivisionsModal(code) {
  currentModalCountryCode = code;
  const country = COUNTRIES.find(c => c.code === code);
  subdivisionsModalTitle.textContent = `Regions in ${country.name}`;
  subdivisionSearch.value = "";
  renderSubdivisionsList("");
  subdivisionsModal.classList.remove('hidden');
}

function renderSubdivisionsList(query) {
  if (!currentModalCountryCode) return;
  
  subdivisionsListContainer.innerHTML = "";
  const q = query.toLowerCase();
  const countryData = SUBDIVISIONS[currentModalCountryCode];
  if (!countryData) return;

  const set = subdivisionSelections.get(currentModalCountryCode);
  const divisions = Object.entries(countryData.divisions);
  
  const filtered = divisions.filter(([divCode, divName]) => 
    divCode.toLowerCase().includes(q) || divName.toLowerCase().includes(q)
  );

  filtered.forEach(([divCode, divName]) => {
    const isSelected = set.has(divCode);
    const item = document.createElement('div');
    item.className = `country-item ${isSelected ? 'selected' : ''}`;
    
    item.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; gap: 0.5rem;">
        <span class="country-name" style="font-size: 0.85rem;">${divName}</span>
        ${isSelected ? '<svg width="16" height="16" fill="var(--primary)" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>' : ''}
      </div>
      <span class="country-code" style="font-size: 0.65rem;">${divCode}</span>
    `;
    
    item.onclick = () => {
      if (set.has(divCode)) set.delete(divCode);
      else set.add(divCode);
      renderSubdivisionsList(subdivisionSearch.value);
    };
    
    subdivisionsListContainer.appendChild(item);
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

  // Subdivision inclusions parsing
  let hasInclusions = false;
  const inclusionsObj = {};
  subdivisionSelections.forEach((set, code) => {
    if (set.size > 0) {
      inclusionsObj[code] = Array.from(set);
      hasInclusions = true;
    }
  });

  if (hasInclusions) {
    config.subdivisionInclusions = inclusionsObj;
  } else {
    delete config.subdivisionInclusions;
  }

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
  updateDownloadButtonState();
}

function updateDownloadButtonState() {
  const hasCountries = selectedCountries.size > 0;
  const buttons = [downloadBtnBottom, downloadBtnSidebar];
  
  buttons.forEach(btn => {
    if (!btn) return;
    btn.disabled = !hasCountries;
    if (!hasCountries) {
      btn.style.opacity = "0.5";
      btn.style.cursor = "not-allowed";
      btn.style.pointerEvents = "none";
    } else {
      btn.style.opacity = "1";
      btn.style.cursor = "pointer";
      btn.style.pointerEvents = "auto";
    }
  });
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
  if (selectedCountries.size === 0) {
    alert("Please select at least one country before downloading.");
    return;
  }
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
  minDistance.onblur = () => {
    if (minDistance.value < 25) minDistance.value = 25;
  };
  
  const activePresets = new Set();

  document.querySelectorAll('.preset-btn').forEach(btn => {
    if (btn.id === 'toggle-preview-btn' || btn.id === 'close-preview-btn' || btn.id === 'close-subdivisions-btn' || btn.id === 'clear-subdivisions-btn') return;
    
    btn.addEventListener('click', () => {
      const filter = btn.dataset.filter || "";
      
      if (filter === "") {
        activePresets.clear();
        globalFilter.value = "";
      } else {
        if (activePresets.has(filter)) {
          activePresets.delete(filter);
        } else {
          // Check for conflicts
          const conflicts = PRESET_CONFLICTS[filter] || [];
          conflicts.forEach(conflict => activePresets.delete(conflict));
          
          activePresets.add(filter);
        }
        globalFilter.value = Array.from(activePresets).join(" and ");
      }
      
      document.querySelectorAll('.preset-btn').forEach(b => {
        if (b.id === 'toggle-preview-btn' || b.id === 'close-preview-btn' || b.id === 'close-subdivisions-btn' || b.id === 'clear-subdivisions-btn') return;
        const f = b.dataset.filter;
        if (f && activePresets.has(f)) b.classList.add('active');
        else b.classList.remove('active');
      });

      updateConfig();
    });
  });

  globalFilter.oninput = (e) => {
    activePresets.clear();
    document.querySelectorAll('.preset-btn').forEach(b => {
        if (b.id !== 'toggle-preview-btn' && b.id !== 'close-preview-btn' && b.id !== 'close-subdivisions-btn' && b.id !== 'clear-subdivisions-btn') {
            b.classList.remove('active');
        }
    });
    updateConfig();
  };

  panoStrategy.onchange = updateConfig;
  outputPitch.oninput = updateConfig;
  outputZoom.oninput = updateConfig;

  // Download buttons
  downloadBtnBottom.onclick = downloadConfig;
  downloadBtnSidebar.onclick = downloadConfig;

  // Preview Toggle
  const toggleBtn = document.getElementById('toggle-preview-btn');
  const closeBtn = document.getElementById('close-preview-btn');
  const sidebar = document.getElementById('sidebar');

  toggleBtn.onclick = () => sidebar.classList.remove('hidden');
  closeBtn.onclick = () => sidebar.classList.add('hidden');
  
  // Close on backdrop click (Preview Modal)
  sidebar.onclick = (e) => {
    if (e.target === sidebar) sidebar.classList.add('hidden');
  };

  // Subdivisions Modal Logic
  subdivisionSearch.oninput = (e) => renderSubdivisionsList(e.target.value);
  
  document.getElementById('close-subdivisions-btn').onclick = () => {
    subdivisionsModal.classList.add('hidden');
    renderSubdivisionCountries();
    updateConfig();
  };
  
  document.getElementById('save-subdivisions-btn').onclick = () => {
    subdivisionsModal.classList.add('hidden');
    renderSubdivisionCountries();
    updateConfig();
  };

  document.getElementById('clear-subdivisions-btn').onclick = () => {
    if (currentModalCountryCode) {
      subdivisionSelections.get(currentModalCountryCode).clear();
      renderSubdivisionsList(subdivisionSearch.value);
    }
  };

  subdivisionsModal.onclick = (e) => {
    if (e.target === subdivisionsModal) {
      subdivisionsModal.classList.add('hidden');
      renderSubdivisionCountries();
      updateConfig();
    }
  };
}

init();
