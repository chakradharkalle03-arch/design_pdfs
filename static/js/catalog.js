// Customer Catalog Interactive Logic
let selectedDesigns = new Map(); // id -> { id, code, title, thumb, image, category }
let activeCategory = 'All';
let currentZoomId = null;

document.addEventListener('DOMContentLoaded', () => {
  initSearch();
  initCategories();
  loadSavedSelection();
  updateUI();
});

// Category Filter Handling
function initCategories() {
  const pills = document.querySelectorAll('.cat-pill');
  pills.forEach(pill => {
    pill.addEventListener('click', () => {
      pills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      activeCategory = pill.getAttribute('data-category');
      filterDesigns();
    });
  });
}

// Search Handling
function initSearch() {
  const searchInput = document.getElementById('searchInput');
  if (!searchInput) return;
  searchInput.addEventListener('input', () => {
    filterDesigns();
  });
}

function filterDesigns() {
  const query = document.getElementById('searchInput').value.toLowerCase().trim();
  const cards = document.querySelectorAll('.design-card');
  let visibleCount = 0;

  cards.forEach(card => {
    const code = (card.getAttribute('data-code') || '').toLowerCase();
    const title = (card.getAttribute('data-title') || '').toLowerCase();
    const cat = (card.getAttribute('data-category') || '').toLowerCase();
    const tags = (card.getAttribute('data-tags') || '').toLowerCase();

    const matchesCategory = (activeCategory === 'All') || (cat === activeCategory.toLowerCase());
    const matchesSearch = !query || code.includes(query) || title.includes(query) || cat.includes(query) || tags.includes(query);

    if (matchesCategory && matchesSearch) {
      card.style.display = 'flex';
      visibleCount++;
    } else {
      card.style.display = 'none';
    }
  });

  const noResults = document.getElementById('noResults');
  if (noResults) {
    noResults.style.display = visibleCount === 0 ? 'block' : 'none';
  }
}

// Selection Handling
function toggleSelectDesign(id) {
  const card = document.querySelector(`.design-card[data-id="${id}"]`);
  if (!card) return;

  if (selectedDesigns.has(id)) {
    selectedDesigns.delete(id);
  } else {
    selectedDesigns.set(id, {
      id: id,
      code: card.getAttribute('data-code'),
      title: card.getAttribute('data-title'),
      category: card.getAttribute('data-category'),
      image: card.getAttribute('data-image'),
      thumb: card.getAttribute('data-thumb')
    });
  }

  saveSelection();
  updateUI();
}

function saveSelection() {
  try {
    const arr = Array.from(selectedDesigns.values());
    localStorage.setItem('chakri_selected_designs', JSON.stringify(arr));
  } catch (e) {
    console.error('Local storage save error', e);
  }
}

function loadSavedSelection() {
  try {
    const saved = localStorage.getItem('chakri_selected_designs');
    if (saved) {
      const arr = JSON.parse(saved);
      arr.forEach(item => {
        selectedDesigns.set(String(item.id), item);
      });
    }
  } catch (e) {
    console.error('Local storage load error', e);
  }
}

function updateUI() {
  // Update Cards in Catalog
  document.querySelectorAll('.design-card').forEach(card => {
    const id = card.getAttribute('data-id');
    const btn = card.querySelector('.btn-select');
    const icon = card.querySelector('.select-icon');
    const text = card.querySelector('.select-text');

    if (selectedDesigns.has(id)) {
      card.classList.add('is-selected');
      if (icon) icon.className = 'fa-solid fa-heart select-icon';
      if (text) text.innerText = 'Selected';
    } else {
      card.classList.remove('is-selected');
      if (icon) icon.className = 'fa-regular fa-heart select-icon';
      if (text) text.innerText = 'Select Design';
    }
  });

  // Update Bottom Sticky Bar
  const bar = document.getElementById('floatingOrderBar');
  const countBadge = document.getElementById('selectedCountBadge');
  const count = selectedDesigns.size;

  if (count > 0) {
    bar.classList.add('visible');
    countBadge.innerText = count;
  } else {
    bar.classList.remove('visible');
  }

  // Update Zoom Modal Select Button if active
  if (currentZoomId) {
    updateZoomModalButton();
  }
}

// Zoom Modal
function openZoomModal(id) {
  const card = document.querySelector(`.design-card[data-id="${id}"]`);
  if (!card) return;

  currentZoomId = id;
  const imgUrl = card.getAttribute('data-image');
  const code = card.getAttribute('data-code');
  const title = card.getAttribute('data-title');
  const cat = card.getAttribute('data-category');

  document.getElementById('zoomModalImg').src = imgUrl;
  document.getElementById('zoomModalCode').innerText = code;
  document.getElementById('zoomModalTitle').innerText = title;
  document.getElementById('zoomModalDesc').innerText = `Category: ${cat}`;

  updateZoomModalButton();
  document.getElementById('zoomModal').classList.add('active');
}

function updateZoomModalButton() {
  const btn = document.getElementById('zoomModalSelectBtn');
  if (!btn || !currentZoomId) return;

  const isSelected = selectedDesigns.has(currentZoomId);
  btn.innerHTML = isSelected 
    ? '<i class="fa-solid fa-check"></i> <span>Selected</span>' 
    : '<i class="fa-solid fa-heart"></i> <span>Select This Design</span>';
    
  btn.onclick = () => {
    toggleSelectDesign(currentZoomId);
  };
}

function closeZoomModal() {
  document.getElementById('zoomModal').classList.remove('active');
  currentZoomId = null;
}

// Order Modal & Blouse Upload
function openOrderModal() {
  if (selectedDesigns.size === 0) {
    alert('Please select at least 1 embroidery design first!');
    return;
  }

  // Render mini selected cards
  const grid = document.getElementById('modalSelectedGrid');
  grid.innerHTML = '';

  selectedDesigns.forEach(item => {
    const card = document.createElement('div');
    card.className = 'mini-thumb-card';
    card.innerHTML = `
      <img src="${item.thumb}" class="mini-thumb-img" alt="${item.code}">
      <div class="mini-thumb-code">${item.code}</div>
    `;
    grid.appendChild(card);
  });

  document.getElementById('modalFormContainer').style.display = 'block';
  document.getElementById('modalSuccessContainer').style.display = 'none';
  document.getElementById('orderModal').classList.add('active');
}

function closeOrderModal() {
  document.getElementById('orderModal').classList.remove('active');
}

function previewBlouseImage(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    document.getElementById('blousePreviewImg').src = e.target.result;
    document.getElementById('blousePreviewWrap').style.display = 'block';
  };
  reader.readAsDataURL(file);
}

function removeBlousePreview() {
  document.getElementById('blouseFileInput').value = '';
  document.getElementById('blousePreviewImg').src = '';
  document.getElementById('blousePreviewWrap').style.display = 'none';
}

// Order Submission
async function submitCustomerOrder(event) {
  event.preventDefault();

  const name = document.getElementById('custName').value.trim();
  const phone = document.getElementById('custPhone').value.trim();
  const notes = document.getElementById('custNotes').value.trim();
  const blouseFile = document.getElementById('blouseFileInput').files[0];

  if (!name || !phone) {
    alert('Please enter your Name and WhatsApp phone number');
    return;
  }

  const btnSubmit = document.getElementById('btnSubmitOrder');
  btnSubmit.disabled = true;
  btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';

  try {
    const formData = new FormData();
    formData.append('customer_name', name);
    formData.append('customer_phone', phone);
    formData.append('customer_notes', notes);

    const ids = Array.from(selectedDesigns.keys());
    formData.append('selected_design_ids', JSON.stringify(ids));

    if (blouseFile) {
      formData.append('blouse_image', blouseFile);
    }

    const response = await fetch('/api/orders', {
      method: 'POST',
      body: formData
    });

    const result = await response.json();

    if (result.success) {
      handleOrderSuccess(result.order, result.designs);
    } else {
      alert('Error submitting order: ' + (result.message || 'Unknown error'));
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Submit Design Selection';
    }
  } catch (err) {
    console.error(err);
    alert('Failed to submit order. Please check your connection.');
    btnSubmit.disabled = false;
    btnSubmit.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Submit Design Selection';
  }
}

function handleOrderSuccess(order, designs) {
  // Clear selection in localStorage
  selectedDesigns.clear();
  saveSelection();
  updateUI();

  // Populate Success Screen
  document.getElementById('modalFormContainer').style.display = 'none';
  document.getElementById('modalSuccessContainer').style.display = 'block';
  document.getElementById('successOrderCode').innerText = order.order_code;

  // Build WhatsApp formatted message
  const ownerWhatsApp = window.BOUTIQUE_CONFIG.whatsappNumber || '';
  const baseUrl = window.BOUTIQUE_CONFIG.baseUrl || window.location.origin;
  const orderUrl = `${baseUrl}/order/${order.order_code}`;

  let designListText = '';
  (designs || []).forEach((d, idx) => {
    designListText += `${idx + 1}. *${d.title}* (Code: *${d.code}*)\n`;
  });

  const blouseNote = order.blouse_image_path 
    ? '✅ Blouse fabric photo uploaded online' 
    : 'ℹ️ Blouse photo not attached';

  const waMessage = 
`🌸 *${window.BOUTIQUE_CONFIG.businessName}* 🌸
*New Blouse Embroidery Order Request*

📋 *Order ID:* #${order.order_code}
👤 *Customer Name:* ${order.customer_name}
📱 *Phone:* ${order.customer_phone}

✨ *Selected Designs:*
${designListText}
🧵 *Blouse Material:* ${blouseNote}
📝 *Notes:* ${order.customer_notes || 'None'}

🔗 *View Order & Blouse Fabric Online:*
${orderUrl}`;

  const waUrl = `https://wa.me/${ownerWhatsApp}?text=${encodeURIComponent(waMessage)}`;
  document.getElementById('btnWhatsAppDirect').href = waUrl;
  document.getElementById('btnViewReceipt').href = `/order/${order.order_code}`;
}

function resetOrderModal() {
  closeOrderModal();
  document.getElementById('orderForm').reset();
  removeBlousePreview();
}

// Tailor Toolbar Quick Actions
function copyCustomerCatalogUrl() {
  const url = (window.BOUTIQUE_CONFIG && window.BOUTIQUE_CONFIG.baseUrl) ? window.BOUTIQUE_CONFIG.baseUrl : window.location.origin;
  navigator.clipboard.writeText(url).then(() => {
    alert('✅ Catalog link copied to clipboard!\n\n' + url + '\n\nYou can now open WhatsApp and paste this link to your customer!');
  }).catch(() => {
    prompt('Copy this link to send to your customer on WhatsApp:', url);
  });
}

function shareDirectWhatsApp() {
  const url = (window.BOUTIQUE_CONFIG && window.BOUTIQUE_CONFIG.baseUrl) ? window.BOUTIQUE_CONFIG.baseUrl : window.location.origin;
  const bizName = (window.BOUTIQUE_CONFIG && window.BOUTIQUE_CONFIG.businessName) ? window.BOUTIQUE_CONFIG.businessName : 'Chakri Blouse Embroidery Studio';
  const msg = 
`🌸 *${bizName}* 🌸
Namaste! 🙏

Browse our latest *Blouse Embroidery & Maggam Work* designs catalog here:
👉 ${url}

✨ How to order:
1. Select your favorite embroidery designs
2. Upload a photo of your blouse material / saree border
3. Submit and we will craft the perfect matching embroidery!`;

  const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
  window.open(waUrl, '_blank');
}

