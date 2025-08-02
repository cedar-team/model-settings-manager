# Quick Start Guide

## 🚀 Get Started in 3 Steps

### 1. Prerequisites
```bash
# Install Snowflake CLI (required for refresh feature)
brew install snowflake-cli

# Authenticate with Snowflake
snow login
```

### 2. Installation & Startup
```bash
# Navigate to the project
cd model-settings-page

# Install all dependencies
npm install

# Start both frontend and backend
npm run dev
```

This will start:
- **Frontend**: http://localhost:5173 (React app)
- **Backend**: http://localhost:3001 (Express API)

### 3. Usage

1. **Open the app**: Navigate to http://localhost:5173
2. **Upload CSV files** or **use the refresh button**:
   - **Master List**: Upload CSV with columns: Name, Description, Created on, Team
   - **Unused Settings**: Either upload CSV or click "Refresh from Snowflake" 
   - **Remaining Settings**: Upload CSV with Name column
3. **Analyze the data** with filtering, sorting, and export features

## 🔄 Refresh Feature

The **"Refresh from Snowflake"** button in the "Unused Model Settings" section will:
1. Query Snowflake directly using the same logic as `model_settings_utils`
2. Fetch unused model settings in real-time
3. Populate the data automatically (no CSV needed!)

## 🛠️ Development Commands

```bash
# Start both frontend and backend
npm run dev

# Start individually
npm run dev:frontend    # React only
npm run dev:backend     # Express API only

# Build for production
npm run build

# Check backend health
curl http://localhost:3001/health
```

## 🐛 Troubleshooting

### Backend won't start?
- Ensure Node.js 18+ is installed
- Run `npm install` to install dependencies
- Check if port 3001 is available

### Refresh button not working?
- Ensure Snowflake CLI is installed: `snow --version`
- Authenticate with Snowflake: `snow login`
- Check backend logs in terminal for error details

### Frontend can't connect to backend?
- Ensure backend is running on port 3001
- Check CORS settings if running on different domains

## 📁 Project Structure

```
model-settings-page/
├── src/                 # React frontend
│   ├── components/      # React components
│   ├── services/        # API client
│   └── ...
├── server/              # Express.js backend
│   ├── index.ts         # Main server file
│   └── ...
├── package.json         # Dependencies & scripts
└── README.md           # Full documentation
```

## 🎯 Next Steps

- Read the full [README.md](./README.md) for detailed documentation
- Check [REFRESH_FEATURE.md](./REFRESH_FEATURE.md) for technical details
- Start uploading your CSV files or use the refresh feature!

---

**Need help?** Check the logs in your terminal or review the error messages in the browser console.