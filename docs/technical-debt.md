# Technical Debt Assessment

**Date:** April 12, 2025  
**Status:** Phase 0 - Planning & Foundation

This document identifies specific technical debt items in the current codebase and prioritizes them for addressing during Phase 0 of the project.

## Priority Technical Debt Items

### 1. Scraper Code Duplication (High Priority)

**Problem:**
Each scraper function (`scrapeLinkedIn`, `scrapeGreenhouse`, etc.) contains nearly identical code for:
- Setting up HTTP headers
- Implementing retry logic
- Error handling patterns
- HTML parsing approaches

**Impact:**
- Difficult to maintain as changes need to be replicated across multiple functions
- Increases chance of inconsistent behavior between scrapers
- Makes testing more difficult and verbose

**Solution:**
- Extract common functionality into utility functions
- Implement a base scraper class/interface
- Use factory pattern for scraper selection

**Estimated Effort:** 4-6 hours

---

### 2. Scraper Error Handling (Medium Priority)

**Problem:**
- Error handling is inconsistent across scrapers
- Error messages vary in detail and helpfulness
- Fallback mechanism works but implementation is not optimal

**Impact:**
- Users receive inconsistent error messages
- Debugging is more difficult
- Some errors may not provide adequate guidance for resolution

**Solution:**
- Create standardized error types
- Implement consistent error formatting
- Improve error messages with actionable suggestions

**Estimated Effort:** 2-3 hours

---

### 3. Large Monolithic Scraper File (Medium Priority)

**Problem:**
- All scraper code is in a single file (19,000+ lines)
- No modular organization
- Makes navigation and maintenance difficult

**Impact:**
- Reduced developer productivity
- Higher cognitive load when making changes
- Harder to understand component relationships

**Solution:**
- Split into modular files by responsibility
- Create proper directory structure
- Implement proper imports/exports

**Estimated Effort:** 3-4 hours

---

### 4. Lack of Type Safety in Scraper Returns (Medium Priority)

**Problem:**
- Inconsistent return types across scraper functions
- Some edge cases not properly typed
- Error responses could be better typed

**Impact:**
- Type errors may occur at runtime
- Harder to understand expected return values
- Documentation through types is limited

**Solution:**
- Define consistent interface for scraper returns
- Add proper type annotations throughout
- Use discriminated unions for error handling

**Estimated Effort:** 2-3 hours

---

### 5. No Abstraction for Fetch Operations (Medium Priority)

**Problem:**
- Fetch operations directly embedded in scraper functions
- Retry logic duplicated
- Headers duplicated across functions

**Impact:**
- Cannot easily modify request behavior globally
- Testing requires mocking fetch in multiple places
- Difficult to add features like rate limiting

**Solution:**
- Create a dedicated fetcher utility
- Implement configurable retry logic
- Allow customization of headers and timeouts

**Estimated Effort:** 2-3 hours

---

### 6. Limited Database Schema Documentation (Low Priority)

**Problem:**
- No formal schema documentation
- Column purposes not clearly defined
- Future schema needs not considered

**Impact:**
- New developers have steeper learning curve
- Database changes more likely to have unintended consequences
- Harder to plan for future features

**Solution:**
- Document current schema
- Add comments to explain column purposes
- Create schema migration plans for upcoming features

**Estimated Effort:** 1-2 hours

---

### 7. Frontend Error State Management (Low Priority)

**Problem:**
- Limited error state handling in UI components
- Generic error messages in some cases
- No detailed feedback for specific failure modes

**Impact:**
- Users may not understand what went wrong
- Troubleshooting more difficult
- Reduced user experience

**Solution:**
- Enhance error state rendering
- Add more specific error messages
- Provide troubleshooting guidance in UI

**Estimated Effort:** 2-3 hours

---

### 8. TypeScript and Linting Issues (High Priority)

**Problem:**
Current IDE errors and warnings:
- `ResumeManager.tsx`: Type incompatibilities between Supabase return types and React component interfaces
  - Type errors in Resume and ResumeVersion interfaces (missing `resume_id` property)
  - Type `{ variant: string, size: string }` props not assignable to Button component (8 occurrences)
- `ResumesPage.tsx`: Button component type errors (6 occurrences)
- `App.tsx`: Unused 'React' import
- `CI.yml`: Invalid context access for `SUPABASE_PROJECT_REF` and `SUPABASE_ACCESS_TOKEN`
- Unused variables in ResumeManager components: `resumeId`, `fileType`

**Impact:**
- TypeScript compilation errors prevent reliable builds
- Potential runtime errors due to type mismatches
- Reduced code reliability and maintainability
- Confusing developer experience with irrelevant warnings

**Solution:**
1. Button Component:
   - Update Button component interface to include `variant` and `size` props
   - Define proper prop types for these attributes

2. Resume Interface Fixes:
   - Correct Resume and ResumeVersion interfaces
   - Ensure proper typing for Supabase query results

3. Cleanup:
   - Remove unused imports and variables
   - Fix GitHub Actions workflow variables

**Estimated Effort:** 4-6 hours

---

### 9. Additional TypeScript Implementation Issues (Medium Priority)

**Problem:**
After fixing the initial TypeScript errors, additional issues were identified:
- Missing type declarations for external libraries (react-dropzone)
- Type incompatibilities between Supabase responses and component interfaces
- Incorrect type definitions for upload progress tracking
- Unused imports and variables across components

**Impact:**
- TypeScript compiler warnings and errors
- Potential runtime errors due to type mismatches
- Reduced confidence in code quality
- Decreased developer productivity due to TypeScript noise

**Solution:**
1. Install missing type declarations: `@types/react-dropzone`
2. Update component interfaces to match Supabase return types
3. Add proper type definitions for progress tracking
4. Clean up unused variables and imports

**Estimated Effort:** 2-3 hours

---

## Implementation Plan

### Week 1 (April 12-19, 2025)

**Day 1-2:**
- Address items #1 and #3 (Refactor scraper code structure)
- Create base scraper class and utility functions
- Split monolithic file into modules

**Day 3-4:**
- Address items #2 and #4 (Improve error handling and types)
- Implement consistent error handling
- Add comprehensive type safety

**Day 5:**
- Address item #5 (Abstract fetch operations)
- Create dedicated fetcher utility

**Day 6-7:**
- Address items #6 and #7 (Documentation and UI improvements)
- Document database schema
- Enhance frontend error states

### Week 2 (April 20-26, 2025)

**Day 1-2:**
- Address item #8 (TypeScript and Linting Issues)
- Fix TypeScript errors and warnings
- Address linting issues and enforce consistent coding style

## Progress Tracking

| Item | Status | Completion Date | Notes |
|------|--------|----------------|-------|
| 1. Scraper Code Duplication | Completed | April 12, 2025 | Implemented BaseScraper class and utility functions |
| 2. Scraper Error Handling | Completed | April 12, 2025 | Added standardized error responses and improved messaging |
| 3. Large Monolithic Scraper File | Completed | April 12, 2025 | Split into multiple modules with proper structure |
| 4. Lack of Type Safety | Completed | April 12, 2025 | Added comprehensive type definitions in types/index.ts |
| 5. No Abstraction for Fetch | Completed | April 12, 2025 | Created fetchWithRetry utility in utils/fetch.ts |
| 6. Limited Schema Documentation | Completed | April 12, 2025 | Created comprehensive database-schema.md with current and planned schema |
| 7. Frontend Error State Management | Completed | April 12, 2025 | Enhanced JobForm component with detailed error types, validation, and user-friendly feedback |
| 8. TypeScript and Linting Issues | Completed | April 12, 2025 | Fixed Button component imports, updated Resume interfaces, addressed unused variables, fixed GitHub Actions workflow |
| 9. Additional TypeScript Implementation Issues | Partially Completed | April 12, 2025 | Fixed key type issues in ResumeManager and ResumeUpload components; added module augmentation for ButtonProps; still need to install proper type definitions for external libraries |
