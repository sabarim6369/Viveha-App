# Page Time Insights API

## Overview
This API tracks and provides insights on how much time each user spends on each page in the application.

## Endpoints

### 1. Track Page Time
**POST** `/api/insights/track`

Records a user's time spent on a specific page.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "pageName": "HomeScreen",
  "timeSpent": 45.5,
  "sessionId": "session-123-456",
  "deviceInfo": {
    "platform": "ios",
    "appVersion": "1.0.0"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Page time tracked successfully",
  "data": {
    "_id": "...",
    "clientId": "...",
    "pageName": "HomeScreen",
    "timeSpent": 45.5,
    "timestamp": "2026-03-07T..."
  }
}
```

---

### 2. Get Page Time Insights
**GET** `/api/insights/page-time`

Get aggregated insights of time spent on each page for the authenticated user.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `startDate` (optional): Filter by start date (ISO format)
- `endDate` (optional): Filter by end date (ISO format)
- `pageName` (optional): Filter by specific page name
- `limit` (optional): Limit number of pages returned (default: 100)

**Example Request:**
```
GET /api/insights/page-time?startDate=2026-03-01&endDate=2026-03-07&limit=10
```

**Response:**
```json
{
  "success": true,
  "data": {
    "pageBreakdown": [
      {
        "pageName": "HomeScreen",
        "totalTimeSpent": 3450.5,
        "averageTimeSpent": 57.51,
        "visitCount": 60,
        "minTimeSpent": 12.3,
        "maxTimeSpent": 125.8,
        "lastVisit": "2026-03-07T..."
      },
      {
        "pageName": "CreateInvoiceScreen",
        "totalTimeSpent": 2100.3,
        "averageTimeSpent": 84.01,
        "visitCount": 25,
        "minTimeSpent": 45.2,
        "maxTimeSpent": 180.5,
        "lastVisit": "2026-03-06T..."
      }
    ],
    "overallStats": {
      "totalTimeSpent": 15234.8,
      "totalVisits": 285,
      "uniquePages": 12,
      "averageTimePerVisit": 53.46
    },
    "sessionStats": {
      "averageSessionDuration": 450.5,
      "averagePagesPerSession": 5.2,
      "totalSessions": 45
    }
  }
}
```

**Insights Explanation:**
- `pageBreakdown`: Array of pages with time metrics
  - `totalTimeSpent`: Total seconds spent on this page (all visits combined)
  - `averageTimeSpent`: Average seconds per visit
  - `visitCount`: Number of times page was visited
  - `minTimeSpent`: Shortest visit duration
  - `maxTimeSpent`: Longest visit duration
  - `lastVisit`: Timestamp of most recent visit

- `overallStats`: Overall statistics across all pages
  - `totalTimeSpent`: Total seconds spent across all pages
  - `totalVisits`: Total number of page visits
  - `uniquePages`: Number of different pages visited
  - `averageTimePerVisit`: Average time spent per page visit

- `sessionStats`: Session-based analytics
  - `averageSessionDuration`: Average total time per session
  - `averagePagesPerSession`: Average number of pages visited per session
  - `totalSessions`: Total number of sessions tracked

---

### 3. Get Tracking History
**GET** `/api/insights/history`

Get detailed tracking history with pagination.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Records per page (default: 50)
- `pageName` (optional): Filter by specific page name
- `sessionId` (optional): Filter by session ID

**Example Request:**
```
GET /api/insights/history?page=1&limit=20&pageName=HomeScreen
```

**Response:**
```json
{
  "success": true,
  "data": {
    "history": [
      {
        "_id": "...",
        "clientId": "...",
        "pageName": "HomeScreen",
        "timeSpent": 45.5,
        "sessionId": "session-123",
        "timestamp": "2026-03-07T...",
        "deviceInfo": {
          "platform": "ios",
          "appVersion": "1.0.0"
        }
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalRecords": 90,
      "limit": 20
    }
  }
}
```

---

## Authentication
All endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

## Error Responses
```json
{
  "success": false,
  "message": "Error message here"
}
```

Common status codes:
- `200`: Success
- `201`: Created successfully
- `400`: Bad request (missing/invalid parameters)
- `401`: Unauthorized (invalid/missing token)
- `500`: Internal server error

## Usage Example

### Track user spending 30 seconds on Home Screen:
```javascript
const response = await axios.post('http://localhost:10000/api/insights/track', {
  pageName: 'HomeScreen',
  timeSpent: 30,
  sessionId: 'unique-session-id',
  deviceInfo: {
    platform: 'android',
    appVersion: '1.0.0'
  }
}, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### Get insights for the last 7 days:
```javascript
const sevenDaysAgo = new Date();
sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

const response = await axios.get('http://localhost:10000/api/insights/page-time', {
  params: {
    startDate: sevenDaysAgo.toISOString(),
    endDate: new Date().toISOString()
  },
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

## Notes
- Time is tracked in seconds (can include decimals for millisecond precision)
- All times are stored with timestamps for temporal analysis
- Session ID is optional but recommended for session-based analytics
- Data is scoped per user (clientId) automatically from the JWT token
