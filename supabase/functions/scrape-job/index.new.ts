import { ScraperFactory } from "./scrapers/index.ts";
import { LinkedInScraper } from "./scrapers/LinkedInScraper.ts";
import { GreenhouseScraper } from "./scrapers/GreenhouseScraper.ts";
import { WorkdayScraper } from "./scrapers/WorkdayScraper.ts";
import { BuseyScraper } from "./scrapers/BuseyScraper.ts";
import { GenericScraper } from "./scrapers/GenericScraper.ts";
import { ScrapedData } from "./types/index.ts";
import { isValidUrl } from "./utils/fetch.ts";
import { cleanJobData } from "./utils/html.ts";

// Set up CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Initialize the scraper factory with all available scrapers
const scraperFactory = new ScraperFactory()
  .register(new LinkedInScraper())
  .register(new GreenhouseScraper())
  .register(new WorkdayScraper())
  .register(new BuseyScraper());

/**
 * Main function to handle scraping a job posting URL
 * 
 * @param url URL to scrape
 * @returns Scraped job data
 */
async function scrapeJobPosting(url: string): Promise<ScrapedData> {
  // Validate URL format
  if (!isValidUrl(url)) {
    throw new Error('Invalid URL format. Please provide a valid job posting URL.');
  }

  // Check for Indeed URLs first and return a helpful message
  if (url.includes('indeed.com')) {
    throw new Error(JSON.stringify({
      error: 'Indeed URLs are not supported',
      message: 'Due to Indeed\'s security measures, we cannot automatically fetch job details from Indeed. Please try one of these alternatives:\n\n1. Use the LinkedIn job posting URL\n2. Use the company\'s direct careers page URL\n3. Enter the job details manually',
      type: 'UNSUPPORTED_PLATFORM'
    }));
  }

  // Get the appropriate scraper for this URL
  const scraper = scraperFactory.getScraper(url);
  console.log(`Using ${scraper.name} scraper for URL: ${url}`);
  
  // Try the specific scraper
  try {
    const jobData = await scraper.scrape(url);
    return cleanJobData(jobData);
  } catch (error) {
    // If the specific scraper fails and it's not the generic scraper,
    // try the generic scraper as a fallback
    if (!(scraper instanceof GenericScraper)) {
      console.log(`${scraper.name} scraper failed, trying generic scraper`);
      
      try {
        const genericScraper = new GenericScraper();
        const jobData = await genericScraper.scrape(url);
        return cleanJobData(jobData);
      } catch (genericError) {
        throw new Error(`${error instanceof Error ? error.message : error}\n\nGeneric scraper also failed: ${genericError instanceof Error ? genericError.message : genericError}`);
      }
    }
    
    // If the generic scraper failed directly, just throw the error
    throw error;
  }
}

// Set up the Deno server
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body
    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Scrape the job posting
    const jobData = await scrapeJobPosting(url);

    // Return the scraped data
    return new Response(
      JSON.stringify(jobData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Scraping failed:', error);
    
    // Check if the error is already in JSON format
    let errorObj: any;
    try {
      errorObj = JSON.parse(error instanceof Error ? error.message : String(error));
    } catch {
      // Not JSON, create a standard error object
      errorObj = { 
        error: 'Failed to scrape job details',
        details: error instanceof Error ? error.message : String(error),
        suggestion: 'Please ensure the URL is accessible and points to a public job posting page. If the issue persists, try entering the job details manually.'
      };
    }
    
    return new Response(
      JSON.stringify(errorObj),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
