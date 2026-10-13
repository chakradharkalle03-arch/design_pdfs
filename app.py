import os
import io
import json
import shutil
from typing import List, Optional
from datetime import datetime

from fastapi import FastAPI, Request, Form, File, UploadFile, HTTPException, Depends, Query
from fastapi.responses import HTMLResponse, JSONResponse, StreamingResponse, FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import qrcode

import database as db
import pdf_processor as processor
import gdrive_backup as gdrive

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
STATIC_DIR = os.path.join(BASE_DIR, "static")
TEMPLATES_DIR = os.path.join(BASE_DIR, "templates")

# Ensure required folders exist
for folder in ["uploads/designs", "uploads/blouses", "uploads/pdfs", "backups"]:
    os.makedirs(os.path.join(BASE_DIR, folder), exist_ok=True)

# Initialize database & seed sample data
db.init_db()

app = FastAPI(title="Akshaya Blouse Embroidery Studio", version="1.0.0")

# Mount static and upload directories
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

templates = Jinja2Templates(directory=TEMPLATES_DIR)

# --- HELPER FUNCTIONS ---

def get_base_url(request: Request) -> str:
    settings = db.get_settings()
    custom_public_url = settings.get("public_url", "").strip()
    if custom_public_url:
        return custom_public_url.rstrip("/")
    # Otherwise use request base url
    return str(request.base_url).rstrip("/")

# --- PAGE ROUTES ---

@app.get("/", response_class=HTMLResponse)
@app.get("/catalog", response_class=HTMLResponse)
async def view_catalog(request: Request, category: Optional[str] = None):
    settings = db.get_settings()
    designs = db.get_all_designs(category=category, only_active=True)
    categories = ["All", "Maggam Work", "Bridal Heavy", "Aari Work", "Sleeve Design", "Cutwork", "Neck Design", "Simple Work"]
    return templates.TemplateResponse(request, "catalog.html", {
        "settings": settings,
        "designs": designs,
        "categories": categories,
        "current_category": category or "All",
        "base_url": get_base_url(request)
    })

@app.get("/order/{order_code}", response_class=HTMLResponse)
async def view_order_summary(request: Request, order_code: str):
    order = db.get_order_by_code(order_code)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    selected_designs = db.get_designs_by_ids(order.get("selected_design_ids", []))
    settings = db.get_settings()
    
    return templates.TemplateResponse(request, "order_summary.html", {
        "order": order,
        "designs": selected_designs,
        "settings": settings,
        "base_url": get_base_url(request)
    })

@app.get("/admin", response_class=HTMLResponse)
async def view_admin(request: Request):
    settings = db.get_settings()
    orders = db.get_all_orders()
    # Enrich orders with design details
    for o in orders:
        o["designs_detail"] = db.get_designs_by_ids(o.get("selected_design_ids", []))
    designs = db.get_all_designs(only_active=False)
    gdrive_status = gdrive.check_gdrive_status()
    
    return templates.TemplateResponse(request, "admin.html", {
        "settings": settings,
        "orders": orders,
        "designs": designs,
        "gdrive_status": gdrive_status,
        "base_url": get_base_url(request)
    })

# --- API ENDPOINTS ---

@app.get("/api/designs")
async def api_get_designs(category: Optional[str] = None, search: Optional[str] = None):
    designs = db.get_all_designs(category=category, search=search, only_active=True)
    return {"success": True, "count": len(designs), "designs": designs}

@app.get("/api/designs/{design_id}")
async def api_get_design_by_id(design_id: int):
    design = db.get_design_by_id(design_id)
    if not design:
        raise HTTPException(status_code=404, detail="Design not found")
    return {"success": True, "design": design}

@app.post("/api/designs/upload")
async def api_upload_designs(
    files: List[UploadFile] = File(...),
    category: str = Form("Maggam Work"),
    title: Optional[str] = Form(None),
    code_prefix: str = Form("BL"),
    description: Optional[str] = Form(""),
    tags: Optional[str] = Form("")
):
    added_designs = []
    
    for upload in files:
        filename = upload.filename or "unknown"
        ext = os.path.splitext(filename)[1].lower()
        content = await upload.read()
        
        if ext == ".pdf":
            # Save original PDF file
            temp_pdf_path = os.path.join(BASE_DIR, "uploads", "pdfs", f"uploaded_{filename}")
            with open(temp_pdf_path, "wb") as f:
                f.write(content)
                
            # Process and extract all pages
            extracted_items = processor.process_pdf_file(
                temp_pdf_path,
                original_filename=filename,
                base_code_prefix=code_prefix.upper(),
                category=category
            )
            
            for item in extracted_items:
                design_id = db.add_design(
                    code=item["code"],
                    title=item["title"],
                    category=item["category"],
                    description=item["description"],
                    image_path=item["image_path"],
                    thumb_path=item["thumb_path"],
                    pdf_source=item["pdf_source"],
                    pdf_page=item["pdf_page"],
                    tags=item["tags"]
                )
                item["id"] = design_id
                added_designs.append(item)
                
        elif ext in [".jpg", ".jpeg", ".png", ".webp"]:
            # Process image file
            temp_img_path = os.path.join(BASE_DIR, "uploads", f"temp_{filename}")
            with open(temp_img_path, "wb") as f:
                f.write(content)
                
            item = processor.process_image_file(
                temp_img_path,
                original_filename=filename,
                custom_code=code_prefix if code_prefix and "-" in code_prefix else None,
                title=title,
                category=category,
                description=description or "",
                tags=tags or ""
            )
            
            if os.path.exists(temp_img_path):
                os.remove(temp_img_path)
                
            design_id = db.add_design(
                code=item["code"],
                title=item["title"],
                category=item["category"],
                description=item["description"],
                image_path=item["image_path"],
                thumb_path=item["thumb_path"],
                pdf_source=None,
                pdf_page=None,
                tags=item["tags"]
            )
            item["id"] = design_id
            added_designs.append(item)
            
    return {
        "success": True,
        "message": f"Successfully uploaded and processed {len(added_designs)} design(s)",
        "count": len(added_designs),
        "designs": added_designs
    }

@app.delete("/api/designs/{design_id}")
async def api_delete_design(design_id: int):
    design = db.get_design_by_id(design_id)
    if not design:
        raise HTTPException(status_code=404, detail="Design not found")
    
    db.delete_design(design_id)
    return {"success": True, "message": f"Design {design['code']} deleted"}

@app.put("/api/designs/{design_id}")
async def api_update_design(
    design_id: int,
    title: str = Form(...),
    code: str = Form(...),
    category: str = Form(...),
    description: Optional[str] = Form(""),
    tags: Optional[str] = Form("")
):
    db.update_design(design_id, title=title, category=category, description=description or "", code=code, tags=tags)
    return {"success": True, "message": "Design updated successfully"}

# --- ORDERS API ---

@app.post("/api/orders")
async def api_create_order(
    customer_name: str = Form(...),
    customer_phone: str = Form(...),
    selected_design_ids: str = Form(...),
    customer_notes: Optional[str] = Form(""),
    blouse_image: Optional[UploadFile] = File(None)
):
    # Parse design IDs
    try:
        parsed_ids = json.loads(selected_design_ids)
        if not isinstance(parsed_ids, list):
            parsed_ids = [int(selected_design_ids)]
        else:
            parsed_ids = [int(i) for i in parsed_ids]
    except Exception:
        parsed_ids = []
        
    blouse_image_path = None
    if blouse_image and blouse_image.filename:
        blouse_bytes = await blouse_image.read()
        blouse_image_path = processor.save_customer_blouse_image(blouse_bytes, blouse_image.filename)
        
    order_res = db.create_order(
        customer_name=customer_name.strip(),
        customer_phone=customer_phone.strip(),
        selected_design_ids=parsed_ids,
        blouse_image_path=blouse_image_path,
        customer_notes=customer_notes.strip() if customer_notes else ""
    )
    
    # Fetch complete order with designs
    order = db.get_order_by_code(order_res["order_code"])
    designs = db.get_designs_by_ids(parsed_ids)
    
    return {
        "success": True,
        "message": "Order created successfully",
        "order": order,
        "designs": designs
    }

@app.get("/api/orders")
async def api_get_orders(status: Optional[str] = None):
    orders = db.get_all_orders(status=status)
    for o in orders:
        o["designs_detail"] = db.get_designs_by_ids(o.get("selected_design_ids", []))
    return {"success": True, "count": len(orders), "orders": orders}

@app.get("/api/orders/{order_code}")
async def api_get_single_order(order_code: str):
    order = db.get_order_by_code(order_code)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    order["designs_detail"] = db.get_designs_by_ids(order.get("selected_design_ids", []))
    return {"success": True, "order": order}

@app.patch("/api/orders/{order_id}/status")
async def api_update_order_status(order_id: int, status: str = Form(...)):
    db.update_order_status(order_id, status.upper())
    return {"success": True, "message": f"Status updated to {status.upper()}"}

@app.delete("/api/orders/{order_id}")
async def api_delete_order(order_id: int):
    db.delete_order(order_id)
    return {"success": True, "message": "Order deleted"}

# --- SETTINGS & BACKUP API ---

@app.get("/api/settings")
async def api_get_settings():
    return {"success": True, "settings": db.get_settings()}

@app.post("/api/settings")
async def api_update_settings(
    business_name: Optional[str] = Form(None),
    tagline: Optional[str] = Form(None),
    whatsapp_number: Optional[str] = Form(None),
    admin_pin: Optional[str] = Form(None),
    public_url: Optional[str] = Form(None)
):
    new_data = {}
    if business_name is not None: new_data["business_name"] = business_name
    if tagline is not None: new_data["tagline"] = tagline
    if whatsapp_number is not None: new_data["whatsapp_number"] = whatsapp_number.replace("+", "").replace(" ", "").replace("-", "")
    if admin_pin is not None: new_data["admin_pin"] = admin_pin
    if public_url is not None: new_data["public_url"] = public_url.strip()
    
    db.update_settings(new_data)
    return {"success": True, "message": "Settings updated", "settings": db.get_settings()}

@app.get("/api/qr")
async def api_get_qr_code(request: Request, url: Optional[str] = None):
    target_url = url or get_base_url(request)
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=4,
    )
    qr.add_data(target_url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#6B1724", back_color="#FFFFFF")
    
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return StreamingResponse(buf, media_type="image/png")

@app.get("/api/backup/download")
async def api_download_backup():
    zip_path, zip_name = gdrive.create_full_backup_zip()
    return FileResponse(zip_path, filename=zip_name, media_type="application/zip")

@app.post("/api/gdrive/sync")
async def api_sync_gdrive():
    res = gdrive.sync_to_google_drive()
    return res

# --- META (INSTAGRAM & FACEBOOK) COMMERCE FEED & TARGETING ---
@app.get("/api/meta/catalog.xml")
async def api_meta_catalog_xml(request: Request):
    import meta_ads_helper
    xml_content = meta_ads_helper.generate_meta_catalog_xml(get_base_url(request))
    from fastapi.responses import Response
    return Response(content=xml_content, media_type="application/xml")

@app.get("/api/meta/targeting")
async def api_meta_targeting(radius_km: int = 10):
    import meta_ads_helper
    return meta_ads_helper.get_radius_campaign_data(radius_km)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
