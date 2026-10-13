// Admin Dashboard Logic (Open access - No PIN required)
document.addEventListener('DOMContentLoaded', () => {
  initDragAndDrop();
  checkUrlHash();
});

function checkUrlHash() {
  const hash = window.location.hash;
  if (hash) {
    const tabId = hash.replace('#', '');
    if (document.getElementById(tabId)) {
      switchTab(tabId);
    }
  }
}

// Tab Switching
function switchTab(tabId) {
  document.querySelectorAll('.admin-tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.admin-tab-content').forEach(content => content.classList.remove('active'));

  const activeContent = document.getElementById(tabId);
  if (activeContent) {
    activeContent.classList.add('active');
  }

  // Highlight button
  const buttons = document.querySelectorAll('.admin-tab-btn');
  buttons.forEach(btn => {
    if (btn.getAttribute('onclick').includes(tabId)) {
      btn.classList.add('active');
    }
  });

  if (tabId === 'metaAdsTab') {
    setTimeout(initRadiusMap, 150);
  }
}

// Order Status & Management
async function updateOrderStatus(orderId, newStatus) {
  try {
    const formData = new FormData();
    formData.append('status', newStatus);

    const res = await fetch(`/api/orders/${orderId}/status`, {
      method: 'PATCH',
      body: formData
    });
    const data = await res.json();
    if (data.success) {
      const orderRow = document.getElementById(`order-row-${orderId}`);
      if (orderRow) {
        orderRow.setAttribute('data-status', newStatus);
      }
    }
  } catch (err) {
    console.error('Error updating status', err);
    alert('Failed to update status');
  }
}

async function deleteOrder(orderId) {
  if (!confirm('Are you sure you want to delete this customer order?')) return;

  try {
    const res = await fetch(`/api/orders/${orderId}`, {
      method: 'DELETE'
    });
    const data = await res.json();
    if (data.success) {
      const el = document.getElementById(`order-row-${orderId}`);
      if (el) el.remove();
      updateOrderCounts();
    }
  } catch (err) {
    console.error(err);
    alert('Failed to delete order');
  }
}

function filterOrdersByStatus() {
  const selectedStatus = document.getElementById('orderStatusFilter').value;
  const rows = document.querySelectorAll('.order-item-wrap');

  rows.forEach(row => {
    const status = row.getAttribute('data-status');
    if (selectedStatus === 'ALL' || status === selectedStatus) {
      row.style.display = 'block';
    } else {
      row.style.display = 'none';
    }
  });
}

function reloadOrders() {
  window.location.reload();
}

function updateOrderCounts() {
  const remaining = document.querySelectorAll('.order-item-wrap').length;
  const countEl = document.getElementById('statOrdersCount');
  const badgeEl = document.getElementById('tabOrderBadge');
  if (countEl) countEl.innerText = remaining;
  if (badgeEl) badgeEl.innerText = remaining;
}

// Drag & Drop File Upload
function initDragAndDrop() {
  const dropzone = document.getElementById('dropzone');
  if (!dropzone) return;

  ['dragenter', 'dragover'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
    }, false);
  });

  dropzone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    document.getElementById('designFiles').files = files;
    updateSelectedFilesList(files);
  });
}

function handleFileSelection(event) {
  const files = event.target.files;
  updateSelectedFilesList(files);
}

function updateSelectedFilesList(files) {
  const listEl = document.getElementById('fileSelectionList');
  if (!listEl) return;

  if (files.length === 0) {
    listEl.innerHTML = '';
    return;
  }

  let text = `Selected ${files.length} file(s): `;
  const names = [];
  for (let i = 0; i < Math.min(files.length, 3); i++) {
    names.push(files[i].name);
  }
  text += names.join(', ');
  if (files.length > 3) {
    text += ` and ${files.length - 3} more`;
  }
  listEl.innerText = text;
}

async function submitDesignUpload(event) {
  event.preventDefault();

  const fileInput = document.getElementById('designFiles');
  if (!fileInput.files || fileInput.files.length === 0) {
    alert('Please select at least one PDF or Image file to upload');
    return;
  }

  const btn = document.getElementById('btnUploadSubmit');
  const progress = document.getElementById('uploadProgress');

  btn.disabled = true;
  btn.style.display = 'none';
  progress.style.display = 'block';

  try {
    const formData = new FormData();
    for (let i = 0; i < fileInput.files.length; i++) {
      formData.append('files', fileInput.files[i]);
    }

    formData.append('category', document.getElementById('uploadCategory').value);
    formData.append('code_prefix', document.getElementById('uploadCodePrefix').value.trim() || 'BL');
    formData.append('title', document.getElementById('uploadTitle').value.trim());
    formData.append('tags', document.getElementById('uploadTags').value.trim());
    formData.append('description', document.getElementById('uploadDescription').value.trim());

    const res = await fetch('/api/designs/upload', {
      method: 'POST',
      body: formData
    });

    const result = await res.json();

    if (result.success) {
      alert(`Success! Added ${result.count} design(s) to your catalog.`);
      window.location.reload();
    } else {
      alert('Upload failed: ' + (result.message || 'Unknown error'));
      btn.disabled = false;
      btn.style.display = 'flex';
      progress.style.display = 'none';
    }
  } catch (err) {
    console.error(err);
    alert('Upload failed. Please check network connection or file size.');
    btn.disabled = false;
    btn.style.display = 'flex';
    progress.style.display = 'none';
  }
}

// Manage Catalog - Delete Design
async function deleteDesign(designId) {
  if (!confirm('Are you sure you want to delete this design from your catalog?')) return;

  try {
    const res = await fetch(`/api/designs/${designId}`, {
      method: 'DELETE'
    });
    const result = await res.json();
    if (result.success) {
      const row = document.getElementById(`design-row-${designId}`);
      if (row) row.remove();
      const countEl = document.getElementById('statDesignsCount');
      const badgeEl = document.getElementById('tabDesignBadge');
      if (countEl) countEl.innerText = Math.max(0, parseInt(countEl.innerText || '1') - 1);
      if (badgeEl) badgeEl.innerText = Math.max(0, parseInt(badgeEl.innerText || '1') - 1);
    }
  } catch (err) {
    console.error(err);
    alert('Failed to delete design');
  }
}

// WhatsApp Share Utilities
function copyCatalogLink() {
  const input = document.getElementById('shareCatalogUrl');
  input.select();
  input.setSelectionRange(0, 99999);
  navigator.clipboard.writeText(input.value).then(() => {
    alert('Catalog link copied to clipboard! You can paste and send it on WhatsApp.');
  }).catch(() => {
    alert('Link: ' + input.value);
  });
}

function shareViaWhatsAppNative() {
  const url = document.getElementById('shareCatalogUrl').value;
  const msg = 
`Namaste! 🙏
Browse our latest *Blouse Embroidery & Maggam Work* designs here:
👉 ${url}

You can select designs, upload your blouse cloth photo, and submit directly! ✨`;

  const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
  window.open(waUrl, '_blank');
}

// Save Boutique Settings
async function saveBoutiqueSettings(event) {
  event.preventDefault();

  const bizName = document.getElementById('settingBizName').value.trim();
  const tagline = document.getElementById('settingTagline').value.trim();
  const whatsapp = document.getElementById('settingWhatsApp').value.trim();
  const pinEl = document.getElementById('settingPin');
  const pin = pinEl ? pinEl.value.trim() : '1439';
  const publicUrl = document.getElementById('settingPublicUrl').value.trim();

  const btn = document.getElementById('btnSaveSettings');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

  try {
    const formData = new FormData();
    formData.append('business_name', bizName);
    formData.append('tagline', tagline);
    formData.append('whatsapp_number', whatsapp);
    formData.append('admin_pin', pin);
    formData.append('public_url', publicUrl);

    const res = await fetch('/api/settings', {
      method: 'POST',
      body: formData
    });

    const data = await res.json();
    if (data.success) {
      alert('Settings saved successfully!');
      window.location.reload();
    } else {
      alert('Failed to save settings');
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Settings';
    }
  } catch (err) {
    console.error(err);
    alert('Error saving settings');
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Settings';
  }
}

// --- Local Radius & Meta Ads Studio Logic (Dharmavaram) ---
let radiusMap = null;
let radiusMarker = null;
let radiusCircle = null;
const DHARMAVARAM_LAT = 14.4137;
const DHARMAVARAM_LNG = 77.7281;

function initRadiusMap() {
  const mapEl = document.getElementById('radiusMap');
  if (!mapEl) return;
  if (typeof L === 'undefined') {
    console.warn('Leaflet library loading...');
    setTimeout(initRadiusMap, 300);
    return;
  }

  if (!radiusMap) {
    radiusMap = L.map('radiusMap').setView([DHARMAVARAM_LAT, DHARMAVARAM_LNG], 11);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    }).addTo(radiusMap);

    // Boutique Marker in Dharmavaram
    radiusMarker = L.marker([DHARMAVARAM_LAT, DHARMAVARAM_LNG]).addTo(radiusMap);
    radiusMarker.bindPopup("<b>Akshaya Blouse Embroidery Studio</b><br>Dharmavaram, Sri Sathya Sai District").openPopup();

    // Coverage Radius Circle (10km default)
    radiusCircle = L.circle([DHARMAVARAM_LAT, DHARMAVARAM_LNG], {
      color: '#6B1724',
      fillColor: '#D4AF37',
      fillOpacity: 0.28,
      weight: 2.5,
      radius: 10000 // 10 km
    }).addTo(radiusMap);
  } else {
    radiusMap.invalidateSize();
  }
}

async function onRadiusChange(km) {
  const radiusKm = parseInt(km);
  const label = document.getElementById('radiusLabel');
  if (label) label.innerText = `${radiusKm} KM`;

  if (radiusCircle) {
    radiusCircle.setRadius(radiusKm * 1000);
  }

  if (radiusMap) {
    if (radiusKm <= 5) radiusMap.setZoom(13);
    else if (radiusKm <= 15) radiusMap.setZoom(11);
    else if (radiusKm <= 30) radiusMap.setZoom(10);
    else radiusMap.setZoom(9);
  }

  // Update simulator subtitle
  const locSubtitle = document.getElementById('previewLocationSubtitle');
  if (locSubtitle) {
    locSubtitle.innerText = `Sponsored • Within ${radiusKm} km of Dharmavaram`;
  }

  // Fetch updated reach calculation
  try {
    const res = await fetch(`/api/meta/targeting?radius_km=${radiusKm}`);
    const data = await res.json();
    if (data) {
      const reachEl = document.getElementById('reachCount');
      if (reachEl) reachEl.innerText = `~${data.estimated_target_women.toLocaleString()}`;

      const townsEl = document.getElementById('coveredTownsList');
      if (townsEl && data.nearby_areas_covered) {
        townsEl.innerText = data.nearby_areas_covered.join(', ');
      }
    }
  } catch (e) {
    console.error(e);
  }
}

function setPreviewPlatform(platform) {
  const btnIg = document.getElementById('btnPreviewIg');
  const btnFb = document.getElementById('btnPreviewFb');
  const accName = document.getElementById('previewAccountName');
  const capUser = document.getElementById('previewCaptionUser');

  if (platform === 'instagram') {
    if (btnIg) btnIg.classList.add('active');
    if (btnFb) btnFb.classList.remove('active');
    if (accName) accName.innerText = 'akshaya_embroidery_dharmavaram';
    if (capUser) capUser.innerText = 'akshaya_embroidery_dharmavaram';
  } else {
    if (btnFb) btnFb.classList.add('active');
    if (btnIg) btnIg.classList.remove('active');
    if (accName) accName.innerText = 'Akshaya Blouse Embroidery Studio';
    if (capUser) capUser.innerText = 'Akshaya Blouse Embroidery Studio';
  }
}

function copyMetaFeedUrl() {
  const input = document.getElementById('metaFeedUrlInput');
  if (!input) return;
  input.select();
  navigator.clipboard.writeText(input.value).then(() => {
    alert('✅ Meta Commerce Product Feed link copied!\n\nPaste this URL in your Facebook Commerce Manager / Instagram Shopping data feed settings.');
  }).catch(() => {
    prompt('Copy Meta Feed Link:', input.value);
  });
}

