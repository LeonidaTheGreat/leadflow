#!/bin/bash
# Quick upload helper for Design Agent document
# Run this interactively to upload the doc to the correct folder

DOC_TITLE="Design Agent - UX Patterns & Direction"
FOLDER_ID="13furg0_zOQgGCEFQOK0pWRxXKj8T2ooE"
SOURCE_FILE="/Users/clawdbot/projects/leadflow/agents/design/Design_Agent_UX_Patterns_Direction.md"

echo "=========================================="
echo "Design Agent - Google Doc Upload Helper"
echo "=========================================="
echo ""
echo "This will create the document in the correct folder."
echo "You may be prompted for the keyring password."
echo ""

# Set account
export GOG_ACCOUNT=leonida.assistant@gmail.com

# Create the doc in the specified folder
echo "Creating Google Doc: $DOC_TITLE"
echo "Target Folder: $FOLDER_ID"
echo ""

gog docs create "$DOC_TITLE" --parent "$FOLDER_ID"

echo ""
echo "=========================================="
echo "Next steps:"
echo "1. Open the created doc in Google Drive"
echo "2. Copy content from: $SOURCE_FILE"
echo "3. Paste into the Google Doc"
echo "=========================================="
