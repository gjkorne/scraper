# Job Scraper Codebase Architecture Review

**Date:** April 12, 2025  
**Status:** Phase 0 - Technical Debt Assessment

## 1. Current Architecture Overview

### Frontend Components
- React-based UI with TypeScript
- Main components: `App`, `JobForm`, `JobList`, `AuthForm`
- State management through React hooks
- Supabase for authentication and data storage

### Backend Services
- Supabase Edge Functions for scraping (Deno runtime)
- Single edge function (`scrape-job`) handling multiple site scrapers
- No dedicated API layer beyond Supabase functions

### Data Flow
1. User submits URL via `JobForm` component
2. Frontend calls Supabase function with URL
3. Scraper function identifies site and runs appropriate scraper
4. Scraped data returned to frontend
5. Frontend saves job to Supabase database
6. UI updates to show the new job

## 2. Technical Debt Identified

### Scraper Function Issues

#### 2.1 Code Duplication
- **High Severity:** Significant duplication across scraper implementations
- Each scraper (`scrapeLinkedIn`, `scrapeGreenhouse`, etc.) contains nearly identical:
  - Headers setup
  - Retry logic
  - Error handling
  - Response processing

#### 2.2 Error Handling 
- **Medium Severity:** Inconsistent error messaging
- Error handling scattered throughout functions
- Generic fallback mechanism useful but implementation could be improved

#### 2.3 Maintainability Concerns
- **Medium Severity:** Hard to add new scrapers
- Long functions with mixed responsibilities
- No abstraction for common operations (fetching, parsing, extraction)
- Selectors are hardcoded within functions

#### 2.4 Testing Challenges
- **Medium Severity:** Functions difficult to test in isolation
- Side effects (fetch calls) not properly abstracted
- No dependency injection pattern

### Frontend Issues

#### 2.5 Component Responsibilities
- **Low Severity:** Some components have multiple responsibilities
- App.tsx handles both UI rendering and data fetching
- Limited separation between data and presentation layers

#### 2.6 Error State Management
- **Low Severity:** Error states could be more comprehensive
- Limited feedback to users on specific scraping failures

### Database Schema

#### 2.7 Schema Preparation
- **Medium Severity:** Current schema not optimized for planned features
- No structure for storing analysis results
- No fields for resume-related data

## 3. Recommendations

### 3.1 Refactor Scraper Implementation

```typescript
// Create a base scraper class/interface
interface Scraper {
  canHandle(url: string): boolean;
  scrape(url: string): Promise<ScrapedData>;
}

// Implement scraper factory pattern
class ScraperFactory {
  private scrapers: Scraper[] = [];
  
  registerScraper(scraper: Scraper): void {
    this.scrapers.push(scraper);
  }
  
  getScraper(url: string): Scraper {
    const scraper = this.scrapers.find(s => s.canHandle(url));
    return scraper || new GenericScraper();
  }
}

// Extract common fetch logic
async function fetchWithRetry(url: string, options: RequestOptions): Promise<Response> {
  // Shared retry logic here
}
```

### 3.2 Improve Code Organization

- Split large file into multiple modules:
  - `scrapers/` directory with a file per scraper
  - `utils/` for shared utilities
  - `types.ts` for common type definitions
  - `index.ts` as the main entry point

### 3.3 Enhance Error Handling

- Create consistent error types
- Return structured error responses with:
  - Error code
  - User-friendly message
  - Technical details
  - Suggested next steps

### 3.4 Database Schema Updates

- Add fields for storing job analysis:
  - `keywords` array of extracted skills/requirements
  - `analysisResults` JSON field for detailed analysis
  - `matchScore` for resume matching

- Plan for resume storage:
  - New `resumes` table with versions
  - `resume_sections` for parsed content
  - Relation to jobs for tracking applications

### 3.5 Frontend Improvements

- Create service layer to abstract API calls
- Implement better loading/error states
- Add more detailed form validation

## 4. Implementation Priority

1. **High Priority:**
   - Extract common scraper utilities
   - Implement scraper factory pattern
   - Add missing unit tests

2. **Medium Priority:**
   - Update database schema for analysis
   - Enhance error handling
   - Refactor frontend API calls

3. **Low Priority:**
   - Add additional scraper implementations
   - Improve UI feedback for errors
   - Create component documentation

## 5. Next Steps

1. Create a detailed implementation plan for the refactoring
2. Set up scaffolding for the improved architecture
3. Begin incremental refactoring, starting with the scraper utilities
4. Update database schema to prepare for Phase 1 features
