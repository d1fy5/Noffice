#!/bin/bash
# Load NVM / Node into PATH if not present
if ! command -v node &> /dev/null; then
    if [ -d "$HOME/.nvm/versions/node/v20.20.2/bin" ]; then
        export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
    fi
fi

echo "=============================================="
echo "      NOFFICE - OFFICE MANAGEMENT SYSTEM      "
echo "=============================================="
echo ""
echo "Starting the Database and Web Application..."
echo "Backend:  http://localhost:3001"
echo "Frontend: http://localhost:5173"
echo ""
npm run start
