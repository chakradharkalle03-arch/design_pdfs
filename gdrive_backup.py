import os
import zipfile
import json
from datetime import datetime

# Google API libraries
try:
    from googleapiclient.discovery import build
    from googleapiclient.http import MediaFileUpload
    from google.oauth2 import service_account
    GDRIVE_API_AVAILABLE = True
except ImportError:
    GDRIVE_API_AVAILABLE = False

SERVICE_ACCOUNT_FILE = os.path.join(os.path.dirname(__file__), "service_account.json")

def check_gdrive_status():
    """
    Checks if Google Drive automated sync is configured.
    """
    has_credentials_file = os.path.exists(SERVICE_ACCOUNT_FILE)
    return {
        "api_library_installed": GDRIVE_API_AVAILABLE,
        "service_account_configured": has_credentials_file,
        "service_account_path": SERVICE_ACCOUNT_FILE if has_credentials_file else None,
        "account_email": "kallechakri022@gmail.com"
    }

def create_full_backup_zip():
    """
    Packages database, uploads (designs, blouses, pdfs) into a downloadable zip file.
    """
    backup_dir = os.path.join(os.path.dirname(__file__), "backups")
    os.makedirs(backup_dir, exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    zip_filename = f"embroidery_backup_{timestamp}.zip"
    zip_filepath = os.path.join(backup_dir, zip_filename)
    
    root_dir = os.path.dirname(__file__)
    
    with zipfile.ZipFile(zip_filepath, 'w', zipfile.ZIP_DEFLATED) as zipf:
        # Add SQLite database
        db_path = os.path.join(root_dir, "embroidery.db")
        if os.path.exists(db_path):
            zipf.write(db_path, "embroidery.db")
            
        # Add uploads folder
        uploads_dir = os.path.join(root_dir, "uploads")
        if os.path.exists(uploads_dir):
            for root, dirs, files in os.walk(uploads_dir):
                for file in files:
                    full_p = os.path.join(root, file)
                    rel_p = os.path.relpath(full_p, root_dir)
                    zipf.write(full_p, rel_p)
                    
    return zip_filepath, zip_filename

def sync_to_google_drive(folder_id=None):
    """
    If service_account.json is present, uploads the latest backup to Google Drive.
    """
    if not GDRIVE_API_AVAILABLE:
        return {"success": False, "message": "google-api-python-client is not installed"}
        
    if not os.path.exists(SERVICE_ACCOUNT_FILE):
        return {
            "success": False, 
            "message": "service_account.json not found. For automated Google Drive backup, Google requires a Service Account JSON key (not raw account password)."
        }
        
    try:
        SCOPES = ['https://www.googleapis.com/auth/drive.file']
        creds = service_account.Credentials.from_service_account_file(
            SERVICE_ACCOUNT_FILE, scopes=SCOPES
        )
        service = build('drive', 'v3', credentials=creds)
        
        # Create backup zip
        zip_path, zip_name = create_full_backup_zip()
        
        file_metadata = {'name': zip_name}
        if folder_id:
            file_metadata['parents'] = [folder_id]
            
        media = MediaFileUpload(zip_path, mimetype='application/zip')
        file = service.files().create(body=file_metadata, media_body=media, fields='id, name, webViewLink').execute()
        
        return {
            "success": True,
            "message": f"Successfully backed up to Google Drive as '{file.get('name')}'",
            "file_id": file.get('id'),
            "view_link": file.get('webViewLink')
        }
    except Exception as e:
        return {"success": False, "message": f"Google Drive upload error: {str(e)}"}
