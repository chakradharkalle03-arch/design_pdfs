import os
import fitz  # PyMuPDF
from PIL import Image
import uuid
import re

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
DESIGNS_DIR = os.path.join(UPLOAD_DIR, "designs")
BLOUSES_DIR = os.path.join(UPLOAD_DIR, "blouses")
PDFS_DIR = os.path.join(UPLOAD_DIR, "pdfs")

os.makedirs(DESIGNS_DIR, exist_ok=True)
os.makedirs(BLOUSES_DIR, exist_ok=True)
os.makedirs(PDFS_DIR, exist_ok=True)

def sanitize_filename(filename):
    clean = re.sub(r'[^a-zA-Z0-9_\-\.]', '_', filename)
    return clean

def make_thumbnail(source_path, thumb_path, max_size=(500, 500)):
    try:
        with Image.open(source_path) as img:
            if img.mode in ("RGBA", "P"):
                img = img.convert("RGB")
            img.thumbnail(max_size, Image.Resampling.LANCZOS)
            img.save(thumb_path, "JPEG", quality=85, optimize=True)
    except Exception as e:
        print(f"Error making thumbnail for {source_path}: {e}")

def process_pdf_file(pdf_file_path, original_filename, base_code_prefix="BL", category="General Embroidery"):
    """
    Takes an uploaded PDF file, saves it, extracts all pages as high-resolution images,
    generates thumbnails, and returns a list of design dicts ready to insert into the database.
    """
    results = []
    sanitized_name = sanitize_filename(original_filename)
    base_name = os.path.splitext(sanitized_name)[0]
    
    # Open PDF with PyMuPDF
    doc = fitz.open(pdf_file_path)
    total_pages = len(doc)
    
    unique_batch_id = uuid.uuid4().hex[:6].upper()
    
    for page_idx in range(total_pages):
        page_num = page_idx + 1
        page = doc[page_idx]
        
        # Render high-res image (2x zoom = ~144 DPI)
        zoom = 2.0
        mat = fitz.Matrix(zoom, zoom)
        pix = page.get_pixmap(matrix=mat, alpha=False)
        
        # Output filenames
        img_filename = f"{base_code_prefix}_{unique_batch_id}_p{page_num}.jpg"
        thumb_filename = f"thumb_{img_filename}"
        
        full_img_path = os.path.join(DESIGNS_DIR, img_filename)
        full_thumb_path = os.path.join(DESIGNS_DIR, thumb_filename)
        
        # Save high-res JPEG
        pix.save(full_img_path)
        
        # Generate thumbnail
        make_thumbnail(full_img_path, full_thumb_path)
        
        code = f"{base_code_prefix}-{unique_batch_id}-{page_num}"
        title = f"{base_name.replace('_', ' ').title()} (Page {page_num})"
        
        results.append({
            "code": code,
            "title": title,
            "category": category,
            "description": f"Design extracted from {original_filename}, page {page_num} of {total_pages}.",
            "image_path": f"uploads/designs/{img_filename}",
            "thumb_path": f"uploads/designs/{thumb_filename}",
            "pdf_source": original_filename,
            "pdf_page": page_num,
            "tags": f"pdf, {base_name}, page {page_num}"
        })
        
    doc.close()
    return results

def process_image_file(image_file_path, original_filename, custom_code=None, title=None, category="Maggam Work", description="", tags=""):
    """
    Takes an uploaded image file (JPG, PNG, WEBP), optimizes it, generates thumbnail,
    and returns design metadata dict.
    """
    sanitized_name = sanitize_filename(original_filename)
    unique_id = uuid.uuid4().hex[:6].upper()
    ext = os.path.splitext(sanitized_name)[1].lower()
    if ext not in ['.jpg', '.jpeg', '.png', '.webp']:
        ext = '.jpg'
        
    img_filename = f"IMG_{unique_id}{ext}"
    thumb_filename = f"thumb_{img_filename}"
    
    dest_img_path = os.path.join(DESIGNS_DIR, img_filename)
    dest_thumb_path = os.path.join(DESIGNS_DIR, thumb_filename)
    
    # Open and re-save/optimize image
    with Image.open(image_file_path) as img:
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")
        # Save main image (limit to 1920 max dimension if enormous)
        img.thumbnail((1920, 1920), Image.Resampling.LANCZOS)
        img.save(dest_img_path, "JPEG", quality=90, optimize=True)
        
    # Generate thumbnail
    make_thumbnail(dest_img_path, dest_thumb_path)
    
    code = custom_code.strip() if custom_code and custom_code.strip() else f"EMB-{unique_id}"
    design_title = title.strip() if title and title.strip() else os.path.splitext(original_filename)[0].replace('_', ' ').title()
    
    return {
        "code": code,
        "title": design_title,
        "category": category,
        "description": description or f"Exclusive embroidery design uploaded on {original_filename}.",
        "image_path": f"uploads/designs/{img_filename}",
        "thumb_path": f"uploads/designs/{thumb_filename}",
        "pdf_source": None,
        "pdf_page": None,
        "tags": tags
    }

def save_customer_blouse_image(file_bytes, filename):
    """
    Saves an uploaded customer blouse fabric photo and returns relative path.
    """
    unique_id = uuid.uuid4().hex[:8].upper()
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ['.jpg', '.jpeg', '.png', '.webp']:
        ext = '.jpg'
        
    saved_filename = f"blouse_{unique_id}{ext}"
    dest_path = os.path.join(BLOUSES_DIR, saved_filename)
    
    # Save with PIL to ensure valid image orientation and optimal compression
    import io
    with Image.open(io.BytesIO(file_bytes)) as img:
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")
        img.thumbnail((1600, 1600), Image.Resampling.LANCZOS)
        img.save(dest_path, "JPEG", quality=85, optimize=True)
        
    return f"uploads/blouses/{saved_filename}"

def save_finished_blouse_image(file_bytes, filename):
    """
    Saves an uploaded finished blouse photo and its thumbnail, returning (image_path, thumb_path).
    """
    unique_id = uuid.uuid4().hex[:8].upper()
    img_filename = f"finished_{unique_id}.jpg"
    thumb_filename = f"thumb_{img_filename}"
    
    dest_path = os.path.join(BLOUSES_DIR, img_filename)
    dest_thumb_path = os.path.join(BLOUSES_DIR, thumb_filename)
    
    import io
    with Image.open(io.BytesIO(file_bytes)) as img:
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")
        img.thumbnail((1600, 1600), Image.Resampling.LANCZOS)
        img.save(dest_path, "JPEG", quality=88, optimize=True)
        
    make_thumbnail(dest_path, dest_thumb_path, max_size=(500, 500))
    return f"uploads/blouses/{img_filename}", f"uploads/blouses/{thumb_filename}"

