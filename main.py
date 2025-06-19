import base64
import datetime
import json
import logging
import os
import re
import sys
import sqlite3
import threading
import time
import traceback
import uuid
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.parse import quote

import requests
import urllib3

# ============================================================ #
# == HERE is where the flag is set                          == #
# Set to True to delete the list on startup and recreate it. == #
# WARNING: This deletes all existing data in the list.       == #
RECREATE_LIST_ON_START = True  # <--- THIS LINE
# ============================================================ #

# Disable only the InsecureRequestWarning
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Configure Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - [%(threadName)s:%(filename)s:%(lineno)d] - %(message)s',  # Added threadName
    datefmt='%Y-%m-%d %H:%M:%S',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('app.log', encoding='utf-8')
    ]
)

# --- API Constants and SharePoint Details (keep as is) ---
API_URL = "https://apps.sv.net/Staff/Staff.aspx"
LOGIN_URL = "https://apps.sv.net/login/login.aspx"
USERNAME = "20001795"
PASSWORD = "Kh@led@258"
PASSCODE = "s@v#pR0d"

TENANT_ID = '6b8805cf-83d0-4342-bd38-fb3b3df952be'
CLIENT_ID = 'a89cffc8-e064-49e0-92ed-2645ac193b05'
CLIENT_SECRET = '_-f8Q~IMP0.IEWZHAnd2jp8YmUfJJzZfZ8PuzbyW'
SITE = 'Thelounge'
SHAREPOINT_SITE = f'flyadeal.sharepoint.com/sites/{SITE}'
SHAREPOINT_LIST_NAME = 'mazaya'  # Use a distinct name for clarity
DOCUMENT_LIBRARY = 'Documents'
SITEASSETS_LIBRARY = 'SiteAssets'
GRAPH_URL = f"https://graph.microsoft.com/v1.0/sites/flyadeal.sharepoint.com:/sites/{SITE}"  # Corrected Graph URL base

GRAPH_API_BASE = "https://graph.microsoft.com/v1.0"
GRAPH_SITE_ENDPOINT = f"{GRAPH_API_BASE}/sites/{SHAREPOINT_SITE}"

# --- Other Constants ---
CSV_FILE = 'api_scraped_offers.csv'
LOG_FILE = 'app.log'
DB_FILE = 'mazaya.db'  # SQLite database file

# SQLite Database Setup
def init_database():
    """Initialize SQLite database with necessary tables"""
    try:
        # Delete the database file if it exists to ensure we have the latest schema
        if os.path.exists(DB_FILE):
            os.remove(DB_FILE)
            logging.info(f"Deleted existing database file {DB_FILE} to ensure schema is up-to-date")

        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()

        # Create offers table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS offers (
            id TEXT PRIMARY KEY,
            title TEXT,
            description TEXT,
            category TEXT,
            image_path TEXT,
            website_url TEXT,
            offer_name_ar TEXT,
            contact_number TEXT,
            effective_date TEXT,
            discontinue_date TEXT,
            is_unlimited INTEGER,
            status TEXT,
            category_id TEXT,
            offer_type TEXT,
            created_at TEXT,
            updated_at TEXT
        )
        ''')

        # Create a table to track when the last update was performed
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS metadata (
            key TEXT PRIMARY KEY,
            value TEXT
        )
        ''')

        conn.commit()
        logging.info("SQLite database initialized successfully")
        return conn
    except sqlite3.Error as e:
        logging.error(f"SQLite database initialization error: {str(e)}")
        logging.error(traceback.format_exc())
        raise RuntimeError(f"Failed to initialize SQLite database: {str(e)}")
    except Exception as e:
        logging.error(f"Unexpected error initializing database: {str(e)}")
        logging.error(traceback.format_exc())
        raise RuntimeError(f"Unexpected error initializing database: {str(e)}")

def get_db_connection():
    """Get a connection to the SQLite database"""
    try:
        conn = sqlite3.connect(DB_FILE)
        conn.row_factory = sqlite3.Row  # This enables column access by name
        return conn
    except sqlite3.Error as e:
        logging.error(f"SQLite connection error: {str(e)}")
        logging.error(traceback.format_exc())
        raise RuntimeError(f"Failed to connect to SQLite database: {str(e)}")

def get_existing_offers_from_db():
    """Get existing offers from the SQLite database"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM offers")
        rows = cursor.fetchall()

        offers = {}
        for row in rows:
            offer_id = row['id']
            offers[offer_id] = {
                'id': offer_id,
                'title': row['title'],
                'description': row['description'],
                'category': row['category'],
                'image_path': row['image_path'],
                'website_url': row['website_url'],
                'offer_name_ar': row['offer_name_ar'],
                'contact_number': row['contact_number'],
                'effective_date': row['effective_date'],
                'discontinue_date': row['discontinue_date'],
                'is_unlimited': row['is_unlimited'],
                'status': row['status'],
                'category_id': row['category_id'],
                'offer_type': row['offer_type'],
                'created_at': row['created_at'],
                'updated_at': row['updated_at']
            }

        conn.close()
        logging.info(f"Retrieved {len(offers)} existing offers from database")
        return offers
    except sqlite3.Error as e:
        logging.error(f"Error retrieving offers from database: {str(e)}")
        logging.error(traceback.format_exc())
        return {}  # Return empty dict on error
    except Exception as e:
        logging.error(f"Unexpected error retrieving offers: {str(e)}")
        logging.error(traceback.format_exc())
        return {}  # Return empty dict on error

def add_offer_to_db(offer_id, title, description, category, image_path, website_url="", offer_name_ar="", 
                contact_number="", effective_date="", discontinue_date="", is_unlimited=0, status="", category_id="", offer_type="Saudia Mazaya"):
    """Add a new offer to the SQLite database"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        now = datetime.datetime.now().isoformat()

        cursor.execute(
            """INSERT INTO offers (
                id, title, description, category, image_path, website_url, offer_name_ar, 
                contact_number, effective_date, discontinue_date, is_unlimited, status, category_id, offer_type,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (offer_id, title, description, category, image_path, website_url, offer_name_ar, 
             contact_number, effective_date, discontinue_date, is_unlimited, status, category_id, offer_type,
             now, now)
        )

        conn.commit()
        conn.close()
        logging.info(f"Added offer {offer_id} to database")
        return True
    except sqlite3.Error as e:
        logging.error(f"Error adding offer {offer_id} to database: {str(e)}")
        logging.error(traceback.format_exc())
        return False
    except Exception as e:
        logging.error(f"Unexpected error adding offer {offer_id}: {str(e)}")
        logging.error(traceback.format_exc())
        return False

def update_offer_in_db(offer_id, title, description, category, image_path, website_url="", offer_name_ar="", 
                  contact_number="", effective_date="", discontinue_date="", is_unlimited=0, status="", category_id="", offer_type="Saudia Mazaya"):
    """Update an existing offer in the SQLite database"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        now = datetime.datetime.now().isoformat()

        cursor.execute(
            """UPDATE offers SET 
                title = ?, description = ?, category = ?, image_path = ?, 
                website_url = ?, offer_name_ar = ?, contact_number = ?, 
                effective_date = ?, discontinue_date = ?, is_unlimited = ?, 
                status = ?, category_id = ?, offer_type = ?, updated_at = ? 
               WHERE id = ?""",
            (title, description, category, image_path, website_url, offer_name_ar, 
             contact_number, effective_date, discontinue_date, is_unlimited, status, 
             category_id, offer_type, now, offer_id)
        )

        conn.commit()
        conn.close()
        logging.info(f"Updated offer {offer_id} in database")
        return True
    except sqlite3.Error as e:
        logging.error(f"Error updating offer {offer_id} in database: {str(e)}")
        logging.error(traceback.format_exc())
        return False
    except Exception as e:
        logging.error(f"Unexpected error updating offer {offer_id}: {str(e)}")
        logging.error(traceback.format_exc())
        return False

def clear_images_directory():
    """Clear all images from the mazaya images directory"""
    try:
        images_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'public', 'images', 'mazaya')
        if os.path.exists(images_dir):
            for filename in os.listdir(images_dir):
                file_path = os.path.join(images_dir, filename)
                if os.path.isfile(file_path):
                    os.unlink(file_path)
            logging.info(f"Cleared all images from {images_dir}")
        return True
    except Exception as e:
        logging.error(f"Error clearing images directory: {str(e)}")
        logging.error(traceback.format_exc())
        return False

def clear_database():
    """Clear all offers from the database"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM offers")
        conn.commit()
        conn.close()
        logging.info("Cleared all offers from database")
        return True
    except sqlite3.Error as e:
        logging.error(f"Error clearing database: {str(e)}")
        logging.error(traceback.format_exc())
        return False
    except Exception as e:
        logging.error(f"Unexpected error clearing database: {str(e)}")
        logging.error(traceback.format_exc())
        return False

def save_image_locally(image_data, offer_id):
    """Save an image to the local filesystem"""
    try:
        # Create images directory if it doesn't exist
        images_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'public', 'images', 'mazaya')
        os.makedirs(images_dir, exist_ok=True)

        # Generate a filename based on the offer ID
        filename = f"{offer_id}.jpg"
        file_path = os.path.join(images_dir, filename)

        # Save the image
        with open(file_path, 'wb') as f:
            f.write(image_data)

        # Return the relative path for storage in the database
        relative_path = f"/images/mazaya/{filename}"
        logging.info(f"Saved image for offer {offer_id} to {relative_path}")
        return relative_path
    except Exception as e:
        logging.error(f"Error saving image for offer {offer_id}: {str(e)}")
        logging.error(traceback.format_exc())
        return None

# Global variables for caching
token_cache = {
    'sharepoint_token': None,
    'token_expiry': None,
    'api_token': None,
    'site_id': None,
    'drive_id': None,
    'list_id': None,  # This needs to be populated correctly
    'mazaya_folder_exists': False
}

# Thread-safe lock for token refresh
token_lock = threading.Lock()
# Flag to signal threads to stop
stop_event = threading.Event()

import time
import requests
import logging

# Define exceptions to retry on
RETRY_EXCEPTIONS = (
    requests.exceptions.ConnectionError,
    requests.exceptions.Timeout,
    requests.exceptions.ChunkedEncodingError,
    ConnectionResetError  # Added based on logs
)


def make_request_with_retries(method, url, max_retries=3, delay_seconds=5, **kwargs):
    """
    Makes an HTTP request using requests library with retry logic for specific exceptions.

    Args:
        method (str): HTTP method (e.g., 'get', 'post', 'put', 'patch', 'delete').
        url (str): The URL for the request.
        max_retries (int): Maximum number of retry attempts.
        delay_seconds (int): Seconds to wait between retries.
        **kwargs: Additional arguments to pass to requests.request().

    Returns:
        requests.Response: The response object if successful within retries.

    Raises:
        requests.exceptions.RequestException: If the request fails after all retries.
        Exception: For non-retryable errors during the request.
    """
    retries = 0
    last_exception = None

    while retries <= max_retries:
        if stop_event.is_set():
            logging.warning(f"Request to {url} cancelled due to stop event during retry loop.")
            # Or raise an exception to signal cancellation
            raise OperationCanceledError(f"Operation cancelled for {url}")

        try:
            response = requests.request(method, url, **kwargs)

            # Optional: Check for specific non-401/429 server errors to retry
            # if 500 <= response.status_code <= 599 and retries < max_retries:
            #     logging.warning(f"Received status {response.status_code} on attempt {retries + 1}/{max_retries + 1} for {url}. Retrying in {delay_seconds}s...")
            #     last_exception = requests.exceptions.HTTPError(f"Server Error: {response.status_code}", response=response)
            #     retries += 1
            #     time.sleep(delay_seconds)
            #     continue # Go to next iteration

            # If successful or a non-retryable error status, return the response
            return response

        except RETRY_EXCEPTIONS as e:
            last_exception = e
            logging.warning(
                f"Network error ({type(e).__name__}) on attempt {retries + 1}/{max_retries + 1} for {url}: {e}. Retrying in {delay_seconds}s...")
            retries += 1
            if retries <= max_retries:
                time.sleep(delay_seconds)
            else:
                logging.error(f"Request failed after {max_retries} retries for {url}.")
                raise last_exception  # Re-raise the last caught exception

        # Catch other non-requests exceptions during the loop
        except Exception as e:
            logging.error(f"Unexpected error during request to {url}: {e}")
            raise  # Re-raise unexpected errors immediately

    # This should ideally not be reached if loop logic is correct, but as fallback:
    logging.error(f"Request failed definitively for {url} after all retries.")
    if last_exception:
        raise last_exception
    else:  # Should not happen if loop ran at least once
        raise requests.exceptions.RequestException(f"Unknown request failure for {url} after retries.")


# Helper Exception for Cancellation
class OperationCanceledError(Exception):
    pass


def get_sharepoint_token(force_refresh=False):
    """
    Get SharePoint access token using client credentials flow with caching
    """
    if stop_event.is_set():
        logging.warning("Stopping token acquisition due to stop event.")
        return None

    with token_lock:
        current_time = time.time()
        if not force_refresh and token_cache['sharepoint_token'] and token_cache['token_expiry'] and token_cache[
            'token_expiry'] > current_time + 60:
            logging.debug("Using cached SharePoint token")
            return token_cache['sharepoint_token']
        try:
            logging.info("Getting new SharePoint access token...")
            token_url = f"https://login.microsoftonline.com/{TENANT_ID}/oauth2/v2.0/token"
            token_data = {
                'grant_type': 'client_credentials',
                'client_id': CLIENT_ID,
                'client_secret': CLIENT_SECRET,
                'scope': 'https://graph.microsoft.com/.default'
            }
            response = requests.post(token_url, data=token_data, verify=False, timeout=30)
            response.raise_for_status()
            token_info = response.json()
            access_token = token_info.get('access_token')
            expires_in = token_info.get('expires_in', 3600)
            if not access_token:
                logging.error("No access token in response")
                raise ValueError(
                    "Failed to obtain SharePoint access token: No access_token in response.")  # Raise error
            token_cache['sharepoint_token'] = access_token
            token_cache['token_expiry'] = current_time + expires_in - 300
            logging.info("Successfully obtained new SharePoint access token")
            return access_token
        except requests.exceptions.RequestException as e:
            logging.error(f"Network error getting SharePoint token: {str(e)}")
            if hasattr(e, 'response') and hasattr(e.response, 'text'): logging.error(
                f"Response content: {e.response.text}")
            raise ConnectionError(f"Network error getting SharePoint token: {str(e)}")  # Raise error
        except Exception as e:
            logging.error(f"Error getting SharePoint token: {str(e)}")
            logging.error(traceback.format_exc())
            raise RuntimeError(f"Error getting SharePoint token: {str(e)}")  # Raise error


def get_site_id(access_token):
    """Get SharePoint site ID with proper format and caching"""
    if token_cache['site_id']:
        logging.debug(f"Using cached site ID: {token_cache['site_id']}")
        return token_cache['site_id']
    if stop_event.is_set(): return None
    try:
        logging.info(f"Getting site ID for {SHAREPOINT_SITE}")
        url = f"https://graph.microsoft.com/v1.0/sites/flyadeal.sharepoint.com:/sites/{SITE}"
        headers = {'Authorization': f'Bearer {access_token}'}
        response = requests.get(url, headers=headers, verify=False, timeout=30)
        if response.status_code == 401:
            logging.info("Token expired when getting site ID, refreshing...")
            new_token = get_sharepoint_token(force_refresh=True)
            if not new_token: return None
            headers = {'Authorization': f'Bearer {new_token}'}
            response = requests.get(url, headers=headers, verify=False, timeout=30)
        response.raise_for_status()
        site_info = response.json()
        site_id = site_info.get('id')
        if not site_id:
            logging.error("No site ID in response")
            raise ValueError("Failed to get Site ID: No site ID found in response.")  # Raise error
        logging.info(f"Using full site ID: {site_id}")
        token_cache['site_id'] = site_id  # Cache the ID
        return site_id
    except requests.exceptions.RequestException as e:
        logging.error(f"Network error getting site ID: {str(e)}")
        if hasattr(e, 'response') and hasattr(e.response, 'text'): logging.error(f"Response content: {e.response.text}")
        raise ConnectionError(f"Network error getting Site ID: {str(e)}")  # Raise error
    except Exception as e:
        logging.error(f"Error getting site ID: {str(e)}")
        logging.error(traceback.format_exc())
        raise RuntimeError(f"Error getting Site ID: {str(e)}")  # Raise error


def get_documents_drive_id(access_token):
    """Get the DriveID for the Documents library with caching"""
    if token_cache['drive_id']:
        logging.debug(f"Using cached Documents drive ID: {token_cache['drive_id']}")
        return token_cache['drive_id']
    if stop_event.is_set(): return None
    try:
        logging.info("Getting Documents drive ID")  # Changed from debug to info
        site_id = get_site_id(access_token)  # Use cached site_id if available
        if not site_id:
            raise ValueError("Could not get site ID for drive lookup")  # Raise error
        headers = {'Authorization': f'Bearer {access_token}'}
        drives_url = f"https://graph.microsoft.com/v1.0/sites/{site_id}/drives"
        response = requests.get(drives_url, headers=headers, verify=False, timeout=30)
        if response.status_code == 401:
            logging.info("Token expired when getting drive ID, refreshing...")
            new_token = get_sharepoint_token(force_refresh=True)
            if not new_token: return None
            headers = {'Authorization': f'Bearer {new_token}'}
            response = requests.get(drives_url, headers=headers, verify=False, timeout=30)
        response.raise_for_status()
        drives_data = response.json()
        drives = drives_data.get('value', [])
        for drive in drives:
            if drive.get('name') == DOCUMENT_LIBRARY:
                drive_id = drive.get('id')
                token_cache['drive_id'] = drive_id
                logging.info(f"Found Documents drive ID: {drive_id}")
                return drive_id
        # Fallbacks (keep as is)
        for drive in drives:
            if drive.get('name', '').lower() == DOCUMENT_LIBRARY.lower():
                drive_id = drive.get('id')
                token_cache['drive_id'] = drive_id
                logging.info(f"Found Documents drive ID (case insensitive): {drive_id}")
                return drive_id
        if drives:
            drive_id = drives[0].get('id')
            token_cache['drive_id'] = drive_id
            logging.warning(f"Using first available drive: {drives[0].get('name')} (ID: {drive_id})")
            return drive_id
        logging.error("No drives found in the site")
        raise LookupError("No drives found in the SharePoint site.")  # Raise error
    except requests.exceptions.RequestException as e:
        logging.error(f"Network error getting Documents drive ID: {str(e)}")
        if hasattr(e, 'response') and hasattr(e.response, 'text'): logging.error(f"Response content: {e.response.text}")
        raise ConnectionError(f"Network error getting Documents Drive ID: {str(e)}")  # Raise error
    except Exception as e:
        logging.error(f"Error getting Documents drive ID: {str(e)}")
        logging.error(traceback.format_exc())
        raise RuntimeError(f"Error getting Documents Drive ID: {str(e)}")  # Raise error


def find_or_create_mazaya_list(access_token):
    """Find the Mazaya list or create it if it doesn't exist."""
    # Check cache first
    if token_cache['list_id']:
        logging.info(f"Using cached list ID: {token_cache['list_id']}")
        return token_cache['list_id']

    if stop_event.is_set(): return None

    try:
        site_id = get_site_id(access_token)
        if not site_id:
            raise ValueError("Cannot find/create list without Site ID")

        list_url = f"https://graph.microsoft.com/v1.0/sites/{site_id}/lists"
        headers = {'Authorization': f'Bearer {access_token}', 'Accept': 'application/json'}
        logging.info(f"Checking for list '{SHAREPOINT_LIST_NAME}'")
        response = requests.get(list_url, headers=headers,
                                params={'$filter': f"displayName eq '{SHAREPOINT_LIST_NAME}'"}, verify=False,
                                timeout=30)

        if response.status_code == 401:
            logging.info("Token expired when checking list, refreshing...")
            new_token = get_sharepoint_token(force_refresh=True)
            if not new_token: return None
            headers['Authorization'] = f'Bearer {new_token}'
            response = requests.get(list_url, headers=headers,
                                    params={'$filter': f"displayName eq '{SHAREPOINT_LIST_NAME}'"}, verify=False,
                                    timeout=30)

        response.raise_for_status()
        lists_data = response.json()
        existing_lists = lists_data.get('value', [])

        if existing_lists:
            list_id = existing_lists[0]['id']
            logging.info(f"Found existing list '{SHAREPOINT_LIST_NAME}' with ID: {list_id}")
            token_cache['list_id'] = list_id  # Store in cache
            return list_id
        else:
            logging.info(f"List '{SHAREPOINT_LIST_NAME}' not found. Creating it...")
            create_list_payload = {
                "displayName": SHAREPOINT_LIST_NAME,
                "columns": [
                    {"name": "Title", "text": {}},  # Default Title column
                    {"name": "OfferDesc", "text": {"allowMultipleLines": True}},
                    {"name": "OfferID", "text": {}},
                    {"name": "Category", "text": {}},
                    {"name": "ImageURL", "hyperlinkOrPicture": {"isPicture": True}}  # Explicitly define as picture URL
                ],
                "list": {"template": "genericList"}
            }
            headers['Content-Type'] = 'application/json'
            create_response = requests.post(list_url, headers=headers, json=create_list_payload, verify=False,
                                            timeout=60)

            if create_response.status_code == 401:
                logging.info("Token expired when creating list, refreshing...")
                new_token = get_sharepoint_token(force_refresh=True)
                if not new_token: return None
                headers['Authorization'] = f'Bearer {new_token}'
                create_response = requests.post(list_url, headers=headers, json=create_list_payload, verify=False,
                                                timeout=60)

            if create_response.status_code >= 400:
                logging.error(
                    f"Failed to create list. Status: {create_response.status_code}, Response: {create_response.text}")
                raise RuntimeError(
                    f"Failed to create SharePoint list '{SHAREPOINT_LIST_NAME}'. Status: {create_response.status_code}")

            new_list_data = create_response.json()
            list_id = new_list_data['id']
            logging.info(f"Successfully created list '{SHAREPOINT_LIST_NAME}' with ID: {list_id}")
            token_cache['list_id'] = list_id  # Store in cache
            return list_id

    except requests.exceptions.RequestException as e:
        logging.error(f"Network error finding/creating list: {str(e)}")
        if hasattr(e, 'response') and hasattr(e.response, 'text'): logging.error(f"Response content: {e.response.text}")
        raise ConnectionError(f"Network error finding/creating SharePoint list: {str(e)}")  # Raise error
    except Exception as e:
        logging.error(f"Error finding or creating list '{SHAREPOINT_LIST_NAME}': {str(e)}")
        logging.error(traceback.format_exc())
        raise RuntimeError(f"Error finding/creating SharePoint list: {str(e)}")  # Raise error


def delete_list_if_exists(access_token, site_id, list_name):
    """Finds a list by display name and deletes it if found."""
    if stop_event.is_set(): return False
    if not site_id:
        logging.error("Site ID is required to delete a list.")
        return False

    logging.info(f"Checking if list '{list_name}' exists for potential deletion...")
    list_url = f"https://graph.microsoft.com/v1.0/sites/{site_id}/lists"
    headers = {'Authorization': f'Bearer {access_token}', 'Accept': 'application/json'}
    # Filter by display name
    params = {'$filter': f"displayName eq '{list_name}'", '$select': 'id'}

    try:
        response = requests.get(list_url, headers=headers, params=params, verify=False, timeout=30)

        if response.status_code == 401:
            logging.info("Token expired checking list existence, refreshing...")
            new_token = get_sharepoint_token(force_refresh=True)
            if not new_token: return False
            headers['Authorization'] = f'Bearer {new_token}'
            response = requests.get(list_url, headers=headers, params=params, verify=False, timeout=30)

        response.raise_for_status()  # Raise for other errors like 403, 500

        lists_data = response.json()
        existing_lists = lists_data.get('value', [])

        if not existing_lists:
            logging.info(f"List '{list_name}' not found. No deletion needed.")
            return True  # Success, nothing to delete

        list_id_to_delete = existing_lists[0].get('id')
        if not list_id_to_delete:
            logging.error(f"Found list '{list_name}' but could not get its ID.")
            return False  # Indicate failure

        logging.warning(f"Found list '{list_name}' with ID {list_id_to_delete}. Attempting deletion...")
        delete_url = f"https://graph.microsoft.com/v1.0/sites/{site_id}/lists/{list_id_to_delete}"

        delete_response = requests.delete(delete_url, headers=headers, verify=False, timeout=60)

        if delete_response.status_code == 401:
            logging.info("Token expired deleting list, refreshing...")
            new_token = get_sharepoint_token(force_refresh=True)
            if not new_token: return False
            headers['Authorization'] = f'Bearer {new_token}'
            delete_response = requests.delete(delete_url, headers=headers, verify=False, timeout=60)

        # Check for successful deletion (204 No Content) or if it's already gone (404 Not Found)
        if delete_response.status_code == 204:
            logging.info(f"Successfully deleted list '{list_name}'.")
            # Clear cached list ID if it matches the deleted one
            if token_cache.get('list_id') == list_id_to_delete:
                token_cache['list_id'] = None
            return True
        elif delete_response.status_code == 404:
            logging.warning(f"List '{list_name}' was not found during deletion attempt (perhaps deleted concurrently).")
            return True  # Treat as success
        else:
            # Raise error for other statuses (e.g., 403 Forbidden)
            logging.error(f"Failed to delete list '{list_name}'. Status: {delete_response.status_code}")
            if hasattr(delete_response, 'text'): logging.error(f"Response: {delete_response.text}")
            delete_response.raise_for_status()
            return False  # Should not reach here if raise_for_status works

    except requests.exceptions.RequestException as e:
        logging.error(f"Network error during list deletion check/process: {str(e)}")
        if hasattr(e, 'response') and hasattr(e.response, 'text'): logging.error(f"Response content: {e.response.text}")
        return False
    except Exception as e:
        logging.error(f"Error during list deletion check/process for '{list_name}': {str(e)}")
        logging.error(traceback.format_exc())
        return False


def get_list_column_internal_names(access_token, site_id, list_id):
    """
    Retrieves a mapping of list column display names (lowercase) to internal names.
    Uses 'name' property as the internal name.
    """
    if stop_event.is_set(): return None
    if not site_id or not list_id:
        logging.error("Site ID and List ID are required to get column names.")
        return None

    try:
        columns_url = f"https://graph.microsoft.com/v1.0/sites/{site_id}/lists/{list_id}/columns"
        headers = {'Authorization': f'Bearer {access_token}', 'Accept': 'application/json'}
        logging.info(f"Getting column definitions for list {list_id}")

        # Corrected $select parameter: removed internalName
        params = {'$select': 'name,displayName'}

        response = requests.get(columns_url, headers=headers, params=params, verify=False, timeout=30)

        if response.status_code == 401:
            logging.info("Token expired getting columns, refreshing...")
            new_token = get_sharepoint_token(force_refresh=True)
            if not new_token: return None
            headers['Authorization'] = f'Bearer {new_token}'
            response = requests.get(columns_url, headers=headers, params=params, verify=False, timeout=30)

        response.raise_for_status()  # Raise HTTPError for bad responses (4xx or 5xx)

        columns_data = response.json()
        columns = columns_data.get('value', [])

        if not columns:
            logging.warning(f"No columns returned for list {list_id}.")
            return {}  # Return empty mapping

        # Create mapping: lowercase display name -> internal name ('name' property)
        column_mapping = {}
        for column in columns:
            display_name = column.get('displayName')
            internal_name = column.get('name')  # 'name' property IS the internal name
            # Some system columns might lack a display name, skip them
            if display_name and internal_name:
                # Store with lowercase display name for consistent lookup
                column_mapping[display_name.lower()] = internal_name

        logging.info(f"Successfully retrieved {len(column_mapping)} column mappings.")
        logging.debug(f"Column Mapping: {json.dumps(column_mapping, indent=2)}")
        return column_mapping

    except requests.exceptions.RequestException as e:
        logging.error(f"Network error getting column names: {str(e)}")
        if hasattr(e, 'response') and hasattr(e.response, 'text'): logging.error(f"Response content: {e.response.text}")
        # Treat failure to get columns as critical
        raise ConnectionError(f"Network error getting list columns: {str(e)}")
    except Exception as e:
        logging.error(f"Error getting column names: {str(e)}")
        logging.error(traceback.format_exc())
        # Treat failure to get columns as critical
        raise RuntimeError(f"Error processing list columns: {str(e)}")


def ensure_mazaya_images_folder(access_token):
    """Ensure the MazayaImages folder exists in the Documents library"""
    if token_cache['mazaya_folder_exists']: return True
    if stop_event.is_set(): return False
    try:
        drive_id = get_documents_drive_id(access_token)
        if not drive_id:
            raise ValueError("Could not get Documents drive ID for folder check/creation")
        logging.info(f"Checking for MazayaImages folder in drive {drive_id}")  # Changed from debug
        headers = {'Authorization': f'Bearer {access_token}'}
        check_url = f"https://graph.microsoft.com/v1.0/drives/{drive_id}/root:/MazayaImages"
        response = requests.get(check_url, headers=headers, verify=False, timeout=30)
        if response.status_code == 401:
            logging.info("Token expired checking folder, refreshing...")
            new_token = get_sharepoint_token(force_refresh=True)
            if not new_token: return False
            headers = {'Authorization': f'Bearer {new_token}'}
            response = requests.get(check_url, headers=headers, verify=False, timeout=30)

        if response.status_code == 404:
            logging.info("MazayaImages folder not found, creating it")
            # Use the simpler /children endpoint which is generally preferred
            create_url = f"https://graph.microsoft.com/v1.0/drives/{drive_id}/root/children"
            folder_data = {
                "name": "MazayaImages",
                "folder": {},
                "@microsoft.graph.conflictBehavior": "fail"  # Fail if it somehow exists now
            }
            create_response = requests.post(create_url, headers={**headers, 'Content-Type': 'application/json'},
                                            json=folder_data, verify=False, timeout=30)

            if create_response.status_code == 401:
                logging.info("Token expired creating folder, refreshing...")
                new_token = get_sharepoint_token(force_refresh=True)
                if not new_token: return False
                headers = {'Authorization': f'Bearer {new_token}'}
                create_response = requests.post(create_url, headers={**headers, 'Content-Type': 'application/json'},
                                                json=folder_data, verify=False, timeout=30)

            if create_response.status_code >= 400 and create_response.status_code != 409:  # 409 Conflict means it was created concurrently
                logging.error(
                    f"Failed to create folder. Status: {create_response.status_code}, Response: {create_response.text}")
                raise RuntimeError(f"Failed to create MazayaImages folder. Status: {create_response.status_code}")

            logging.info("MazayaImages folder created successfully or already exists.")
            token_cache['mazaya_folder_exists'] = True
        elif response.status_code < 400:
            response.raise_for_status()
            token_cache['mazaya_folder_exists'] = True
            logging.info("MazayaImages folder already exists")
        else:
            # Handle other errors from the GET request
            logging.error(f"Error checking for folder. Status: {response.status_code}, Response: {response.text}")
            response.raise_for_status()  # Will raise an HTTPError

        return True
    except requests.exceptions.RequestException as e:
        logging.error(f"Network error ensuring MazayaImages folder: {str(e)}")
        if hasattr(e, 'response') and hasattr(e.response, 'text'): logging.error(f"Response content: {e.response.text}")
        raise ConnectionError(f"Network error ensuring MazayaImages folder: {str(e)}")
    except Exception as e:
        logging.error(f"Failed to ensure MazayaImages folder exists: {str(e)}")
        logging.error(traceback.format_exc())
        raise RuntimeError(f"Error ensuring MazayaImages folder: {str(e)}")


def get_api_token():
    """Get API token with caching"""
    if token_cache['api_token']: return token_cache['api_token']
    if stop_event.is_set(): return None
    try:
        logging.info("Logging into API to get token...")
        session = requests.Session()
        session.verify = False
        login_data = {"LID": USERNAME, "PWD": PASSWORD, "Passcode": "s@v#"}  # Corrected passcode

        # Increased timeout for potentially slow API login
        api_login_timeout = 90  # Set timeout in seconds (e.g., 90)
        logging.info(f"Attempting API login with timeout: {api_login_timeout} seconds")
        response = session.post(LOGIN_URL, data=login_data, timeout=api_login_timeout)

        response.raise_for_status()
        try:
            login_response = response.json()
            if 'UserInfo' in login_response and isinstance(login_response['UserInfo'], list) and login_response[
                'UserInfo']:
                api_token = login_response['UserInfo'][0].get('Token')
                if api_token:
                    token_cache['api_token'] = api_token
                    logging.info("Successfully extracted API token")
                    return api_token
            logging.error(f"Could not extract token from login response: {login_response}")
            raise ValueError("Failed to extract API token from login response.")
        except (json.JSONDecodeError, ValueError, KeyError, IndexError) as e:
            logging.error(
                f"Failed to parse login response or find token: {str(e)}. Response text: {response.text[:500]}")
            raise ValueError(f"Failed to parse API login response: {str(e)}")
    except requests.exceptions.Timeout as e:  # Specifically catch Timeout
        logging.error(f"API login timed out after {api_login_timeout} seconds: {str(e)}")
        raise ConnectionError(f"Network timeout getting API token: {str(e)}")  # Raise ConnectionError for timeout
    except requests.exceptions.RequestException as e:  # Catch other network errors
        logging.error(f"Network error getting API token: {str(e)}")
        if hasattr(e, 'response') and hasattr(e.response, 'text'): logging.error(f"Response content: {e.response.text}")
        raise ConnectionError(f"Network error getting API token: {str(e)}")
    except Exception as e:
        logging.error(f"Error getting API token: {str(e)}")
        logging.error(traceback.format_exc())
        raise RuntimeError(f"Error getting API token: {str(e)}")


def get_all_mazaya_offers(token):
    """Get all Mazaya offers from the API"""
    if stop_event.is_set(): return []
    try:
        logging.info("Getting all Mazaya offers")
        form_data = {"action": "GetMazaya", "LID": USERNAME, "Token": token, "Passcode": PASSCODE}
        response = requests.post(API_URL, data=form_data, verify=False, timeout=60)
        response.raise_for_status()
        try:
            offers_data = response.json()
        except json.JSONDecodeError:
            logging.error(f"Failed to parse JSON from GetMazaya response: {response.text[:200]}...")
            raise ValueError("Invalid JSON response from GetMazaya API")

        if not isinstance(offers_data, dict):
            logging.error(f"Unexpected GetMazaya response format: {offers_data}")
            raise ValueError("Unexpected GetMazaya response format")

        if offers_data.get('Success') is False:
            error_msg = offers_data.get('Error', {}).get('ErrorMsgEn', 'Unknown API error')
            logging.error(f"API returned error on GetMazaya: {error_msg}")
            raise RuntimeError(f"API error getting Mazaya offers: {error_msg}")

        offers = offers_data.get('ResultSet', {}).get('Offers', [])
        if offers is None: offers = []  # Handle explicit null
        if isinstance(offers, dict): offers = [offers]  # Handle single offer case

        if not offers:
            logging.warning("No offers found in API response")
        else:
            logging.info(f"Retrieved {len(offers)} offers from API")
        return offers

    except requests.exceptions.RequestException as e:
        logging.error(f"Network error getting Mazaya offers: {str(e)}")
        if hasattr(e, 'response') and hasattr(e.response, 'text'): logging.error(f"Response content: {e.response.text}")
        raise ConnectionError(f"Network error getting Mazaya offers: {str(e)}")
    except Exception as e:
        logging.error(f"Error getting Mazaya offers: {str(e)}")
        logging.error(traceback.format_exc())
        raise RuntimeError(f"Error getting Mazaya offers: {str(e)}")


def get_offer_details(token, offer_id):
    """Get details for a specific offer including image"""
    if stop_event.is_set(): return None
    try:
        logging.debug(f"Getting details for offer {offer_id}")
        form_data = {"action": "GetMazayaOffer", "LID": USERNAME, "Token": token, "Passcode": PASSCODE,
                     "OfferID": offer_id}
        response = requests.post(API_URL, data=form_data, verify=False, timeout=30)
        response.raise_for_status()
        try:
            offer_details = response.json()
        except json.JSONDecodeError:
            logging.error(f"Failed to parse JSON from GetMazayaOffer response for {offer_id}: {response.text[:200]}...")
            return None  # Treat as non-critical failure for this offer

        if not isinstance(offer_details, dict):
            logging.error(f"Unexpected GetMazayaOffer response format for {offer_id}: {offer_details}")
            return None

        if offer_details.get('Success') is False:
            error_msg = offer_details.get('Error', {}).get('ErrorMsgEn', 'Unknown API error')
            logging.error(f"API returned error for GetMazayaOffer {offer_id}: {error_msg}")
            return None  # Treat as non-critical failure for this offer

        if not offer_details.get('ResultSet'):
            logging.warning(f"No ResultSet found in details for offer {offer_id}")
            return None

        return offer_details.get('ResultSet')  # Return only the ResultSet

    except requests.exceptions.RequestException as e:
        logging.error(f"Network error getting offer details for {offer_id}: {str(e)}")
        if hasattr(e, 'response') and hasattr(e.response, 'text'): logging.error(f"Response content: {e.response.text}")
        return None  # Treat as non-critical failure
    except Exception as e:
        logging.error(f"Error getting offer details for {offer_id}: {str(e)}")
        logging.error(traceback.format_exc())
        return None  # Treat as non-critical failure


def decode_image(image_data):
    """Decode base64 encoded image data"""
    try:
        if not image_data: return None
        if isinstance(image_data, str) and image_data.startswith('data:image'):
            image_data = image_data.split(',', 1)[1]
        try:
            # Add padding if needed
            missing_padding = len(image_data) % 4
            if missing_padding:
                image_data += '=' * (4 - missing_padding)
            image_bytes = base64.b64decode(image_data)
            return image_bytes
        except (base64.binascii.Error, ValueError, TypeError) as e:
            logging.error(
                f"Base64 decoding error: {str(e)} - Input length: {len(image_data)}, First 20 chars: {image_data[:20]}")
            return None
    except Exception as e:
        logging.error(f"Error decoding image: {str(e)}")
        return None


def sanitize_filename(filename):
    """Sanitize filename to ensure it's valid for SharePoint"""
    invalid_chars = r'[<>:"/\\|?*#%&]'  # Added # % &
    sanitized = re.sub(invalid_chars, '_', filename)
    # Remove leading/trailing dots and spaces
    sanitized = sanitized.strip('. ')
    # Ensure filename isn't just dots or empty
    if not sanitized or all(c == '.' for c in sanitized):
        sanitized = f"file_{uuid.uuid4().hex[:8]}"
    # Ensure filename isn't too long (SharePoint path limit is 400, but keep filenames reasonable)
    if len(sanitized) > 128:
        name, ext = os.path.splitext(sanitized)
        max_name_len = 128 - len(ext) - 1  # Max length for name part
        sanitized = name[:max_name_len] + ext
    return sanitized


def sanitize_text(text):
    """Sanitize text for SharePoint"""
    if not text: return ""
    # Remove control characters except for common whitespace like \t, \n, \r
    # Allow tab, newline, carriage return
    text = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]', '', str(text))
    # Replace multiple spaces/newlines with single ones for readability (optional)
    # text = re.sub(r'\s+', ' ', text).strip()
    return text


def get_category_name(category_id):
    """Map category ID to name"""
    # Add ALL category IDs from your API data here
    categories = {
        "2110": "Restaurants", "2111": "Hotels", "2112": "Rent a Car",
        "2113": "Furniture", "2114": "Cars", "2115": "Maintenance",
        "2116": "Education", "2117": "Fitness", "2118": "IT & Electronics",
        "2119": "Health & Medical", "2120":"Entertainment","2121":"Shopping & Clothes",
        "2122": "For Her","2123": "Finance", "2124": "Services", "3129": "Real Estate"
    }
    # Return the name or "Other" if ID not found
    return categories.get(str(category_id), "Other")


def update_complex_field(access_token, site_id, list_id, item_id, field_internal_name, field_payload_value):
    """Updates a specific field for a list item using PATCH."""
    if stop_event.is_set() or not field_payload_value or not field_payload_value.get(
            "Url"):  # Check if value or Url is empty
        logging.warning(
            f"Skipping update for field {field_internal_name} on item {item_id} due to stop signal or empty/invalid value: {field_payload_value}")
        return False  # Return False indicating skip/failure condition met before request

    logging.info(f"Attempting to update field '{field_internal_name}' for item ID: {item_id}")
    update_url = f"{GRAPH_API_BASE}/sites/{site_id}/lists/{list_id}/items/{item_id}/fields"
    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }

    # Payload for the PATCH request contains only the field to update
    update_payload = {
        field_internal_name: field_payload_value  # e.g. {'SP_ImageURL': {'Url':'...', 'Desc': '...'}}
    }
    logging.debug(f"Attempting PATCH for {field_internal_name} with payload: {json.dumps(update_payload)}")

    try:
        response = requests.patch(update_url, headers=headers, json=update_payload, verify=False, timeout=30)

        if response.status_code == 401:
            logging.info(f"Token expired updating {field_internal_name}, refreshing...")
            new_token = get_sharepoint_token(force_refresh=True)
            if not new_token: return False
            headers['Authorization'] = f'Bearer {new_token}'
            response = requests.patch(update_url, headers=headers, json=update_payload, verify=False, timeout=30)

        # Unlike create, PATCH for a specific field failing might not be critical enough to stop everything
        if response.status_code >= 400:
            logging.error(
                f"Failed to update field '{field_internal_name}' for item {item_id}. Status: {response.status_code}")
            raw_response_text = response.text
            logging.error(f"PATCH RAW RESPONSE TEXT for {field_internal_name}:\n{raw_response_text}\n")
            # Consider NOT setting stop_event here, just return False
            # stop_event.set()
            return False  # Indicate update failure

        logging.info(f"Successfully updated field '{field_internal_name}' for item ID: {item_id}")
        return True

    except requests.exceptions.RequestException as e:
        logging.error(f"Network error updating field '{field_internal_name}' for item {item_id}: {str(e)}")
        # Don't necessarily stop for network error during update, just fail this step
        return False
    except Exception as e:
        logging.error(f"Unexpected error updating field '{field_internal_name}' for item {item_id}: {str(e)}")
        # Don't necessarily stop for other errors during update, just fail this step
        return False


def upload_image_to_documents(access_token, image_bytes, filename):
    """Upload image to /documents/MazayaImages/ folder with retry logic."""
    if stop_event.is_set(): return None
    try:
        if not image_bytes:
            logging.error("No image bytes provided for upload")
            return None
        logging.info(f"Uploading image: {filename}")
        drive_id = get_documents_drive_id(access_token)
        if not drive_id:
            logging.error("Failed to get Documents drive ID for image upload")
            return None

        encoded_filename = quote(filename)
        upload_url = f"{GRAPH_API_BASE}/drives/{drive_id}/root:/MazayaImages/{encoded_filename}:/content"
        headers = {'Authorization': f'Bearer {access_token}', 'Content-Type': 'image/jpeg'}

        # --- Make request with retries ---
        response = make_request_with_retries(
            'put',
            upload_url,
            headers=headers,
            data=image_bytes,  # Use 'data' for PUT body
            verify=False,
            timeout=180  # Increase timeout for upload
        )
        # --- End make request ---

        # --- Token Refresh Logic (Still needed if 401 occurs *after* retries) ---
        if response.status_code == 401:
            logging.info("Token expired uploading image (after retries), refreshing...")
            new_token = get_sharepoint_token(force_refresh=True)
            if not new_token: return None
            headers['Authorization'] = f'Bearer {new_token}'
            # Retry the request ONCE more with the new token
            logging.info("Retrying image upload PUT with refreshed token...")
            response = requests.put(upload_url, headers=headers, data=image_bytes, verify=False, timeout=180)
        # --- End Token Refresh ---

        # --- Error Handling for Response ---
        if response.status_code >= 400:
            logging.error(f"Failed to upload image '{filename}' to MazayaImages. Final Status: {response.status_code}")
            if hasattr(response, 'text'): logging.error(f"Upload Response: {response.text}")
            # Don't signal stop_event here, just return None to indicate upload failure
            return None
        # --- End Error Handling ---

        # --- Success ---
        response_data = response.json()
        image_web_url = response_data.get('webUrl')
        if not image_web_url:
            logging.error(f"Image upload successful but no 'webUrl' found in response for {filename}")
            return None  # Treat missing URL as failure

        logging.info(f"Successfully uploaded image '{filename}'. URL: {image_web_url}")
        return image_web_url
        # --- End Success ---

    except OperationCanceledError as e:
        logging.warning(f"Image upload cancelled: {e}")
        return None
    except requests.exceptions.RequestException as e:  # Catch final failure after retries
        logging.error(f"Network error uploading image '{filename}' after retries: {str(e)}")
        if hasattr(e, 'response') and hasattr(e.response, 'text'): logging.error(
            f"Last response content: {e.response.text}")
        # Don't signal stop_event, just fail the upload
        return None
    except Exception as e:
        logging.error(f"Failed to upload image {filename}: {str(e)}")
        logging.error(traceback.format_exc())
        # Don't signal stop_event, just fail the upload
        return None


def create_defined_list(access_token, site_id, list_name):
    """Creates a new SharePoint list storing API CategoryID and mapped Category Name."""
    # --- Function definition as provided in the previous answer ---
    # --- Includes columns: CategoryID (Text), SP_Category (Text), SP_ImageURL (Text), SP_Website (Text) etc. ---
    if stop_event.is_set(): return None
    if not site_id:
        logging.error("Site ID is required to create a list.")
        return None

    logging.info(f"Attempting to create list '{list_name}' storing CategoryID and Name...")
    list_creation_url = f"{GRAPH_API_BASE}/sites/{site_id}/lists"
    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }

    # Define the columns for the new list
    columns_definition = [
        # Title (Built-in) - Populated by OfferNameEn data
        {"name": "CategoryID", "displayName": "API Category ID", "text": {}},  # Store original ID as text
        {"name": "SP_Category", "displayName": "Category", "text": {}},  # Store category NAME as Text
        {"name": "SP_OfferDetails", "displayName": "Offer Details", "text": {"allowMultipleLines": True}},
        # Maps to OfferDesc internal name potentially
        {"name": "SP_ImageURL", "displayName": "Image URL", "text": {"allowMultipleLines": False}},  # Text field now
        {"name": "SP_Website", "displayName": "Website", "text": {"allowMultipleLines": False}},  # Text field now
        # Optional fields based on API structure
        {"name": "SP_OfferNameAr", "displayName": "Offer Name (Ar)", "text": {}},
        {"name": "SP_Contact", "displayName": "Contact Number", "text": {}},
        # Optional Date/Bool/Status fields (Uncomment if needed)
        # {"name": "SP_EffectiveDate", "displayName": "Effective Date", "dateTime": {"format": "dateTime"}},
        # {"name": "SP_DiscontinueDate", "displayName": "Discontinue Date", "dateTime": {"format": "dateTime"}},
        # {"name": "SP_IsUnlimited", "displayName": "Unlimited", "boolean": {}},
        # {"name": "SP_Status", "displayName": "Status", "text": {}},
    ]

    list_payload = {
        "displayName": list_name,
        "columns": columns_definition,
        "list": {"template": "genericList"}
    }

    try:
        response = requests.post(list_creation_url, headers=headers, json=list_payload, verify=False, timeout=90)

        if response.status_code == 401:
            logging.info("Token expired creating list, refreshing...")
            new_token = get_sharepoint_token(force_refresh=True)
            if not new_token: return None
            headers['Authorization'] = f'Bearer {new_token}'
            response = requests.post(list_creation_url, headers=headers, json=list_payload, verify=False, timeout=90)

        if response.status_code == 409:
            logging.warning(f"List '{list_name}' already exists (status 409). Attempting retrieval.")
            find_url = f"{GRAPH_API_BASE}/sites/{site_id}/lists"
            find_params = {'$filter': f"displayName eq '{list_name}'", '$select': 'id'}
            find_response = requests.get(find_url, headers=headers, params=find_params, verify=False, timeout=30)
            if find_response.status_code == 401:
                logging.info("Token expired finding list after 409, refreshing...")
                new_token = get_sharepoint_token(force_refresh=True)
                if not new_token: return None
                headers['Authorization'] = f'Bearer {new_token}'
                find_response = requests.get(find_url, headers=headers, params=find_params, verify=False, timeout=30)

            if find_response.ok:
                found_data = find_response.json().get('value', [])
                if found_data:
                    existing_list_id = found_data[0].get('id')
                    logging.info(f"Found existing list ID after 409 conflict: {existing_list_id}")
                    return existing_list_id
            logging.error(f"List creation failed with 409, but could not find/retrieve existing list ID.")
            response.raise_for_status()

        response.raise_for_status()

        list_data = response.json()
        new_list_id = list_data.get('id')
        if not new_list_id:
            logging.error("List creation succeeded but response did not contain an ID.")
            return None

        logging.info(f"Successfully created list '{list_name}' (with CategoryID/Text URLs) ID: {new_list_id}")
        return new_list_id

    except requests.exceptions.RequestException as e:
        logging.error(f"Network error during list creation: {str(e)}")
        if hasattr(e, 'response') and hasattr(e.response, 'text'): logging.error(f"Response content: {e.response.text}")
        raise ConnectionError(f"Network error creating list '{list_name}': {str(e)}")
    except Exception as e:
        logging.error(f"Error creating list '{list_name}': {str(e)}")
        logging.error(traceback.format_exc())
        raise RuntimeError(f"Error creating list '{list_name}': {str(e)}")


def process_offer(offer_data, category_name, api_token, sharepoint_token=None):
    """Process offer, prepare data including API CategoryID and mapped Category Name."""
    if stop_event.is_set():
        logging.warning(f"Skipping offer {offer_data.get('OfferID', 'Unknown')} due to stop event.")
        return False

    offer_id_original = offer_data.get('OfferID')  # Still need this for identifying the offer
    if not offer_id_original:
        logging.error(f"Offer data missing OfferID: {offer_data.get('OfferNameEn', 'N/A')}")
        return False

    logging.info(f"Processing offer {offer_id_original}")

    # Log API Data (Optional)
    # try: logging.info(f"--- API offer_data for {offer_id_original} ---\n{json.dumps(offer_data, indent=2, ensure_ascii=False)}\n---")
    # except Exception as log_e: logging.error(f"Error logging offer_data: {log_e}")

    try:
        # Get Offer Details
        offer_details_resultset = get_offer_details(api_token, offer_id_original) or {}

        # --- Image Processing ---
        image_bytes = None
        image_path = None  # Path to the saved image
        image_data_raw = offer_details_resultset.get('Image', offer_data.get('Image'))

        if image_data_raw:
            try:  # Decode image logic...
                current_image_data = None
                if isinstance(image_data_raw, list) and image_data_raw:
                    img_item = image_data_raw[0];
                    current_image_data = img_item.get('ImageData') if isinstance(img_item,
                                                                                 dict) else img_item if isinstance(
                        img_item, str) else None
                elif isinstance(image_data_raw, dict):
                    current_image_data = image_data_raw.get('ImageData')
                elif isinstance(image_data_raw, str):
                    current_image_data = image_data_raw

                if current_image_data:
                    image_bytes = decode_image(current_image_data)
                else:
                    logging.warning(f"Could not find valid 'ImageData' structure for {offer_id_original}")
            except Exception as img_e:
                logging.error(f"Error processing image data for {offer_id_original}: {str(img_e)}")

        # --- Determine Actual Title ---
        title_key_to_use = 'OfferNameEn'
        actual_offer_title_raw = offer_details_resultset.get(title_key_to_use, offer_data.get(title_key_to_use,
                                                                                              f'Offer {offer_id_original}'))
        actual_offer_title = sanitize_text(actual_offer_title_raw).strip()
        if actual_offer_title_raw == f'Offer {offer_id_original}': logging.warning(
            f"Could not find '{title_key_to_use}' for offer {offer_id_original}. Defaulting title.")

        # --- Save Image Locally (if applicable) ---
        if image_bytes:
            image_path = save_image_locally(image_bytes, offer_id_original)
            if image_path:
                logging.info(f"Image saved locally for offer {offer_id_original}: {image_path}")
            else:
                logging.warning(f"Failed to save image locally for offer {offer_id_original}.")
        # --- End Image Save ---

        # Get offer description
        offer_description = sanitize_text(
            offer_details_resultset.get('OfferDetailsEn', offer_data.get('OfferDetailsEn', '')))

        # Extract additional fields from the API response
        website_url = sanitize_text(offer_details_resultset.get('WebsiteLink', offer_data.get('WebsiteLink', '')))
        offer_name_ar = sanitize_text(offer_details_resultset.get('OfferNameAr', offer_data.get('OfferNameAr', '')))
        contact_number = sanitize_text(offer_details_resultset.get('ContactNo', offer_data.get('ContactNo', '')))
        effective_date = sanitize_text(offer_details_resultset.get('EffectiveDate', offer_data.get('EffectiveDate', '')))
        discontinue_date = sanitize_text(offer_details_resultset.get('DiscontinueDate', offer_data.get('DiscontinueDate', '')))

        # Convert is_unlimited to integer (0 or 1)
        is_unlimited_raw = offer_details_resultset.get('IsUnlimited', offer_data.get('IsUnlimited', False))
        is_unlimited = 1 if is_unlimited_raw in [True, 'true', 'True', '1', 1] else 0

        status = sanitize_text(offer_details_resultset.get('Status', offer_data.get('Status', '')))
        category_id = sanitize_text(offer_details_resultset.get('CategoryID', offer_data.get('CategoryID', '')))

        # Get existing offers from database to check if this is an update or new offer
        existing_offers = get_existing_offers_from_db()

        # Check if offer already exists in database
        if offer_id_original in existing_offers:
            # Update existing offer
            success = update_offer_in_db(
                offer_id_original,
                actual_offer_title,
                offer_description,
                category_name,
                image_path or '',
                website_url,
                offer_name_ar,
                contact_number,
                effective_date,
                discontinue_date,
                is_unlimited,
                status,
                category_id,
                "Saudia Mazaya"  # Set offer_type to "Saudia Mazaya"
            )
            if success:
                logging.info(f"Updated offer {offer_id_original} in database")
            else:
                logging.error(f"Failed to update offer {offer_id_original} in database")
                return False
        else:
            # Add new offer
            success = add_offer_to_db(
                offer_id_original,
                actual_offer_title,
                offer_description,
                category_name,
                image_path or '',
                website_url,
                offer_name_ar,
                contact_number,
                effective_date,
                discontinue_date,
                is_unlimited,
                status,
                category_id,
                "Saudia Mazaya"  # Set offer_type to "Saudia Mazaya"
            )
            if success:
                logging.info(f"Added offer {offer_id_original} to database")
            else:
                logging.error(f"Failed to add offer {offer_id_original} to database")
                return False

        logging.info(f"Successfully processed offer {offer_id_original}")
        return True  # Success

    # --- Exception Handling ---
    except Exception as e:
        if stop_event.is_set() or \
                isinstance(e, (ConnectionError, RuntimeError)) and "token" in str(e).lower():
            logging.error(f"Critical error processing offer {offer_id_original}: {str(e)}. Ensuring stop.")
            stop_event.set()
            return False
        else:
            logging.error(f"Non-critical error processing offer {offer_id_original}: {str(e)}")
            logging.error(traceback.format_exc())
            return False


def create_list_item(access_token, item_data):
    """Creates item including text URLs, using SP internal names from item_data keys."""
    if stop_event.is_set(): return None

    # --- Retrieve list_id from cache ---
    list_id = token_cache.get('list_id')
    if not list_id:
        logging.error("List ID missing from cache. Cannot create item.")
        stop_event.set()
        raise ValueError("List ID missing, cannot proceed.")

    # Column mapping is optional now, but can be used for validation if desired
    column_mapping = token_cache.get('column_mapping')
    if not column_mapping:
        logging.warning("Column mapping missing from cache. Assuming item_data keys match SP internal names.")

    try:
        site_id = get_site_id(access_token)
        if not site_id:
            raise ValueError("Cannot create list item without Site ID.")

        create_item_url = f"{GRAPH_API_BASE}/sites/{site_id}/lists/{list_id}/items"
        headers = {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }

        # --- Prepare fields payload directly from item_data ---
        # Assumes keys in item_data match the SP internal names defined in create_defined_list
        fields_payload = {}
        processed_keys_log = []

        # List of expected keys from item_data (should match SP internal names)
        # Ensure these match EXACTLY the 'name' values used in create_defined_list
        expected_keys = [
            'Title',  # Built-in field, populated from item_data['OfferNameEn']
            'CategoryID',  # The original ID from API (now a column)
            'SP_Category',  # The mapped Category Name
            'SP_OfferDetails',
            'SP_ImageURL',  # Text field holding the URL string
            'SP_Website',  # Text field holding the URL string
            'SP_OfferNameAr',
            'SP_Contact',
            # Add other SP_ keys if they were defined and populated in process_offer
        ]

        # 1. Populate payload from item_data based on expected keys
        for key in expected_keys:
            if key in item_data and item_data[key] is not None:
                # Add specific type handling if needed (e.g., for boolean 'SP_IsUnlimited')
                # if key == 'SP_IsUnlimited': ...
                # else: Treat as text (including ImageURL and Website now)
                # Convert value to string, allows empty string ''
                fields_payload[key] = str(item_data[key])
                processed_keys_log.append(key)
            # --- IMPORTANT: Handle Title default correctly ---
            elif key == 'Title':  # Check specifically if Title is missing or None AFTER checking if it exists
                if 'Title' not in item_data or item_data.get('Title') is None:
                    logging.warning(f"Title field missing/None in item_data, setting default.")
                    fields_payload['Title'] = "Untitled Offer"
                    processed_keys_log.append('Title')

        # 2. Ensure Title has a non-empty value *after* the loop
        #    (Handles cases where item_data['Title'] was explicitly an empty string)
        if 'Title' in fields_payload and not fields_payload['Title']:
            logging.warning(f"Title field was empty string, setting default 'Untitled Offer'.")
            fields_payload['Title'] = "Untitled Offer"
            # Ensure 'Title' is in log if it wasn't already
            if 'Title' not in processed_keys_log:
                processed_keys_log.append('Title')
        elif 'Title' not in fields_payload:  # Should not happen if logic above is correct
            logging.error("Critical Error: Title not added to payload.")
            return None

        # --- End payload preparation ---

        if 'Title' not in fields_payload:  # Final check
            logging.error("Critical: Title field missing from final payload.")
            return None

        payload = {'fields': fields_payload}
        processed_keys_log.sort()
        logging.info(f"Attempting to create item in list {list_id} with payload keys: {processed_keys_log}")
        logging.debug(f"Payload data for create: {json.dumps(payload, indent=2)}")

        # --- Use Retry Helper for the POST Request ---
        try:
            response = make_request_with_retries(
                'post',
                create_item_url,
                headers=headers,
                json=payload,
                verify=False,  # Consider changing if SSL issues are resolved
                timeout=45,  # Timeout for each attempt
                max_retries=3,
                delay_seconds=5
            )
        except OperationCanceledError as e:  # Catch cancellation during retries
            logging.warning(f"Item creation cancelled during retry loop: {e}")
            return None
        except requests.exceptions.RequestException as e:  # Catch final failure after retries
            logging.error(f"Network error creating list item after all retries: {str(e)}")
            response_text = "N/A"
            if hasattr(e, 'response') and hasattr(e.response, 'text'):
                response_text = e.response.text
            logging.error(f"Last response content (if available): {response_text}")
            stop_event.set()  # Signal stop on persistent network error
            return None
        # --- End Retry Request ---

        # --- Token Refresh Logic (If 401 occurs *after* successful retries or on first try) ---
        if response.status_code == 401:
            logging.info("Token expired creating item (after potential retries), refreshing...")
            new_token = get_sharepoint_token(force_refresh=True)
            if not new_token: return None  # Stop if token refresh fails
            headers['Authorization'] = f'Bearer {new_token}'
            # Retry the request ONCE more with the new token
            logging.info("Retrying item creation POST with refreshed token...")
            try:
                # Use basic requests.post for the single retry after token refresh
                response = requests.post(create_item_url, headers=headers, json=payload, verify=False, timeout=45)
            except requests.exceptions.RequestException as e:
                logging.error(f"Network error during single retry after token refresh: {str(e)}")
                stop_event.set()
                return None
        # --- End Token Refresh ---

        # --- Error Handling for Final Response ---
        if response.status_code >= 400:
            logging.error(f"Failed to create list item. Final Status: {response.status_code}")
            logging.error(f"Request payload keys sent: {processed_keys_log}")
            raw_response_text = response.text
            logging.error(f"RAW RESPONSE TEXT:\n{raw_response_text}\n")
            # Attempt to parse for more details
            error_details = raw_response_text  # Default to raw text
            try:
                error_json = response.json()
                inner_error = error_json.get('error', {}).get('innerError', {})
                # Correctly access the first item in errorDetails if it exists
                field_error_detail = inner_error.get('errorDetails', [{}])[0]
                field_error = field_error_detail.get('message') if isinstance(field_error_detail, dict) else None

                request_id = inner_error.get('request-id', 'N/A')
                error_date = inner_error.get('date', 'N/A')
                main_message = error_json.get('error', {}).get('message', raw_response_text)

                if field_error:
                    error_details = f"Field Error: '{field_error}' | Main Msg: '{main_message}' | RequestId: {request_id} | Date: {error_date}"
                else:
                    error_details = f"Msg: '{main_message}' | RequestId: {request_id} | Date: {error_date}"
            except (json.JSONDecodeError, IndexError, KeyError, TypeError,
                    AttributeError):  # Catch more potential parsing issues
                pass  # Keep raw_response_text on parsing failure

            logging.error(f"Parsed/Raw Error: {error_details}")

            logging.error("Signaling stop due to list item creation failure.")
            stop_event.set()  # Stop on 400
            return None
        # --- End Error Handling ---

        # --- Success ---
        response_data = response.json()
        created_item_id = response_data.get('id')
        if not created_item_id:
            logging.error("Item creation succeeded but response did not contain an item ID.")
            return None  # Treat missing ID as failure

        logging.info(f"Successfully created list item with ID: {created_item_id}")
        # Return the full response data as process_offer might eventually use it
        return response_data
        # --- End Success ---

    # --- Outer Exception Handling ---
    except ValueError as e:  # Catch config errors like missing IDs
        logging.error(f"Configuration error creating list item: {e}")
        stop_event.set()
        return None
    except Exception as e:  # Catch any other unexpected errors
        logging.error(f"Unexpected error in create_list_item function: {str(e)}")
        logging.error(traceback.format_exc())
        stop_event.set()
        return None
    # --- End Outer Exception Handling ---


def process_offer_batch(offer_batch, api_token):
    """Process a batch of offers, stopping if the stop_event is set."""
    results = []

    for offer in offer_batch:
        if stop_event.is_set():
            logging.warning(
                f"Stopping batch processing for offer {offer.get('OfferID', 'Unknown')} due to stop signal.")
            results.append(False)
            continue  # Stop processing more items in this batch

        category = get_category_name(offer.get('CategoryID'))
        # Process the offer with SQLite storage
        success = process_offer(offer, category, api_token)
        results.append(success)
        # If process_offer failed critically and set the stop_event, break the loop
        if stop_event.is_set():
            logging.warning("Stop event detected after processing an offer in the batch.")
            # Fill remaining results as False
            remaining = len(offer_batch) - len(results)
            results.extend([False] * remaining)
            break

    return results


# Assume all imports and other function definitions are present above

def main():
    """Main execution flow with parallel processing."""
    start_time = time.time()
    logging.info("=============================================")
    logging.info("Starting Mazaya offers processing script")
    logging.info(f"Timestamp: {datetime.datetime.now()}")
    logging.info("=============================================")

    # Reset stop event at the start
    stop_event.clear()

    # Initialize key variables
    api_token = None
    total_offers = 0

    try:
        # --- Phase 1: Initialization and Setup ---
        logging.info("Phase 1: Initialization and Setup")

        # Initialize SQLite database
        conn = init_database()
        if conn:
            conn.close()
            logging.info("Successfully initialized SQLite database.")
        else:
            raise RuntimeError("Failed to initialize SQLite database. Cannot proceed.")

        # Get API token for fetching offers
        api_token = get_api_token()
        logging.info("Successfully obtained API token.")

        # Create images directory if it doesn't exist
        images_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'public', 'images', 'mazaya')
        os.makedirs(images_dir, exist_ok=True)
        logging.info(f"Ensured images directory exists at: {images_dir}")

        # Clear database and images directory to override all entries
        clear_database()
        clear_images_directory()
        logging.info("Cleared database and images directory to override all entries")

        logging.info("Setup phase completed successfully.")

        # --- Phase 2: Fetch Offers ---
        logging.info("Phase 2: Fetching Mazaya Offers from API")
        offers = get_all_mazaya_offers(api_token)
        if not offers:
            logging.info("No offers found from the API. Exiting.")
            total_offers = 0
        else:
            total_offers = len(offers)
            logging.info(f"Found {total_offers} offers to process.")
            # Optional: Log first offer data (removed for production run maybe)
            # try:
            #      logging.debug(f"--- API DATA FOR FIRST OFFER IN LIST ... ---\n{json.dumps(offers[0], ...)}\n---")
            # except Exception: pass

        # --- Phase 3: Parallel Processing (RESTORED FOR FULL RUN) ---
        logging.info("Phase 3: Processing offers in parallel")
        MAX_WORKERS = 5  # Restore desired worker count
        BATCH_SIZE = 10  # Restore desired batch size
        successful_offers = 0
        failed_offers = 0
        processed_count = 0

        if total_offers > 0:
            # Removed "PROCESSING ONLY FIRST OFFER" log
            with ThreadPoolExecutor(max_workers=MAX_WORKERS, thread_name_prefix='OfferWorker') as executor:
                futures = []
                # --- Submit ALL batches ---
                for i in range(0, total_offers, BATCH_SIZE):  # Iterate through all offers
                    if stop_event.is_set():
                        logging.warning("Stop event set before submitting all batches.")
                        break
                    batch = offers[i:i + BATCH_SIZE]  # Create batch
                    futures.append(executor.submit(process_offer_batch, batch, api_token))

                logging.info(f"Submitted {len(futures)} batches for processing.")

                # Process completed futures
                for future in as_completed(futures):
                    stop_occurred = stop_event.is_set()
                    if stop_occurred:
                        # If stop is signalled, try cancelling remaining futures
                        logging.warning("Stop event detected in main loop. Attempting to cancel remaining tasks.")
                        for f in futures:
                            if not f.done():
                                f.cancel()
                        # Drain remaining completed futures quickly without processing results deeply
                        try:
                            future.result()  # Attempt to get result to clear it, ignore errors
                        except Exception:
                            pass  # Ignore any exceptions from already cancelled/failed futures
                        continue  # Move to next completed future or break below

                    try:
                        batch_results = future.result()
                        success_count = batch_results.count(True)
                        fail_count = batch_results.count(False)
                        successful_offers += success_count
                        failed_offers += fail_count
                        processed_items_in_batch = len(batch_results)
                        processed_count += processed_items_in_batch

                        logging.info(
                            f"Batch completed. Processed count: {processed_count}/{total_offers} ({successful_offers} success, {failed_offers} failed)")

                    except Exception as exc:
                        logging.error(f'A batch generated an exception: {exc}')
                        logging.error(traceback.format_exc())
                        # Estimate failure count for the batch
                        num_in_batch = BATCH_SIZE  # Approximation
                        failed_offers += num_in_batch
                        processed_count += num_in_batch

                        if not stop_event.is_set():
                            logging.warning("Signaling stop due to batch exception.")
                            stop_event.set()
                        stop_occurred = True  # Mark stop

                    # If stop was signaled, break the loop (no need for the explicit break anymore)
                    if stop_occurred:
                        logging.warning("Stopping main processing loop.")
                        # Cancellation logic (optional but good practice)
                        # logging.info("Attempting to cancel remaining pending tasks...") (already logged above)
                        # for f in futures: # Cancellation already attempted above
                        #      if not f.done(): f.cancel()
                        break  # Exit the as_completed loop
        else:
            logging.info("Skipping processing phase as no offers were found.")

        # --- Phase 4: Summary and Exit ---
        logging.info("Phase 4: Final Summary")
        end_time = time.time()
        duration = end_time - start_time

        logging.info("=============================================")
        logging.info("Processing Summary:")
        logging.info(f"  Total offers from API: {total_offers}")
        logging.info(f"  ✓ Successful offers processed: {successful_offers}")
        logging.info(f"  ✗ Failed offers: {failed_offers}")
        logging.info(f"  ~ Total items processed/attempted in batches: {processed_count}")
        logging.info(f"  Total time taken: {duration:.2f} seconds")
        logging.info("=============================================")

        if failed_offers > 0 or stop_event.is_set():
            logging.error("Processing finished with errors or was stopped prematurely.")
            sys.exit(1)
        else:
            logging.info("Processing completed successfully.")
            sys.exit(0)

    except (ValueError, ConnectionError, RuntimeError, LookupError, NotImplementedError, Exception) as e:
        logging.critical(f"A critical error occurred during execution: {str(e)}")
        logging.critical(traceback.format_exc())
        logging.critical("Script execution aborted.")
        stop_event.set()
        sys.exit(1)


# --- Entry Point ---
if __name__ == "__main__":
    main()
