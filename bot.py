import os  # Interact with the operating system for path manipulation and environment variables
import logging  # Logging for errors and information 
from dotenv import load_dotenv  # Load environment variables from a .env file
from telegram import Update, Document  # Import specific classes from the `python-telegram-bot` library: `Update` (represents an incoming update like a message) and `Document` (represents a file)
from telegram.ext import (  # Importing telegram bot framework components
    ApplicationBuilder, # Used to build the main bot application instance.
    MessageHandler, # A handler specifically for processing messages (including documents).
    ContextTypes, # Contains type hints for the `context` object passed to handlers.
    filters # Provides filters to specify which updates a handler should process (e.g., only documents).
)
from gsheet_handler import (  # Import functions from the local `gsheet_handler.py` file
    process_csv_and_update_sheet,  # The function that handles reading the CSV and updating the Google Sheet
    extract_test_date_from_filename,  # The function to get the test date from the CSV
    count_biomarkers_in_csv  # The function to count biomarker rows in the CSV
)

# Load environment variables from .env file
load_dotenv()

# Configure logging to show debug information
logging.basicConfig(level=logging.INFO) # Configure the root logger to output messages of level INFO and higher.
logger = logging.getLogger(__name__) # Get a logger instance named after the current module (`bot`)

# Read Telegram bot token from environment variables
BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN") 

async def handle_document(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None: # Define an asynchronous function that will handle incoming document messages.
    """Handle uploaded document, process it, and post results to Google Sheets."""
    document: Document = update.message.document # Get the `Document` object from the incoming message
    file_name = document.file_name  # Extract the original filename of the uploaded document
    download_path = os.path.join("downloads", file_name) # Construct the local path where the file will be saved (in a 'downloads' subdirectory)
    os.makedirs("downloads", exist_ok=True)  # Create the 'downloads' directory if it doesn't already exist

    file = await context.bot.get_file(document.file_id) # Get a `File` object from Telegram using the document's file ID
    await file.download_to_drive(custom_path=download_path) # Download the file content from Telegram servers and save it to the specified local path.

    try: # Start a block to handle potential errors during date extraction.
        # Try to extract test date from the file content
        test_date = extract_test_date_from_filename(download_path) # Call the function from `gsheet_handler` to extract the test date from the downloaded file.
        if not test_date: # If the `extract_test_date_from_csv` function returned None or an empty string.
            test_date = ""  # Set `test_date` to an empty string as a fallback.
            await update.message.reply_text("⚠️ Test date not found in the file. No date will be used.") # Send a message back to the user in Telegram indicating the date wasn't found.
    except Exception: # Catch any exception that occurs during date extraction.
        await update.message.reply_text("⚠️ Error reading the test date from the file.") # Inform the user that there was an error reading the date.
        return # Exit the handler function early if date extraction failed critically.

    try: # Start a block for counting biomarkers and updating the sheet
        total_biomarkers = count_biomarkers_in_csv(download_path) # Call the function from `gsheet_handler` to count valid biomarker rows in the file.
        await update.message.reply_text( # Send an initial confirmation message to the user.
            f"📥 File received: {file_name}\n" # Include the filename
            f"📅 Test date: {test_date}\n" # Include the extracted test date or 'Not found'.
            f"🧪 Biomarkers in file: {total_biomarkers}" # Include the count of biomarkers found in the file.
        )

        await update.message.reply_text("⏳ Processing biomarkers and uploading to Google Sheets...") # Inform the user that the processing is starting.

        result = process_csv_and_update_sheet(download_path, test_date) # Call the main processing function from `gsheet_handler`, passing the file path and extracted date.

        # Extract update stats
        new_count = len(result.get('new', [])) # Get the number of new biomarkers added from the result dictionary
        skipped = result.get('skipped', 0) # Get the count of skipped duplicate biomarkers from the result dictionary.
        written = result.get('written', 0) # Get the count of biomarkers actually written (new + updated non-duplicates) from the result.

        # Format the summary response
        response = (
            f"✅ Sheet updated!\n\n"
            f"📄 Biomarkers in file: {total_biomarkers}\n"
            f"📤 Posted to sheet: {written}\n"
            f"🆕 New: {new_count}\n"
            f"🚫 Duplicates skipped: {skipped}"
        )

        potential_duplicates = result.get('potential_duplicates', [])  # Retrieve list of potential duplicate biomarker pairs from the result, or an empty list if none
        if potential_duplicates:  # If there are any potential duplicates detected
            response += "\n\n⚠️ Potential duplicates detected:\n"  # Add a warning header to the response message
            for new_name, existing_name in potential_duplicates:  # Iterate over each pair of new biomarker and existing similar biomarker
                response += f"• {new_name} ↔ {existing_name}\n"  # Add a line showing the new biomarker matched with the existing one

        # Show up to 10 new biomarkers
        if new_count > 0: # If there were any new biomarkers added
            response += "\n\n🆕 New biomarkers:\n" # Append a header for the list of new biomarkers to the response string
            response += "\n".join(f"• {name}" for name in result['new'][:10]) # Add the names of the first 10 new biomarkers, formatted as a bulleted list.
            if new_count > 10: #If there were more than 10 new biomarkers.
                response += f"\n...and {new_count - 10} more." # Add a message indicating how many more new biomarkers were added but not listed.# Add a message indicating how many more new biomarkers were added but not listed.

        await update.message.reply_text(response) # Send the final summary message back to the user in Telegram.

    except Exception as e: # Catch any exception during the biomarker counting or sheet updating process.        
        logger.exception("Error processing file") # Log the detailed exception information.
        await update.message.reply_text(f"❌ Error: {str(e)}") # Send a message to the user indicating an error occurred, including the error message.
    finally: # Start a block of code that will always execute, whether an exception occurred or not.
        # Clean up local file
        if os.path.exists(download_path): # Check if the downloaded file still exists locally
            os.remove(download_path) # Delete the downloaded file from the local filesystem.

if __name__ == '__main__': # Ensure the following code only runs when the script is executed directly.
    # Create bot application
    app = ApplicationBuilder().token(BOT_TOKEN).build()

    app.add_handler(MessageHandler(filters.Document.ALL, handle_document)) # Add the `handle_document` function as a handler for all incoming messages that contain a document.

    # Start polling for messages
    logger.info("🤖 Bot is now polling for messages...") # Log an informational message indicating the bot is starting.
    app.run_polling() # Start the bot, making it continuously check for new updates (messages) from Telegram.