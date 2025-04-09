import logging  # Importing the logging module for logging errors and information
import os  # Importing the os module for interacting with the operating system
import re  # Importing the re module for regular expressions
from aiogram import Bot, Dispatcher, executor, types  # Importing necessary classes from aiogram for bot functionality
from dotenv import load_dotenv  # Importing load_dotenv to load environment variables from a .env file
from gsheet_handler import (  # Importing functions for handling Google Sheets
    process_csv_and_update_sheet,  # Function to process CSV and update Google Sheets
    extract_test_date_from_csv,  # Function to extract test date from the CSV file
    count_biomarkers_in_file  # Function to count biomarkers in the given file
)

load_dotenv()  # Loading environment variables from the .env file

BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")  # Retrieving the Telegram bot token from environment variables
bot = Bot(token=BOT_TOKEN)  # Creating a Bot instance with the provided token
dp = Dispatcher(bot)  # Creating a Dispatcher instance to handle updates

@dp.message_handler(content_types=types.ContentType.DOCUMENT)  # Defining a handler for document messages
async def handle_docs(message: types.Message):  # Asynchronous function to handle incoming document messages
    document = message.document  # Accessing the document from the message
    file_path = os.path.join("downloads", document.file_name)  # Defining the file path to save the document
    os.makedirs("downloads", exist_ok=True)  # Creating the downloads directory if it doesn't exist

    await message.document.download(destination_file=file_path)  # Downloading the document to the specified file path

    try:  # Attempting to extract the test date from the CSV file
        test_date = extract_test_date_from_csv(file_path)  # Extracting the test date from the downloaded file
        if not test_date:  # Checking if the test date was not found
            test_date = "Fallback Test Date"  # Fallback if test date is not found
            await message.reply("⚠️ Test date not found in the file header. Using fallback date.")  # Informing the user about the fallback
    except Exception:  # Catching any exceptions that occur during test date extraction
        await message.reply("⚠️ Error reading the test date from the file.")  # Informing the user about the error
        return  # Exiting the function if there's an error

    try:  # Attempting to count biomarkers in the file
        total_biomarkers = count_biomarkers_in_file(file_path)  # Counting the total biomarkers in the file

        await message.reply(  # Sending a reply to the user with file details
            f"📥 File received: {document.file_name}\n"
            f"📅 Test date: {test_date}\n"
            f"🧪 Biomarkers in file: {total_biomarkers}"
        )

        result = process_csv_and_update_sheet(file_path, test_date)  # Processing the CSV and updating the Google Sheet
        col_letter = result.get('col_letter', '?')  # Getting the column letter where data was posted
        new_count = len(result.get('new', []))  # Counting new biomarkers added
        updated = result.get('updated', 0)  # Counting updated biomarkers
        skipped = result.get('skipped', 0)  # Counting skipped duplicates
        written = result.get('written', 0)  # Counting total written entries

        response = (  # Preparing the response message to the user
            f"✅ Sheet updated!\n\n"
            f"📄 Biomarkers in file: {total_biomarkers}\n"
            f"📤 Posted to sheet: {written} (in column {col_letter})\n"
            f"🆕 New: {new_count}\n"
            f"🔄 Updated: {updated}\n"
            f"🚫 Duplicates skipped: {skipped}"
        )

        if new_count > 0:  # Checking if there are new biomarkers
            response += "\n\n🆕 New biomarkers:\n"  # Adding a section for new biomarkers
            response += "\n".join(f"• {name}" for name in result['new'][:10])  # Listing the new biomarkers
            if new_count > 10:  # Checking if there are more than 10 new biomarkers
                response += f"\n...and {new_count - 10} more."  # Informing the user about additional new biomarkers

        await message.reply(response)  # Sending the final response to the user

    except Exception as e:  # Catching any exceptions that occur during file processing
        logging.exception("Error processing file")  # Logging the error for debugging
        await message.reply(f"❌ Error: {str(e)}")  # Informing the user about the processing error
    finally:  # Final block to execute regardless of success or failure
        if os.path.exists(file_path):  # Checking if the file exists
            os.remove(file_path)  # Removing the file after processing

if __name__ == '__main__':  # Checking if the script is being run directly
    logging.basicConfig(level=logging.INFO)  # Configuring logging to display info level messages
    executor.start_polling(dp, skip_updates=True)  # Starting the bot and polling for updates, skipping any that arrived while offline