# API Documentation

**Last Updated:** April 12, 2025  
**Project:** Job Scraper & Resume Customizer

This document provides a comprehensive reference for all API endpoints in the Job Scraper & Resume Customizer application. It details request formats, response structures, error handling, and authentication requirements.

## Overview

The application exposes several API endpoints implemented as Supabase Edge Functions. These functions handle job scraping, resume processing, and data management operations.

### Base URL

All API endpoints are available at the Supabase Edge Functions URL:

```
https://{SUPABASE_PROJECT_ID}.supabase.co/functions/v1/
```

### Authentication

Most endpoints require authentication using a Supabase JWT token. Include the token in the `Authorization` header:

```
Authorization: Bearer {SUPABASE_JWT_TOKEN}
```

For development, the anonymous key can be used:

```
Authorization: Bearer {SUPABASE_ANON_KEY}
```

### Error Handling

All endpoints follow a consistent error response format:

```json
{
  "error": "Brief error description",
  "details": "Detailed explanation of what went wrong",
  "suggestion": "Optional recommendation for resolving the issue",
  "type": "Optional error type identifier"
}
```

Common HTTP status codes:
- `200 OK`: Request successful
- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Authentication valid but insufficient permissions
- `404 Not Found`: Resource not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server-side error

## Endpoints

### 1. Scrape Job Posting

Scrapes job details from a provided URL.

**URL**: `/scrape-job`

**Method**: `POST`

**Auth Required**: Yes

**Request Body**:
```json
{
  "url": "https://example.com/job-posting"
}
```

**Success Response (200 OK)**:
```json
{
  "title": "Software Engineer",
  "company": "Example Corp",
  "location": "New York, NY",
  "description": "Detailed job description...",
  "requirements": ["JavaScript", "React", "Node.js"],
  "salary": "$100,000 - $130,000",
  "remote": true,
  "postedDate": "2025-03-15",
  "source": "linkedin.com"
}
```

**Error Response Examples**:

*Invalid URL (400 Bad Request)*:
```json
{
  "error": "Invalid URL format",
  "details": "The provided URL is not properly formatted",
  "suggestion": "Please provide a complete URL including http:// or https://"
}
```

*Unsupported Platform (400 Bad Request)*:
```json
{
  "error": "Indeed URLs are not supported",
  "message": "Due to Indeed's security measures, we cannot automatically fetch job details from Indeed. Please try one of these alternatives:\n\n1. Use the LinkedIn job posting URL\n2. Use the company's direct careers page URL\n3. Enter the job details manually",
  "type": "UNSUPPORTED_PLATFORM"
}
```

*Scraping Failed (500 Internal Server Error)*:
```json
{
  "error": "Failed to scrape job details",
  "details": "Error message from scraper",
  "suggestion": "Please ensure the URL is accessible and points to a public job posting page. If the issue persists, try entering the job details manually."
}
```

**Notes**:
- The function attempts to use a specialized scraper based on the URL domain
- If the specialized scraper fails, it falls back to a generic scraper
- Some platforms (e.g., Indeed) are not supported due to anti-scraping measures
- The response structure may vary slightly depending on what data could be extracted

**Code Example**:
```javascript
async function fetchJobDetails(url) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/scrape-job`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch job details');
  }
  
  return await response.json();
}
```

---

### 2. Save Job Posting (Database API)

Saves a scraped job to the user's collection.

> Note: This endpoint uses Supabase's built-in database API rather than a custom Edge Function.

**PostgreSQL Function**: `save_job`

**Auth Required**: Yes (RLS enforced)

**Request Format**:
```sql
SELECT * FROM save_job(
  url TEXT,
  title TEXT,
  company TEXT,
  description TEXT,
  status TEXT DEFAULT 'interested'
);
```

**Response**:
```json
{
  "id": "uuid",
  "user_id": "auth.user.id",
  "url": "https://example.com/job-posting",
  "title": "Software Engineer",
  "company": "Example Corp",
  "description": "Detailed job description...",
  "status": "interested",
  "date_added": "2025-04-12T14:30:00Z",
  "date_modified": "2025-04-12T14:30:00Z",
  "notes": ""
}
```

**JavaScript Example**:
```javascript
async function saveJob(jobData) {
  const { data, error } = await supabase
    .from('jobs')
    .insert({
      url: jobData.url,
      title: jobData.title,
      company: jobData.company,
      description: jobData.description,
      status: 'interested'
    })
    .select()
    .single();
    
  if (error) throw error;
  return data;
}
```

## Upcoming Endpoints (Planned for Phase 1)

The following endpoints are planned for implementation in Phase 1:

### 1. Analyze Job Description

Extracts keywords, skills, and other relevant information from a job description.

**URL**: `/analyze-job`

**Method**: `POST`

**Request Body**:
```json
{
  "job_id": "uuid",
  "description": "Full job description text..."
}
```

**Expected Response**:
```json
{
  "job_id": "uuid",
  "keywords": ["react", "typescript", "node.js"],
  "required_skills": ["JavaScript", "React", "Git"],
  "preferred_skills": ["TypeScript", "AWS", "Docker"],
  "experience_level": "3-5 years",
  "education_requirements": ["Bachelor's degree"],
  "sentiment_analysis": {
    "work_life_balance": 0.8,
    "team_culture": 0.7,
    "technical_focus": 0.9
  }
}
```

### 2. Upload Resume

Uploads and parses a resume document.

**URL**: `/upload-resume`

**Method**: `POST`

**Content-Type**: `multipart/form-data`

**Form Data**:
- `file`: Resume file (PDF, DOCX)
- `name`: Resume name/version

**Expected Response**:
```json
{
  "id": "uuid",
  "user_id": "auth.user.id",
  "name": "Software Engineer Resume",
  "content": {
    "parsed_sections": {
      "contact": {...},
      "experience": [...],
      "education": [...],
      "skills": [...]
    },
    "raw_text": "Full resume text..."
  },
  "file_url": "https://storage.url/path/to/file",
  "created_at": "2025-04-12T15:45:00Z"
}
```

## Rate Limits

To ensure service stability, the following rate limits apply:

| Endpoint | Rate Limit |
|----------|------------|
| `/scrape-job` | 5 requests per minute |
| `/analyze-job` | 10 requests per minute |
| `/upload-resume` | 3 requests per minute |

Exceeding these limits will result in a `429 Too Many Requests` response.

## Security Considerations

- All API requests should be made over HTTPS
- Sensitive data is protected by Supabase Row Level Security (RLS)
- User data is isolated by `user_id` in all database tables
- File uploads are scanned for malware before processing
- API keys should never be exposed in client-side code

## Implementation Details

The APIs are implemented using:
- Supabase Edge Functions (Deno runtime)
- TypeScript for type safety
- Modular architecture for maintainability
- Comprehensive error handling
- Detailed logging for debugging and analytics

## Changelog

**April 12, 2025**
- Initial API documentation created
- Documented `/scrape-job` endpoint and database functions
- Added planned endpoints for Phase 1
