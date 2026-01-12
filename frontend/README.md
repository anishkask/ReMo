# ReMo Frontend

React (Vite) frontend for the ReMo application.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## Project Structure

```
src/
├── components/    # Reusable React components
├── pages/         # Page-level components
├── hooks/         # Custom React hooks
├── services/      # API client services
├── utils/         # Utility functions
├── App.jsx        # Main App component
└── main.jsx       # Entry point
```

## Development

- The frontend is configured to communicate with the backend at `http://localhost:8000`
- Hot Module Replacement (HMR) is enabled for fast development
- API service is located in `src/services/api.js`
