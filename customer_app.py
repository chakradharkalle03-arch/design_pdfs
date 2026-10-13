import os
import io
import json
from typing import List, Optional

from fastapi import FastAPI, Request, Form, File, UploadFile, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import qrcode

import database as db
import pdf_processor as processor

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
STATIC_DIR = os.path.join(BASE_DIR, "static")
TEMPLATES_DIR = os.path.join(BASE_DIR, "templates")

# Ensure required folders exist
for folder in ["uploads/designs", "uploads/blouses", "uploads/pdfs"]:
    os.makedirs(os.path.join(BASE_DIR, folder), exist_ok=True)

# Initialize database
db.init_db()

app = FastAPI(title="Akshaya Blouse Embroidery Studio - Customer Store", version="1.0.0")

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

templates = Jinja2Templates(directory=TEMPLATES_DIR)

def get_base_url(request: Request) -> str:
    settings = db.get_settings()
    custom_public_url = settings.get("public_url", "").strip()
    if custom_public_url:
        return custom_public_url.rstrip("/")
    return str(request.base_url).rstrip("/")

# --- CUSTOMER STORE ROUTES ---

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

@app.get("/api/designs")
async def api_get_designs(category: Optional[str] = None, search: Optional[str] = None):
    designs = db.get_all_designs(category=category, search=search, only_active=True)
    return {"success": True, "count": len(designs), "designs": designs}

@app.post("/api/orders")
async def api_create_order(
    customer_name: str = Form(...),
    customer_phone: str = Form(...),
    selected_design_ids: str = Form(...),
    customer_notes: Optional[str] = Form(""),
    blouse_image: Optional[UploadFile] = File(None)
):
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
    
    order = db.get_order_by_code(order_res["order_code"])
    designs = db.get_designs_by_ids(parsed_ids)
    
    return {
        "success": True,
        "message": "Order created successfully",
        "order": order,
        "designs": designs
    }

@app.get("/api/qr")
async def api_get_qr_code(request: Request, url: Optional[str] = None):
    target_url = url or get_base_url(request)
    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(target_url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#6B1724", back_color="#FFFFFF")
    
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return StreamingResponse(buf, media_type="image/png")

# --- META (INSTAGRAM & FACEBOOK) COMMERCE FEED ---
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
    print("Starting Customer Store Web on http://localhost:8000 ...")
    uvicorn.run("customer_app:app", host="0.0.0.0", port=8000, reload=True)
