import os  # Interact with the operating system
import logging  # Logging for errors and information
from dotenv import load_dotenv  # Load environment variables from a .env file
from telegram import Update, Document  # Telegram bot update and document types
from telegram.ext import (  # Importing telegram bot framework components
    ApplicationBuilder,
    MessageHandler,
    ContextTypes,
    filters
)
from gsheet_handler import (  # Importing biomarker-related processing logic
    process_csv_and_update_sheet,  # Function to process CSV and update the Google Sheet
    extract_test_date_from_csv,  # Extract test date from a given file
    count_biomarkers_in_file  # Count biomarkers in a given file
)

# Load environment variables from .env file
load_dotenv()

# Configure logging to show debug information
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Read Telegram bot token from environment variables
BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")

async def handle_document(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle uploaded document, process it, and post results to Google Sheets."""
    document: Document = update.message.document  # Get the uploaded document
    file_name = document.file_name  # Extract the file name
    download_path = os.path.join("downloads", file_name)  # Define path to save the file
    os.makedirs("downloads", exist_ok=True)  # Ensure the downloads folder exists

    file = await context.bot.get_file(document.file_id)  # Retrieve the file from Telegram
    await file.download_to_drive(custom_path=download_path)  # Save the file locally

    try:
        # Try to extract test date from the file content
        test_date = extract_test_date_from_csv(download_path)
        if not test_date:
            test_date = ""  # Fallback if test date is missing
            await update.message.reply_text("⚠️ Test date not found in the file. No date will be used.")
    except Exception:
        # Notify and stop if test date extraction fails
        await update.message.reply_text("⚠️ Error reading the test date from the file.")
        return

    try:
        # Count number of biomarkers in the uploaded file
        total_biomarkers = count_biomarkers_in_file(download_path)

        # Send initial confirmation message
        await update.message.reply_text(
            f"📥 File received: {file_name}\n"
            f"📅 Test date: {test_date}\n"
            f"🧪 Biomarkers in file: {total_biomarkers}"
        )

        # Process and update the Google Sheet
        result = process_csv_and_update_sheet(download_path, test_date)

        # Extract update stats
        new_count = len(result.get('new', []))
        updated = result.get('updated', 0)
        skipped = result.get('skipped', 0)
        written = result.get('written', 0)

        # Format the summary response
        response = (
            f"✅ Sheet updated!\n\n"
            f"📄 Biomarkers in file: {total_biomarkers}\n"
            f"📤 Posted to sheet: {written}\n"
            f"🆕 New: {new_count}\n"
            f"🔄 Updated: {updated}\n"
            f"🚫 Duplicates skipped: {skipped}"
        )

        # Show up to 10 new biomarkers
        if new_count > 0:
            response += "\n\n🆕 New biomarkers:\n"
            response += "\n".join(f"• {name}" for name in result['new'][:10])
            if new_count > 10:
                response += f"\n...and {new_count - 10} more."

        # Send summary to user
        await update.message.reply_text(response)

    except Exception as e:
        # Log and notify user if processing failed
        logger.exception("Error processing file")
        await update.message.reply_text(f"❌ Error: {str(e)}")
    finally:
        # Clean up local file
        if os.path.exists(download_path):
            os.remove(download_path)

if __name__ == '__main__':
    # Create bot application
    app = ApplicationBuilder().token(BOT_TOKEN).build()

    # Register handler for incoming documents
    app.add_handler(MessageHandler(filters.Document.ALL, handle_document))

    # Start polling for messages
    logger.info("🤖 Bot is now polling for messages...")
    app.run_polling()