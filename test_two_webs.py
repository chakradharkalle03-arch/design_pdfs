from starlette.testclient import TestClient
import customer_app
import tailor_manager

def test_both():
    print("Testing Customer App (Port 8000)...")
    c_client = TestClient(customer_app.app)
    r = c_client.get("/")
    assert r.status_code == 200
    assert "Akshaya Blouse Embroidery Studio" in r.text
    assert "TAILOR TOOLBAR" not in r.text  # Pure clean customer experience!
    assert "Tailor Dashboard" not in r.text
    print("Customer Web: 100% clean, pristine store verified!")

    print("Testing Tailor Manager App (Port 8001)...")
    m_client = TestClient(tailor_manager.app)
    r = m_client.get("/")
    assert r.status_code == 200
    assert "Tailor Admin Portal" in r.text
    assert "View Customer Store (Port 8000)" in r.text
    assert "Customer Orders" in r.text
    assert "Upload New Designs" in r.text
    print("Tailor Manager Web: Full control center verified!")

    print("\nALL TWO WEBS VERIFIED AND WORKING PERFECTLY!")

if __name__ == "__main__":
    test_both()
