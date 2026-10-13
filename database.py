import sqlite3
import json
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "embroidery.db")

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    
    # Designs table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS designs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        description TEXT,
        image_path TEXT NOT NULL,
        thumb_path TEXT NOT NULL,
        pdf_source TEXT,
        pdf_page INTEGER,
        tags TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    
    # Customer Orders table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_code TEXT NOT NULL UNIQUE,
        customer_name TEXT NOT NULL,
        customer_phone TEXT NOT NULL,
        blouse_image_path TEXT,
        selected_design_ids TEXT NOT NULL,
        customer_notes TEXT,
        status TEXT DEFAULT 'NEW',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    
    # Settings table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
    )
    """)
    
    # Default settings
    default_settings = {
        "business_name": "Chakri Blouse Embroidery Studio",
        "tagline": "Exclusive Handcrafted & Maggam Embroidery Designs for Designer Blouses",
        "whatsapp_number": "917075101007",
        "owner_email": "kallechakri022@gmail.com",
        "admin_pin": "1439",
        "currency": "₹",
        "public_url": "",
        "auto_gdrive_sync": "false"
    }
    
    for key, val in default_settings.items():
        cursor.execute("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)", (key, val))
        
    # Check if sample designs need to be seeded
    cursor.execute("SELECT COUNT(*) as cnt FROM designs")
    if cursor.fetchone()["cnt"] == 0:
        sample_designs = [
            (
                "BL-101",
                "Royal Peacock Maggam Back Neck",
                "Maggam Work",
                "Exquisite handcrafted bridal maggam design featuring regal peacock motifs with gold zari, antique beads, and kundan stone embellishment.",
                "uploads/designs/BL-101_peacock_maggam.jpg",
                "uploads/designs/thumb_BL-101_peacock_maggam.jpg",
                "sample_embroidery_catalog.pdf",
                1,
                "peacock, bridal, maroon, maggam, gold zari"
            ),
            (
                "BL-102",
                "Lotus & Mango Paisley Sleeve Zardosi",
                "Sleeve Design",
                "Grand elbow-length sleeve embroidery with sacred lotus and traditional mango paisley patterns, crafted with gold pearls and zardosi work.",
                "uploads/designs/BL-102_lotus_sleeve.jpg",
                "uploads/designs/thumb_BL-102_lotus_sleeve.jpg",
                "sample_embroidery_catalog.pdf",
                2,
                "sleeve, lotus, paisley, blue, zardosi, pearls"
            ),
            (
                "BL-103",
                "Emerald Cutwork & Floral Back Neck",
                "Cutwork",
                "Delicate cutwork back neck with floral vines and antique gold thread work, finished with button detailing for a contemporary festive look.",
                "uploads/designs/BL-103_cutwork_backneck.jpg",
                "uploads/designs/thumb_BL-103_cutwork_backneck.jpg",
                "sample_embroidery_catalog.pdf",
                3,
                "cutwork, backneck, green, floral, elegant"
            )
        ]
        
        cursor.executemany("""
        INSERT INTO designs (code, title, category, description, image_path, thumb_path, pdf_source, pdf_page, tags)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, sample_designs)
        
    conn.commit()
    conn.close()

# Design CRUD
def get_all_designs(category=None, search=None, only_active=True):
    conn = get_db()
    cursor = conn.cursor()
    query = "SELECT * FROM designs WHERE 1=1"
    params = []
    
    if only_active:
        query += " AND is_active = 1"
        
    if category and category.lower() != 'all':
        query += " AND LOWER(category) = LOWER(?)"
        params.append(category)
        
    if search:
        search_term = f"%{search.lower()}%"
        query += " AND (LOWER(title) LIKE ? OR LOWER(code) LIKE ? OR LOWER(tags) LIKE ? OR LOWER(category) LIKE ?)"
        params.extend([search_term, search_term, search_term, search_term])
        
    query += " ORDER BY id DESC"
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_design_by_id(design_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM designs WHERE id = ?", (design_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def get_designs_by_ids(id_list):
    if not id_list:
        return []
    conn = get_db()
    cursor = conn.cursor()
    placeholders = ",".join(["?"] * len(id_list))
    cursor.execute(f"SELECT * FROM designs WHERE id IN ({placeholders})", id_list)
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def add_design(code, title, category, description, image_path, thumb_path, pdf_source=None, pdf_page=None, tags=""):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO designs (code, title, category, description, image_path, thumb_path, pdf_source, pdf_page, tags)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (code, title, category, description, image_path, thumb_path, pdf_source, pdf_page, tags))
    design_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return design_id

def delete_design(design_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM designs WHERE id = ?", (design_id,))
    conn.commit()
    conn.close()

def update_design(design_id, title, category, description, code=None, tags=None):
    conn = get_db()
    cursor = conn.cursor()
    query = "UPDATE designs SET title = ?, category = ?, description = ?"
    params = [title, category, description]
    if code:
        query += ", code = ?"
        params.append(code)
    if tags is not None:
        query += ", tags = ?"
        params.append(tags)
    query += " WHERE id = ?"
    params.append(design_id)
    cursor.execute(query, params)
    conn.commit()
    conn.close()

# Order CRUD
def create_order(customer_name, customer_phone, selected_design_ids, blouse_image_path=None, customer_notes=""):
    conn = get_db()
    cursor = conn.cursor()
    
    # Generate unique order code
    timestamp_suffix = datetime.now().strftime("%y%m%d-%H%M%S")
    order_code = f"ORD-{timestamp_suffix}"
    
    if isinstance(selected_design_ids, list):
        selected_design_ids = json.dumps(selected_design_ids)
        
    cursor.execute("""
    INSERT INTO orders (order_code, customer_name, customer_phone, blouse_image_path, selected_design_ids, customer_notes, status)
    VALUES (?, ?, ?, ?, ?, ?, 'NEW')
    """, (order_code, customer_name, customer_phone, blouse_image_path, selected_design_ids, customer_notes))
    order_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return {"id": order_id, "order_code": order_code}

def get_all_orders(status=None):
    conn = get_db()
    cursor = conn.cursor()
    if status and status.upper() != 'ALL':
        cursor.execute("SELECT * FROM orders WHERE UPPER(status) = UPPER(?) ORDER BY id DESC", (status,))
    else:
        cursor.execute("SELECT * FROM orders ORDER BY id DESC")
    rows = cursor.fetchall()
    orders = []
    for r in rows:
        d = dict(r)
        try:
            d["selected_design_ids"] = json.loads(d["selected_design_ids"])
        except Exception:
            d["selected_design_ids"] = []
        orders.append(d)
    conn.close()
    return orders

def get_order_by_code(order_code):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM orders WHERE order_code = ?", (order_code,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return None
    d = dict(row)
    try:
        d["selected_design_ids"] = json.loads(d["selected_design_ids"])
    except Exception:
        d["selected_design_ids"] = []
    conn.close()
    return d

def update_order_status(order_id, status):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE orders SET status = ? WHERE id = ?", (status, order_id))
    conn.commit()
    conn.close()

def delete_order(order_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM orders WHERE id = ?", (order_id,))
    conn.commit()
    conn.close()

# Settings CRUD
def get_settings():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT key, value FROM settings")
    rows = cursor.fetchall()
    conn.close()
    return {r["key"]: r["value"] for r in rows}

def update_settings(settings_dict):
    conn = get_db()
    cursor = conn.cursor()
    for key, val in settings_dict.items():
        cursor.execute("""
        INSERT INTO settings (key, value) VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
        """, (key, str(val)))
    conn.commit()
    conn.close()
