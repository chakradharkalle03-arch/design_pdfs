import xml.etree.ElementTree as ET
from xml.dom import minidom
import database as db

# Dharmavaram, Sri Sathya Sai District, Andhra Pradesh
DHARMAVARAM_COORDS = {
    "lat": 14.4137,
    "lng": 77.7281,
    "city": "Dharmavaram",
    "district": "Sri Sathya Sai",
    "state": "Andhra Pradesh",
    "pincode": "515671"
}

def generate_meta_catalog_xml(base_url: str) -> str:
    """
    Generates standard Meta / Facebook / Instagram Commerce Product Feed in XML format.
    """
    settings = db.get_settings()
    biz_name = settings.get("business_name", "Akshaya Blouse Embroidery Studio")
    designs = db.get_all_designs(only_active=True)
    
    rss = ET.Element('rss', {
        'version': '2.0',
        'xmlns:g': 'http://base.google.com/ns/1.0'
    })
    channel = ET.SubElement(rss, 'channel')
    
    title = ET.SubElement(channel, 'title')
    title.text = f"{biz_name} - Dharmavaram"
    
    link = ET.SubElement(channel, 'link')
    link.text = base_url
    
    desc = ET.SubElement(channel, 'description')
    desc.text = "Computerized Machine Embroidery & Blouse Designs in Dharmavaram, Sri Sathya Sai District"
    
    for d in designs:
        item = ET.SubElement(channel, 'item')
        
        g_id = ET.SubElement(item, 'g:id')
        g_id.text = str(d['code'])
        
        g_title = ET.SubElement(item, 'g:title')
        g_title.text = f"{d['title']} (Code: {d['code']})"
        
        g_desc = ET.SubElement(item, 'g:description')
        g_desc.text = d['description'] or f"Exclusive {d['category']} blouse embroidery design from Dharmavaram."
        
        g_link = ET.SubElement(item, 'g:link')
        g_link.text = f"{base_url}/?code={d['code']}"
        
        g_img = ET.SubElement(item, 'g:image_link')
        img_p = d['image_path'].lstrip('/')
        g_img.text = f"{base_url}/{img_p}"
        
        g_brand = ET.SubElement(item, 'g:brand')
        g_brand.text = "Akshaya"
        
        g_condition = ET.SubElement(item, 'g:condition')
        g_condition.text = "new"
        
        g_availability = ET.SubElement(item, 'g:availability')
        g_availability.text = "in stock"
        
        g_price = ET.SubElement(item, 'g:price')
        g_price.text = "1500.00 INR"
        
        g_category = ET.SubElement(item, 'g:google_product_category')
        g_category.text = "Apparel & Accessories > Clothing > Traditional & Ceremonial Clothing"
        
    xml_str = ET.tostring(rss, encoding='utf-8')
    parsed = minidom.parseString(xml_str)
    return parsed.toprettyxml(indent="  ")

def get_radius_campaign_data(radius_km: int = 10, lat: float = None, lng: float = None, location_name: str = None):
    """
    Computes local targeting demographic estimates dynamically for live user location or Dharmavaram.
    """
    center_coords = {
        "lat": lat if lat is not None else DHARMAVARAM_COORDS["lat"],
        "lng": lng if lng is not None else DHARMAVARAM_COORDS["lng"],
        "location_name": location_name or "Dharmavaram, Sri Sathya Sai District"
    }

    factor = min(radius_km, 50)
    estimated_women = int(12000 + (factor ** 1.6) * 350)
    
    nearby_areas = []
    base_label = location_name or "Dharmavaram"
    if radius_km >= 2: nearby_areas.append(f"{base_label} Central")
    if radius_km >= 6: nearby_areas.append(f"{base_label} Surrounding Mandals")
    if radius_km >= 15: nearby_areas.append("Sub-district Towns & Villages")
    if radius_km >= 30: nearby_areas.append("Adjacent District Hubs")
    
    return {
        "center": center_coords,
        "radius_km": radius_km,
        "estimated_target_women": estimated_women,
        "nearby_areas_covered": nearby_areas,
        "target_demographics": {
            "gender": "Women",
            "age_range": "18 - 48",
            "interests": [
                "Dharmavaram Silk Sarees",
                "Sari / Saree",
                "Computer Embroidery",
                "Machine Embroidery",
                "Bridal Embroidery",
                "Indian Wedding Wear"
            ]
        },
        "daily_budget_suggestion": {
            "INR": 150,
            "estimated_daily_views": int(estimated_women * 0.08)
        }
    }

