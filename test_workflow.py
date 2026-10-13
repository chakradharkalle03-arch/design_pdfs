import os
import requests
import json

def test_endpoints():
    from starlette.testclient import TestClient
    from app import app
    
    client = TestClient(app)
    
    # 1. Test Catalog HTML
    print("Testing GET / ...")
    r = client.get("/")
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    assert "Chakri Blouse Embroidery Studio" in r.text
    print("Catalog HTML OK!")

    # 2. Test Admin HTML
    print("Testing GET /admin ...")
    r = client.get("/admin")
    assert r.status_code == 200
    assert "Tailor Admin Portal" in r.text
    print("Admin HTML OK!")

    # 3. Test Order Receipt HTML
    print("Testing GET /order/ORD-261013-1001 ...")
    r = client.get("/order/ORD-261013-1001")
    assert r.status_code == 200
    assert "Priya Reddy" in r.text
    print("Order Receipt HTML OK!")

    # 4. Test API designs list
    print("Testing GET /api/designs ...")
    r = client.get("/api/designs")
    assert r.status_code == 200
    data = r.json()
    assert data["success"] is True
    print(f"Designs retrieved: {data['count']}")

    # 5. Test PDF upload and page extraction
    print("Testing PDF Upload /api/designs/upload ...")
    sample_pdf_path = os.path.join(os.path.dirname(__file__), "sample_data", "sample_embroidery_catalog.pdf")
    with open(sample_pdf_path, "rb") as f:
        r = client.post(
            "/api/designs/upload",
            files={"files": ("catalog_test.pdf", f, "application/pdf")},
            data={
                "category": "Bridal Heavy",
                "code_prefix": "CAT",
                "title": "Bridal Catalog 2026",
                "description": "Exclusive bridal designs extracted from multi-page catalog PDF",
                "tags": "bridal, gold, maggam, catalog"
            }
        )
    assert r.status_code == 200
    res = r.json()
    assert res["success"] is True
    print(f"PDF extraction successful! Extracted {res['count']} pages into design catalog.")

    # 6. Test Customer Order Submission with Blouse Upload
    print("Testing Customer Order Submission /api/orders ...")
    sample_blouse_path = os.path.join(os.path.dirname(__file__), "sample_data", "sample_customer_blouse.jpg")
    with open(sample_blouse_path, "rb") as f:
        r = client.post(
            "/api/orders",
            data={
                "customer_name": "Kavitha Sharma",
                "customer_phone": "9876501234",
                "selected_design_ids": json.dumps([1, 3]),
                "customer_notes": "Please keep neck depth 9.5 inches and heavy zari work"
            },
            files={"blouse_image": ("kavitha_blouse.jpg", f, "image/jpeg")}
        )
    assert r.status_code == 200
    order_data = r.json()
    assert order_data["success"] is True
    order_code = order_data["order"]["order_code"]
    print(f"Customer order created successfully with code: {order_code}")

    # 7. Test Receipt for newly created order
    r = client.get(f"/order/{order_code}")
    assert r.status_code == 200
    assert "Kavitha Sharma" in r.text
    print(f"Receipt page verified for {order_code}")

    # 8. Test QR code generation
    print("Testing GET /api/qr ...")
    r = client.get("/api/qr")
    assert r.status_code == 200
    assert r.headers["content-type"] == "image/png"
    print("QR Code generation OK!")

    # 9. Test Backup ZIP creation
    print("Testing GET /api/backup/download ...")
    r = client.get("/api/backup/download")
    assert r.status_code == 200
    assert "application/zip" in r.headers["content-type"]
    print("ZIP Backup download OK!")

    print("\nALL 9 ENDPOINT TESTS PASSED WITH 100% SUCCESS!")

if __name__ == "__main__":
    test_endpoints()
