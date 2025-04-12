/**
 * Test utilities for scraper tests
 */

/**
 * Create a mock response object similar to fetch Response
 */
export function createMockResponse(
  body: string | object,
  status = 200,
  headers: Record<string, string> = {}
): Response {
  const responseBody = typeof body === 'string' ? body : JSON.stringify(body);
  const responseInit: ResponseInit = {
    status,
    headers: new Headers(headers)
  };
  
  return new Response(responseBody, responseInit);
}

/**
 * Mock HTML content for testing scrapers
 */
export const MOCK_JOB_HTML = `
<!DOCTYPE html>
<html>
<head>
  <title>Senior Software Engineer - Acme Inc</title>
  <meta name="description" content="Join our team as a Senior Software Engineer">
</head>
<body>
  <div class="job-header">
    <h1 class="job-title">Senior Software Engineer</h1>
    <div class="company-name">Acme Inc</div>
    <div class="job-location">San Francisco, CA</div>
    <div class="salary-range">$120,000 - $160,000</div>
  </div>
  
  <div class="job-description">
    <h2>About the Role</h2>
    <p>We're looking for a skilled Senior Software Engineer to join our team. You'll be working on our core product features and helping to architect solutions.</p>
    
    <h2>Requirements</h2>
    <ul>
      <li>5+ years of experience with JavaScript and TypeScript</li>
      <li>Experience with React and Node.js</li>
      <li>Strong understanding of web performance optimization</li>
      <li>Experience with SQL and NoSQL databases</li>
    </ul>
    
    <h2>Benefits</h2>
    <ul>
      <li>Competitive salary and equity</li>
      <li>Health, dental, and vision insurance</li>
      <li>Flexible work hours and location</li>
      <li>Generous PTO policy</li>
    </ul>
  </div>
</body>
</html>
`;

/**
 * Expected parsed job data from the mock HTML
 */
export const EXPECTED_JOB_DATA = {
  title: "Senior Software Engineer",
  company: "Acme Inc",
  description: "We're looking for a skilled Senior Software Engineer to join our team. You'll be working on our core product features and helping to architect solutions.",
  location: "San Francisco, CA",
  salary: "$120,000 - $160,000",
  url: "https://example.com/job/123",
  scraper: "TestScraper",
  skills: ["JavaScript", "TypeScript", "React", "Node.js", "SQL", "NoSQL"],
  requirements: [
    "5+ years of experience with JavaScript and TypeScript",
    "Experience with React and Node.js",
    "Strong understanding of web performance optimization",
    "Experience with SQL and NoSQL databases"
  ],
  benefits: [
    "Competitive salary and equity",
    "Health, dental, and vision insurance",
    "Flexible work hours and location",
    "Generous PTO policy"
  ]
};

/**
 * Mock Supabase client for testing
 */
export class MockSupabaseClient {
  // Store cache entries in memory for testing
  private cacheEntries: Record<string, any> = {};
  
  // Mock the from() method to start a query builder
  from(table: string) {
    if (table === 'scraper_cache') {
      return {
        // Mock the select() method
        select: () => ({
          eq: (_column: string, value: string) => ({
            single: () => Promise.resolve({ data: this.cacheEntries[value] || null, error: null })
          })
        }),
        // Mock the upsert() method
        upsert: (data: any) => {
          const url = data.url;
          this.cacheEntries[url] = data;
          return Promise.resolve({ data, error: null });
        },
        // Mock the delete() method
        delete: () => ({
          eq: (_column: string, value: string) => {
            delete this.cacheEntries[value];
            return Promise.resolve({ data: null, error: null });
          }
        })
      };
    }
    
    // Return null methods for other tables
    return {
      select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }),
      upsert: () => Promise.resolve({ data: null, error: null }),
      delete: () => ({ eq: () => Promise.resolve({ data: null, error: null }) })
    };
  }
  
  // Reset the mock state
  reset() {
    this.cacheEntries = {};
  }
}

/**
 * Wait for a specified time
 * @param ms milliseconds to wait
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
