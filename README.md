# 🌸 Chakri Blouse Embroidery Studio & Online Customer Catalog

A complete, mobile-first web application designed specifically for **blouse embroidery boutiques & tailors**. 

Solve your phone storage problem: instead of sending huge PDF files and photos on WhatsApp that clutter your phone and your customers' phones, upload them once to this web application. Customers can view designs, select their favorites, upload a photo of their blouse material/saree, and submit orders directly via web and WhatsApp!

---

## 🌟 Key Features

### 1. 📱 For Customers (Mobile-First Experience)
- **Fast, Lightweight Catalog:** Browse embroidery designs without downloading heavy files to phone storage.
- **Smart Filters & Search:** Filter by Maggam Work, Bridal Heavy, Aari Work, Sleeve Designs, Cutwork, etc., or search by design code (e.g., `BL-101`) or keywords.
- **High-Definition Previews:** Tap any design to zoom into intricate zari, bead, and stone details.
- **Select Designs:** Tap ❤️ to choose designs and see a floating order counter.
- **Blouse Material Photo Upload:** Customers can take a photo of their unstitched blouse cloth or saree border directly with their phone camera so you can match the perfect thread, zari, and bead colors!
- **1-Click WhatsApp Order Submission:** Generates an order reference (`#ORD-xxxx`) and opens WhatsApp with a pre-written message containing all selected designs and links.
- **Screenshot Receipt Card:** Dedicated page displaying the customer's blouse photo side-by-side with selected embroidery designs, perfect for screenshotting!

### 2. 🪡 For Tailor / Boutique Owner (Admin Portal)
- **Order Management Dashboard:**
  - View all customer orders with customer name, WhatsApp phone number, and instructions.
  - View the customer's uploaded blouse fabric photo.
  - Compare the customer's blouse material with their selected embroidery designs side-by-side.
  - 1-Click button: **"Chat on WhatsApp"** directly with the customer.
  - Update order status (`NEW`, `CONTACTED`, `IN PROGRESS`, `COMPLETED`).
- **Instant Design & PDF Upload:**
  - **Upload PDF files:** Automatically extracts every page of a multi-page PDF catalog into separate high-resolution design cards!
  - **Upload Images:** Supports JPG, PNG, WEBP with auto-generated thumbnails.
  - Custom categories, design codes, titles, and tags.
- **WhatsApp Share Studio & QR Code:**
  - 1-Click "Copy Customer Link" to quickly send to any customer inquiring on WhatsApp.
  - Downloadable/Printable QR Code for your shop counter.
- **1-Click Backup:**
  - Download a complete ZIP backup of all design images, blouse photos, and database at any time.

---

## 🚀 How to Run the Application

### Option 1: One-Click (Easiest)
Simply double-click:
```
start_server.bat
```
The server will start on port `8000`.

### Option 2: Command Line
Open PowerShell or Terminal in this folder and run:
```powershell
python -m uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

---

## 🌐 URLs & Access

- **Customer Store / Catalog:** [http://localhost:8000/](http://localhost:8000/)
- **Local Wi-Fi Access (from mobile phone):** `http://192.168.1.105:8000/` *(Your computer and phone must be on the same Wi-Fi)*
- **WhatsApp Number:** `+91 7075101007`
- **Tailor Admin Portal:** [http://localhost:8000/admin](http://localhost:8000/admin) (Instant access - No PIN required)

---

## 🌍 Sharing Online with Customers Anywhere in the World
To send links to customers outside your shop or Wi-Fi (e.g. over 4G/5G mobile networks):
1. Keep `start_server.bat` running.
2. Double-click `share_online.bat`.
3. It will give you a public web URL (e.g. `https://xxxx.loca.lt`).
4. Copy that URL and paste it into the **Admin Settings > Public Website URL** box, or send it directly on WhatsApp!

---

## 🔒 Important Note Regarding Google Drive Security

In your request, you shared your Google account credentials:
`email: kallechakri022@gmail.com`

> **Security Warning:**
> Never share your personal Google account password in chat prompts or automated scripts. Google's modern security systems block raw password logins for APIs to protect your account.
> 
> **How backups work in this system:**
> 1. All your uploaded designs, original PDFs, and customer blouse photos are safely stored locally in your computer in `uploads/designs/` and `uploads/blouses/`.
> 2. You can click **"Download Full Backup ZIP"** in the Admin Portal anytime to get an instant archive to save directly into Google Drive or a pen drive.
> 3. If you want automatic cloud sync, you can place a Google Cloud `service_account.json` file in this folder and the system will sync backups automatically!
