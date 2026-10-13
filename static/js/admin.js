// Admin Dashboard Logic (Open access - No PIN required)
document.addEventListener('DOMContentLoaded', () => {
  initDragAndDrop();
  checkUrlHash();
  initAdStudio();
  detectLiveLocation(false);
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
    setTimeout(() => {
      initRadiusMap();
      if (radiusMap) radiusMap.invalidateSize();
    }, 150);
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

// --- Local Radius & Meta Ads Studio Logic (Live Location & Dharmavaram) ---
let radiusMap = null;
let radiusMarker = null;
let radiusCircle = null;

const DHARMAVARAM_DEFAULT = {
  lat: 14.4137,
  lng: 77.7281,
  name: "Dharmavaram",
  district: "Sri Sathya Sai",
  state: "Andhra Pradesh",
  fullText: "Dharmavaram, Sri Sathya Sai District, Andhra Pradesh"
};

let currentLiveLocation = { ...DHARMAVARAM_DEFAULT };
let currentRadiusKm = 10;
let activeDesignIndex = 0;
let activePlatform = 'instagram'; // 'instagram' | 'story' | 'facebook'
let autoCycleTimer = null;

// Initialize Ad Studio on Page Load
function initAdStudio() {
  const designs = window.CATALOG_DESIGNS || [];
  const totalCountEl = document.getElementById('adDesignTotalCount');
  if (totalCountEl) totalCountEl.innerText = designs.length;

  renderDesignPicker();
  renderAdMockup();
}

// Render Horizontal Scrollable Cards of All Catalog Designs
function renderDesignPicker() {
  const container = document.getElementById('adDesignPicker');
  if (!container) return;

  const designs = window.CATALOG_DESIGNS || [];
  if (designs.length === 0) {
    container.innerHTML = '<div style="color: #999; font-size: 0.82rem; padding: 10px;">No catalog designs uploaded yet.</div>';
    return;
  }

  container.innerHTML = '';
  designs.forEach((d, idx) => {
    const card = document.createElement('div');
    card.className = `ad-design-picker-card ${idx === activeDesignIndex ? 'active' : ''}`;
    card.onclick = () => selectDesignForAd(idx);

    const imgPath = '/' + (d.thumb_path || d.image_path || '').replace(/^\//, '');
    card.innerHTML = `
      <img src="${imgPath}" alt="${d.title}" class="ad-design-picker-img" loading="lazy">
      <div class="ad-design-picker-code">${d.code}</div>
      <div class="ad-design-picker-cat">${d.category || 'Embroidery'}</div>
      <div class="ad-design-picker-badge"><i class="fa-solid fa-check"></i></div>
    `;
    container.appendChild(card);
  });
}

function selectDesignForAd(index) {
  const designs = window.CATALOG_DESIGNS || [];
  if (index < 0 || index >= designs.length) return;
  activeDesignIndex = index;

  // Update visual selection in picker cards
  const cards = document.querySelectorAll('.ad-design-picker-card');
  cards.forEach((c, idx) => {
    if (idx === activeDesignIndex) {
      c.classList.add('active');
      c.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    } else {
      c.classList.remove('active');
    }
  });

  renderAdMockup();
}

function cycleNextDesign() {
  const designs = window.CATALOG_DESIGNS || [];
  if (designs.length === 0) return;
  const nextIdx = (activeDesignIndex + 1) % designs.length;
  selectDesignForAd(nextIdx);
}

function cyclePrevDesign() {
  const designs = window.CATALOG_DESIGNS || [];
  if (designs.length === 0) return;
  const prevIdx = (activeDesignIndex - 1 + designs.length) % designs.length;
  selectDesignForAd(prevIdx);
}

function toggleAutoCycle() {
  const btn = document.getElementById('btnAutoCycle');
  if (autoCycleTimer) {
    clearInterval(autoCycleTimer);
    autoCycleTimer = null;
    if (btn) btn.innerHTML = '<i class="fa-solid fa-play"></i> Auto-Play';
  } else {
    autoCycleTimer = setInterval(cycleNextDesign, 4000);
    if (btn) btn.innerHTML = '<i class="fa-solid fa-pause"></i> Pause';
  }
}

function setAdPlatform(platform) {
  activePlatform = platform;

  const btnIg = document.getElementById('btnPreviewIg');
  const btnStory = document.getElementById('btnPreviewStory');
  const btnFb = document.getElementById('btnPreviewFb');

  if (btnIg) btnIg.classList.toggle('active', platform === 'instagram');
  if (btnStory) btnStory.classList.toggle('active', platform === 'story');
  if (btnFb) btnFb.classList.toggle('active', platform === 'facebook');

  const viewIg = document.getElementById('mockupIgSquare');
  const viewStory = document.getElementById('mockupIgStory');
  const viewFb = document.getElementById('mockupFb');

  if (viewIg) viewIg.style.display = platform === 'instagram' ? 'block' : 'none';
  if (viewStory) viewStory.style.display = platform === 'story' ? 'flex' : 'none';
  if (viewFb) viewFb.style.display = platform === 'facebook' ? 'block' : 'none';

  renderAdMockup();
}

function renderAdMockup() {
  const designs = window.CATALOG_DESIGNS || [];
  if (designs.length === 0) return;

  const d = designs[activeDesignIndex] || designs[0];
  const baseUrl = (window.ADMIN_CONFIG && window.ADMIN_CONFIG.baseUrl) ? window.ADMIN_CONFIG.baseUrl : 'http://localhost:8000';
  const whatsappNumber = (window.ADMIN_CONFIG && window.ADMIN_CONFIG.whatsapp) ? window.ADMIN_CONFIG.whatsapp : '917075101007';

  const imgPath = '/' + (d.image_path || d.thumb_path || '').replace(/^\//, '');
  const deepLink = `${baseUrl}/?select=${d.code}`;
  const locationTag = `Sponsored • Within ${currentRadiusKm} km of ${currentLiveLocation.name}`;
  
  const waInquiryMsg = `Namaste Akshaya Studio! I saw your ${activePlatform.toUpperCase()} ad for design ${d.code} (${d.title}). I want to order this with my blouse fabric!`;
  const waUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(waInquiryMsg)}`;

  // 1. Instagram Square Feed Mockup
  const igImg = document.getElementById('previewAdImage');
  if (igImg) igImg.src = imgPath;

  const igBadge = document.getElementById('previewDesignBadge');
  if (igBadge) igBadge.innerText = d.code;

  const igLocSub = document.getElementById('previewLocationSubtitle');
  if (igLocSub) igLocSub.innerText = locationTag;

  const igCtaLink = document.getElementById('previewCtaLink');
  if (igCtaLink) igCtaLink.href = deepLink;

  const igCaption = document.getElementById('previewCaptionText');
  if (igCaption) {
    igCaption.innerHTML = `✨ Royal handcrafted <strong>${d.title}</strong> (${d.code}) in ${currentLiveLocation.name}! Hand-stitched Maggam &amp; Aari embroidery for silk saree blouses. Bring your blouse cloth for custom matching. WhatsApp: <strong>7075101007</strong>. Tap 'Shop Now' to view design! #DharmavaramSilk #BlouseEmbroidery #${d.code} #MaggamWork`;
  }

  const igTimeLoc = document.getElementById('previewTimeLocation');
  if (igTimeLoc) {
    igTimeLoc.innerText = `Just now • ${currentLiveLocation.name}, ${currentLiveLocation.district}`;
  }

  // 2. Instagram Story Mockup (9:16)
  const storyImg = document.getElementById('previewStoryImage');
  if (storyImg) storyImg.src = imgPath;

  const storyLoc = document.getElementById('previewStoryLocation');
  if (storyLoc) storyLoc.innerText = `Sponsored • ${currentLiveLocation.name}`;

  const storyBadge = document.getElementById('storyDesignCodeBadge');
  if (storyBadge) storyBadge.innerText = `DESIGN: ${d.code} • ${(d.category || 'MAGGAM WORK').toUpperCase()}`;

  const storyTitle = document.getElementById('storyDesignTitleText');
  if (storyTitle) storyTitle.innerText = d.title;

  const storyCta = document.getElementById('storyCtaButton');
  if (storyCta) storyCta.href = waUrl;

  // 3. Facebook Feed Mockup
  const fbImg = document.getElementById('fbAdImage');
  if (fbImg) fbImg.src = imgPath;

  const fbLoc = document.getElementById('fbLocationSubtitle');
  if (fbLoc) {
    fbLoc.innerHTML = `Sponsored &bull; Within ${currentRadiusKm} km of ${currentLiveLocation.name} &bull; <i class="fa-solid fa-earth-americas"></i>`;
  }

  const fbCap = document.getElementById('fbCaptionText');
  if (fbCap) {
    fbCap.innerHTML = `✨ Handcrafted Bridal Maggam &amp; Blouse Embroidery in ${currentLiveLocation.name}! Bring your own blouse material or choose custom patterns. WhatsApp: <strong>7075101007</strong> for orders. 🌸 Design: ${d.title} (${d.code}).`;
  }

  const fbLinkTitle = document.getElementById('fbLinkTitle');
  if (fbLinkTitle) fbLinkTitle.innerText = `${d.title} (${d.code}) - Order Online`;

  const fbCta = document.getElementById('fbCtaBtn');
  if (fbCta) fbCta.href = waUrl;

  // Toolbar WhatsApp Test Link
  const testWaBtn = document.getElementById('btnTestWhatsAppAd');
  if (testWaBtn) testWaBtn.href = waUrl;
}

// Copy Viral Caption to Clipboard
function copyAdCaption() {
  const designs = window.CATALOG_DESIGNS || [];
  const d = designs[activeDesignIndex] || designs[0];
  if (!d) return;

  const baseUrl = (window.ADMIN_CONFIG && window.ADMIN_CONFIG.baseUrl) ? window.ADMIN_CONFIG.baseUrl : 'http://localhost:8000';
  const text = `✨ Exclusive Handcrafted Blouse Embroidery & Maggam Work in ${currentLiveLocation.name}!
🌸 Design: ${d.title} (Code: ${d.code})
👗 Category: ${d.category}

👉 View Online: ${baseUrl}/?select=${d.code}
📱 Order on WhatsApp: https://wa.me/917075101007?text=Hi!+I+want+to+order+design+${d.code}

Bring your blouse fabric and get royal custom matching embroidery!
#DharmavaramSilk #BlouseEmbroidery #MaggamWork #BridalBlouse #${d.code}`;

  navigator.clipboard.writeText(text).then(() => {
    alert(`✅ Ad Caption for design ${d.code} copied to clipboard!\n\nYou can paste it directly onto Instagram, Facebook, or WhatsApp.`);
  }).catch(() => {
    prompt('Copy Ad Caption:', text);
  });
}

// Client-Side Canvas Ad Image Generator (1:1 & 9:16)
function downloadBrandedAdImage(format) {
  const designs = window.CATALOG_DESIGNS || [];
  const d = designs[activeDesignIndex] || designs[0];
  if (!d) {
    alert('Please select a design first.');
    return;
  }

  const canvas = document.getElementById('adCanvas') || document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const isStory = format === 'story';

  const W = 1080;
  const H = isStory ? 1920 : 1080;
  canvas.width = W;
  canvas.height = H;

  const imgPath = '/' + (d.image_path || d.thumb_path || '').replace(/^\//, '');
  const img = new Image();
  img.crossOrigin = 'anonymous';

  img.onload = () => {
    // 1. Royal Maroon Background
    const bgGradient = ctx.createLinearGradient(0, 0, W, H);
    bgGradient.addColorStop(0, '#420810');
    bgGradient.addColorStop(0.5, '#6B1724');
    bgGradient.addColorStop(1, '#2F050A');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, W, H);

    // 2. Gold Frame Border
    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 14;
    ctx.strokeRect(20, 20, W - 40, H - 40);

    ctx.strokeStyle = '#F7E7CE';
    ctx.lineWidth = 3;
    ctx.strokeRect(32, 32, W - 64, H - 64);

    // 3. Header Studio Branding
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.font = 'bold 44px "Playfair Display", Georgia, serif';
    ctx.fillText('AKSHAYA BLOUSE EMBROIDERY STUDIO', W / 2, 95);

    ctx.fillStyle = '#D4AF37';
    ctx.font = 'bold 24px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(`👑 ${currentLiveLocation.name.toUpperCase()} • SRI SATHYA SAI DISTRICT, AP 👑`, W / 2, 135);

    // 4. Main Design Image
    let imgX = 60;
    let imgY = isStory ? 280 : 170;
    let imgW = W - 120;
    let imgH = isStory ? 1200 : 700;

    // Draw Gold Container Box for Image
    ctx.fillStyle = '#111';
    ctx.fillRect(imgX - 4, imgY - 4, imgW + 8, imgH + 8);
    ctx.drawImage(img, imgX, imgY, imgW, imgH);

    // Inner gold border around photo
    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 6;
    ctx.strokeRect(imgX, imgY, imgW, imgH);

    // 5. Design Code Ribbon Overlay
    const ribbonY = imgY + imgH - 70;
    ctx.fillStyle = 'rgba(107, 23, 36, 0.92)';
    ctx.fillRect(imgX, ribbonY, imgW, 70);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 32px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`CODE: ${d.code} • ${(d.category || 'MAGGAM WORK').toUpperCase()}`, imgX + 24, ribbonY + 46);

    ctx.fillStyle = '#F4E7BD';
    ctx.font = '22px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(d.title.length > 28 ? d.title.substring(0, 26) + '...' : d.title, imgX + imgW - 24, ribbonY + 46);

    // 6. Bottom WhatsApp & CTA Banner
    const footerY = isStory ? 1540 : 895;
    const footerH = isStory ? 290 : 145;

    ctx.fillStyle = '#25D366'; // WhatsApp Green
    ctx.fillRect(50, footerY, W - 100, footerH);

    ctx.fillStyle = '#0F381E';
    ctx.textAlign = 'center';
    ctx.font = 'bold 46px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('📱 WhatsApp Orders: +91 7075101007', W / 2, footerY + (isStory ? 80 : 65));

    ctx.font = 'bold 26px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#062612';
    ctx.fillText('✨ Handcrafted Maggam Embroidery • Bring Your Blouse Cloth ✨', W / 2, footerY + (isStory ? 140 : 110));

    if (isStory) {
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 24px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(`Targeting within ${currentRadiusKm} km of ${currentLiveLocation.name}`, W / 2, footerY + 210);
    }

    // Trigger instant download
    const link = document.createElement('a');
    link.download = `Akshaya_Ad_${d.code}_${format}.jpg`;
    link.href = canvas.toDataURL('image/jpeg', 0.92);
    link.click();
  };

  img.onerror = () => {
    alert('Unable to load image for canvas. Please ensure the design image is accessible.');
  };

  img.src = imgPath;
}

// --- Live Location Recognition (GPS + IP Fallback) ---
function detectLiveLocation(forcePrompt = false) {
  const titleEl = document.getElementById('liveLocationTitle');
  const coordsEl = document.getElementById('liveLocationCoords');

  if (titleEl) titleEl.innerText = 'Detecting your live online GPS / IP location...';
  if (coordsEl) coordsEl.innerText = 'Connecting to online geolocation service...';

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        await resolveCoordinatesAndCenter(lat, lng, 'Live GPS Position');
      },
      async (err) => {
        console.warn('HTML5 Geolocation unavailable or denied, falling back to IP-based location:', err.message);
        await detectLocationViaIP();
      },
      { timeout: 7000, enableHighAccuracy: true }
    );
  } else {
    detectLocationViaIP();
  }
}

async function detectLocationViaIP() {
  try {
    const res = await fetch('https://ipapi.co/json/');
    const data = await res.json();
    if (data && data.latitude && data.longitude) {
      const city = data.city || 'Dharmavaram';
      const region = data.region || 'Andhra Pradesh';
      await resolveCoordinatesAndCenter(data.latitude, data.longitude, `${city}, ${region}`);
    } else {
      setBaseDharmavaram();
    }
  } catch (e) {
    console.warn('IP geolocation failed, using default Dharmavaram center:', e);
    setBaseDharmavaram();
  }
}

async function resolveCoordinatesAndCenter(lat, lng, sourceLabel) {
  let placeName = 'Dharmavaram';
  let districtName = 'Sri Sathya Sai';
  let stateName = 'Andhra Pradesh';
  let fullLabel = `${placeName}, ${districtName} District, ${stateName}`;

  try {
    // Reverse Geocode using OpenStreetMap Nominatim
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
    const geo = await res.json();
    if (geo && geo.address) {
      const a = geo.address;
      placeName = a.city || a.town || a.village || a.suburb || a.county || 'Dharmavaram';
      districtName = a.state_district || a.county || 'Sri Sathya Sai';
      stateName = a.state || 'Andhra Pradesh';
      fullLabel = `${placeName}, ${districtName} Dist, ${stateName}`;
    }
  } catch (e) {
    console.warn('Reverse geocoding error:', e);
  }

  currentLiveLocation = {
    lat: lat,
    lng: lng,
    name: placeName,
    district: districtName,
    state: stateName,
    fullText: fullLabel
  };

  updateLocationUI(sourceLabel);
  updateMapPosition();
  onRadiusChange(currentRadiusKm);
}

function updateLocationUI(sourceLabel = 'Online Live Location') {
  const titleEl = document.getElementById('liveLocationTitle');
  const coordsEl = document.getElementById('liveLocationCoords');
  const badgePlace = document.getElementById('badgeTargetPlace');

  if (titleEl) titleEl.innerText = `${currentLiveLocation.name}, ${currentLiveLocation.district} Dist, ${currentLiveLocation.state}`;
  if (coordsEl) coordsEl.innerText = `Coordinates: ${currentLiveLocation.lat.toFixed(4)}° N, ${currentLiveLocation.lng.toFixed(4)}° E • ${sourceLabel}`;
  if (badgePlace) badgePlace.innerText = `${currentLiveLocation.name} Center`;

  renderAdMockup();
}

function setBaseDharmavaram() {
  currentLiveLocation = { ...DHARMAVARAM_DEFAULT };
  updateLocationUI('Dharmavaram Boutique Base (515671)');
  updateMapPosition();
  onRadiusChange(currentRadiusKm);
}

async function searchLocationCustom() {
  const input = document.getElementById('citySearchInput');
  if (!input || !input.value.trim()) return;

  const query = input.value.trim();
  const titleEl = document.getElementById('liveLocationTitle');
  if (titleEl) titleEl.innerText = `Searching location for: "${query}"...`;

  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
    const results = await res.json();
    if (results && results.length > 0) {
      const item = results[0];
      const lat = parseFloat(item.lat);
      const lng = parseFloat(item.lon);
      await resolveCoordinatesAndCenter(lat, lng, `Searched: ${query}`);
    } else {
      alert(`Location "${query}" not found. Please try another town or district.`);
      updateLocationUI();
    }
  } catch (e) {
    console.error(e);
    alert('Error searching location. Check your internet connection.');
    updateLocationUI();
  }
}

// Map Rendering with Leaflet
function initRadiusMap() {
  const mapEl = document.getElementById('radiusMap');
  if (!mapEl) return;
  if (typeof L === 'undefined') {
    setTimeout(initRadiusMap, 250);
    return;
  }

  if (!radiusMap) {
    radiusMap = L.map('radiusMap').setView([currentLiveLocation.lat, currentLiveLocation.lng], 11);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    }).addTo(radiusMap);

    radiusMarker = L.marker([currentLiveLocation.lat, currentLiveLocation.lng]).addTo(radiusMap);
    radiusMarker.bindPopup(`<b>Akshaya Blouse Embroidery Studio</b><br>${currentLiveLocation.fullText}`).openPopup();

    radiusCircle = L.circle([currentLiveLocation.lat, currentLiveLocation.lng], {
      color: '#6B1724',
      fillColor: '#D4AF37',
      fillOpacity: 0.28,
      weight: 2.5,
      radius: currentRadiusKm * 1000
    }).addTo(radiusMap);
  } else {
    updateMapPosition();
    radiusMap.invalidateSize();
  }
}

function updateMapPosition() {
  if (!radiusMap) return;

  const latlng = [currentLiveLocation.lat, currentLiveLocation.lng];
  radiusMap.setView(latlng, getZoomForRadius(currentRadiusKm));

  if (radiusMarker) {
    radiusMarker.setLatLng(latlng);
    radiusMarker.bindPopup(`<b>Akshaya Blouse Embroidery Studio</b><br>${currentLiveLocation.fullText}`).openPopup();
  }

  if (radiusCircle) {
    radiusCircle.setLatLng(latlng);
    radiusCircle.setRadius(currentRadiusKm * 1000);
  }
}

function getZoomForRadius(km) {
  if (km <= 4) return 13;
  if (km <= 12) return 11;
  if (km <= 25) return 10;
  if (km <= 40) return 9;
  return 8;
}

async function onRadiusChange(km) {
  currentRadiusKm = parseInt(km);
  const label = document.getElementById('radiusLabel');
  if (label) label.innerText = `${currentRadiusKm} KM`;

  if (radiusCircle) {
    radiusCircle.setRadius(currentRadiusKm * 1000);
  }

  if (radiusMap) {
    radiusMap.setZoom(getZoomForRadius(currentRadiusKm));
  }

  renderAdMockup();

  // Fetch updated reach calculation dynamically
  try {
    const res = await fetch(`/api/meta/targeting?radius_km=${currentRadiusKm}&lat=${currentLiveLocation.lat}&lng=${currentLiveLocation.lng}&location_name=${encodeURIComponent(currentLiveLocation.name)}`);
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

function copyMetaFeedUrl() {
  const input = document.getElementById('metaFeedUrlInput');
  if (!input) return;
  input.select();
  navigator.clipboard.writeText(input.value).then(() => {
    alert('✅ Meta Commerce Product Feed link copied!\n\nPaste this XML feed URL in your Facebook Commerce Manager / Instagram Shopping data feed settings.');
  }).catch(() => {
    prompt('Copy Meta Feed Link:', input.value);
  });
}


