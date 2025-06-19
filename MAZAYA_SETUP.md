# Mazaya Offers Setup Guide

This guide explains how to set up and run the Mazaya offers script, which fetches employee offers and stores them in a SQLite database for display on the intranet.

## Initial Setup

### Running the Script Manually

To run the script manually for the first time:

#### On Windows:

1. Open a Command Prompt as Administrator
2. Navigate to the project directory
3. Run the batch file:
   ```
   run_mazaya_script.bat
   ```

#### On Linux/Unix:

1. Open a terminal
2. Navigate to the project directory
3. Make the shell script executable (first time only):
   ```
   chmod +x run_mazaya_script.sh
   ```
4. Run the shell script:
   ```
   ./run_mazaya_script.sh
   ```

This will:
- Initialize the SQLite database
- Clear all existing offers from the database
- Clear all existing images from the public/images/mazaya directory
- Fetch all Mazaya offers from the API
- Save the offers to the database
- Save offer images to the public/images/mazaya directory

**Note:** Each time the script runs, it will override all existing entries in the database and all images in the directory.

### Setting Up Automatic Weekly Updates with Cron

To set up automatic weekly updates on Sunday at midnight using cron:

1. Make the shell script executable:
   ```
   chmod +x run_mazaya_script.sh
   ```

2. Open the crontab editor:
   ```
   crontab -e
   ```

3. Add the following line to run the script every Sunday at midnight:
   ```
   0 0 * * 0 /full/path/to/your/project/run_mazaya_script.sh >> /full/path/to/your/project/cron.log 2>&1
   ```

4. Save and exit the editor

Notes:
- Replace `/full/path/to/your/project/` with the actual path to your project directory
- The `>> /full/path/to/your/project/cron.log 2>&1` part redirects both standard output and errors to a log file
- You can check the cron log file for any issues with the scheduled execution

## Troubleshooting

If you encounter issues:

1. Check the `app.log` file in the project directory for error messages
2. Verify that the `mazaya.db` file exists and is not empty
3. Ensure the script has permission to write to the project directory
4. Check that the API credentials in main.py are correct

### Database Schema Issues

If you encounter an error like `table offers has no column named website_url` or similar:

1. Delete the existing `mazaya.db` file (it will be recreated with the correct schema)
2. Run the script again

The script has been updated to automatically delete and recreate the database file if it exists, ensuring that the schema is always up-to-date with the latest columns.

For cron job issues:

1. Check the cron log file specified in your crontab entry
2. Verify that the shell script has execute permissions (`chmod +x run_mazaya_script.sh`)
3. Ensure the cron user has access to the project directory and Python
4. Try using absolute paths for Python in the shell script:
   ```
   /usr/bin/python3 /full/path/to/your/project/main.py
   ```
5. Check system logs for cron-related errors:
   ```
   sudo grep CRON /var/log/syslog
   ```

## Database Structure

The SQLite database contains the following tables:

- `offers`: Stores offer details including title, description, category, and image path
- `metadata`: Stores information about when the database was last updated

## API Endpoints

The following API endpoints are available:

- `/api/mazaya`: Returns all offers
- `/api/mazaya/new`: Returns offers created within the last 7 days (or custom period)

## Components

The Mazaya offers are displayed using the following components:

- `MazayaOffers`: A React component that displays offers from the database
- `MazayaPage`: A page that displays all offers
- Homepage integration: Shows new offers in the "New Offers" section
