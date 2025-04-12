import { load } from 'npm:cheerio@1.0.0-rc.12';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

async function scrapeLinkedIn(url: string) {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Referer': 'https://www.google.com/',
    'DNT': '1',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1'
  };

  let retries = 3;
  let response;
  let error;

  while (retries > 0) {
    try {
      response = await fetch(url, { headers });
      if (response.ok) break;
      throw new Error(`LinkedIn: Failed to fetch page (Status: ${response.status})`);
    } catch (e) {
      error = e;
      retries--;
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  if (!response?.ok) {
    throw error || new Error('LinkedIn: Failed to fetch the job posting after multiple attempts');
  }

  const html = await response.text();
  const $ = load(html);

  const title = $('.top-card-layout__title').text().trim() || 
                $('h1').first().text().trim() ||
                $('.job-details-jobs-unified-top-card__job-title').text().trim();
                
  const company = $('.top-card-layout__company-name').text().trim() ||
                 $('.job-details-jobs-unified-top-card__company-name').text().trim() ||
                 $('.company-name').text().trim();
                 
  const description = $('.description__text').text().trim() ||
                     $('.job-details-jobs-unified-top-card__description-text').text().trim() ||
                     $('.job-description').text().trim();

  if (!title || !company || !description) {
    throw new Error('LinkedIn: Could not find all required job details');
  }

  return { title, company, description };
}

async function scrapeGreenhouse(url: string) {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Referer': 'https://www.google.com/',
    'DNT': '1',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1'
  };

  let retries = 3;
  let response;
  let error;

  while (retries > 0) {
    try {
      response = await fetch(url, { headers });
      if (response.ok) break;
      throw new Error(`Greenhouse: Failed to fetch page (Status: ${response.status})`);
    } catch (e) {
      error = e;
      retries--;
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  if (!response?.ok) {
    throw error || new Error('Greenhouse: Failed to fetch the job posting after multiple attempts');
  }

  const html = await response.text();
  const $ = load(html);

  const title = $('.app-title').text().trim() ||
                $('h1.job-title').text().trim() ||
                $('h1:first').text().trim();

  const company = $('.company-name').text().trim() ||
                 $('.employer-info h2').text().trim() ||
                 $('meta[property="og:site_name"]').attr('content')?.trim();

  const description = $('#content').text().trim() ||
                     $('.job-description').text().trim() ||
                     $('#job_description').text().trim();

  if (!title || !company || !description) {
    throw new Error('Greenhouse: Could not find all required job details');
  }

  return { title, company, description };
}

async function scrapeWorkday(url: string) {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Referer': 'https://www.google.com/',
    'DNT': '1',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1'
  };

  let retries = 3;
  let response;
  let error;

  while (retries > 0) {
    try {
      response = await fetch(url, { headers });
      if (response.ok) break;
      throw new Error(`Workday: Failed to fetch page (Status: ${response.status})`);
    } catch (e) {
      error = e;
      retries--;
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  if (!response?.ok) {
    throw error || new Error('Workday: Failed to fetch the job posting after multiple attempts');
  }

  const html = await response.text();
  const $ = load(html);

  const title = $('[data-automation-id="jobPostingHeader"]').text().trim() ||
                $('h1:first').text().trim() ||
                $('[class*="job-title"]').first().text().trim();

  const company = $('[data-automation-id="jobPostingCompany"]').text().trim() ||
                 $('[class*="company-name"]').first().text().trim() ||
                 $('meta[property="og:site_name"]').attr('content')?.trim();

  const description = $('[data-automation-id="jobPostingDescription"]').text().trim() ||
                     $('.job-description').text().trim() ||
                     $('main').text().trim();

  if (!title || !company || !description) {
    throw new Error('Workday: Could not find all required job details');
  }

  return { title, company, description };
}

async function scrapeBusey(url: string) {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Referer': 'https://www.google.com/',
    'DNT': '1',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1'
  };

  let retries = 3;
  let response;
  let error;

  while (retries > 0) {
    try {
      response = await fetch(url, { headers });
      if (response.ok) break;
      throw new Error(`Busey: Failed to fetch page (Status: ${response.status})`);
    } catch (e) {
      error = e;
      retries--;
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  if (!response?.ok) {
    throw error || new Error('Busey: Failed to fetch the job posting after multiple attempts');
  }

  const html = await response.text();
  const $ = load(html);

  // Remove script tags and hidden elements to clean up the DOM
  $('script').remove();
  $('style').remove();
  $('[style*="display: none"]').remove();
  $('[style*="display:none"]').remove();
  $('[hidden]').remove();

  // Extract title from the URL if it's in the expected format
  let title = '';
  const urlParts = url.split('/');
  const lastPart = urlParts[urlParts.length - 1];
  if (lastPart.includes('_')) {
    title = lastPart.split('_')[0]
      .replace(/([A-Z])/g, ' $1') // Add spaces before capital letters
      .replace(/-/g, ' ') // Replace hyphens with spaces
      .trim();
  }

  // If URL parsing didn't work, try HTML selectors
  if (!title) {
    const titleSelectors = [
      'h1',
      '.job-title',
      '.position-title',
      '#job-title',
      '.job-header h1',
      '.job-details h1',
      'title'
    ];

    for (const selector of titleSelectors) {
      const element = $(selector);
      if (element.length) {
        title = element.text().trim();
        break;
      }
    }
  }

  // Set company name directly since we know it's Busey Bank
  const company = 'Busey Bank';

  // Extract description
  let description = '';
  const descriptionSelectors = [
    '#job-description',
    '.job-description',
    '.job-details-description',
    '.position-description',
    '.description-container',
    'main',
    'article',
    // Broader selectors as fallback
    'div[class*="description"]',
    'div[class*="details"]',
    'div[class*="content"]'
  ];

  for (const selector of descriptionSelectors) {
    const element = $(selector);
    if (element.length) {
      description = element.text()
        .trim()
        .replace(/\s+/g, ' ');
      
      if (description.length > 50) {
        break;
      }
    }
  }

  // If we still don't have a description, try getting all text content
  if (!description) {
    description = $('body').text()
      .trim()
      .replace(/\s+/g, ' ');
  }

  if (!title || !description) {
    throw new Error('Busey: Could not find all required job details');
  }

  return { title, company, description };
}

async function scrapeGeneric(url: string) {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Referer': 'https://www.google.com/',
    'DNT': '1',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache'
  };

  let retries = 3;
  let response;
  let error;

  while (retries > 0) {
    try {
      response = await fetch(url, { 
        headers,
        redirect: 'follow'
      });
      if (response.ok) break;
      throw new Error(`Failed to fetch page (Status: ${response.status})`);
    } catch (e) {
      error = e;
      retries--;
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  if (!response?.ok) {
    throw error || new Error('Failed to fetch the job posting after multiple attempts');
  }

  const html = await response.text();
  
  // Check if the response is actually HTML
  if (!html.toLowerCase().includes('<!doctype html') && !html.toLowerCase().includes('<html')) {
    throw new Error('The URL did not return a valid HTML page. The page might require JavaScript to load or authentication to access.');
  }
  
  const $ = load(html);

  // Remove script tags and hidden elements to clean up the DOM
  $('script').remove();
  $('style').remove();
  $('[style*="display: none"]').remove();
  $('[style*="display:none"]').remove();
  $('[hidden]').remove();

  // Enhanced selectors for title with JSON-LD support
  let title = '';
  try {
    // Try JSON-LD first
    const jsonLd = $('script[type="application/ld+json"]').toArray()
      .map(element => {
        try {
          return JSON.parse($(element).html() || '');
        } catch {
          return null;
        }
      })
      .find(data => data && (data['@type'] === 'JobPosting' || data.jobTitle || data.title));

    if (jsonLd) {
      title = jsonLd.jobTitle || jsonLd.title || '';
    }
  } catch (e) {
    console.error('JSON-LD parsing failed:', e);
  }

  // If JSON-LD didn't work, try HTML selectors
  if (!title) {
    const titleSelectors = [
      'h1[class*="title" i]',
      'h1[class*="job" i]',
      'h1[class*="position" i]',
      'div[class*="job-title" i]',
      '.posting-header h1',
      '[data-testid*="title" i]',
      '[data-testid*="job" i]',
      '[data-qa*="title" i]',
      '[data-qa*="job" i]',
      'meta[property="og:title"]',
      'meta[name="title"]',
      '.job-header h1',
      '.job-details h1',
      '#job-title',
      '.position-title',
      'h1',
      'h2',
      'title'
    ];

    for (const selector of titleSelectors) {
      const element = $(selector);
      const content = element.is('meta') ? element.attr('content') : element.text();
      if (content) {
        title = content.trim();
        break;
      }
    }
  }

  // Enhanced company name extraction
  let company = '';
  try {
    // Try JSON-LD first
    const jsonLd = $('script[type="application/ld+json"]').toArray()
      .map(element => {
        try {
          return JSON.parse($(element).html() || '');
        } catch {
          return null;
        }
      })
      .find(data => data && (data.hiringOrganization || data.organization || data.publisher));

    if (jsonLd) {
      const org = jsonLd.hiringOrganization || jsonLd.organization || jsonLd.publisher;
      company = typeof org === 'string' ? org : org?.name || '';
    }
  } catch (e) {
    console.error('JSON-LD parsing failed:', e);
  }

  // If JSON-LD didn't work, try HTML selectors
  if (!company) {
    // If the URL contains 'busey.com', set company to 'Busey Bank'
    if (url.includes('busey.com')) {
      company = 'Busey Bank';
    } else {
      const companySelectors = [
        '[class*="company-name" i]',
        '[class*="employer" i]',
        '[class*="organization" i]',
        '[data-testid*="company" i]',
        '[data-qa*="company" i]',
        'meta[property="og:site_name"]',
        '.company-info',
        '.employer-info',
        '.company-header',
        '#company-name',
        '.organization-name'
      ];

      for (const selector of companySelectors) {
        const element = $(selector);
        const content = element.is('meta') ? element.attr('content') : element.text();
        if (content) {
          company = content.trim();
          break;
        }
      }
    }
  }

  // Enhanced description extraction
  let description = '';
  try {
    // Try JSON-LD first
    const jsonLd = $('script[type="application/ld+json"]').toArray()
      .map(element => {
        try {
          return JSON.parse($(element).html() || '');
        } catch {
          return null;
        }
      })
      .find(data => data && data.description);

    if (jsonLd) {
      description = jsonLd.description;
    }
  } catch (e) {
    console.error('JSON-LD parsing failed:', e);
  }

  // If JSON-LD didn't work, try HTML selectors
  if (!description) {
    const descriptionSelectors = [
      '[class*="job-description" i]',
      '[class*="description" i]',
      '[data-testid*="description" i]',
      '[data-qa*="description" i]',
      'meta[name="description"]',
      'meta[property="og:description"]',
      '#job-description',
      '.job-details-description',
      '.position-description',
      '.description-container',
      'main',
      'article',
      'div[class*="details" i]',
      'div[class*="content" i]'
    ];

    for (const selector of descriptionSelectors) {
      const element = $(selector);
      let content = element.is('meta') ? element.attr('content') : element.text();
      
      // Clean up the content
      if (content) {
        content = content.trim()
          .replace(/\s+/g, ' ')
          .replace(/\n+/g, '\n');
        
        // Only use this content if it's long enough to be a real description
        if (content.length > 50) {
          description = content;
          break;
        }
      }
    }
  }

  // Build detailed error message with debugging info
  const missingFields = [];
  if (!title) missingFields.push('job title');
  if (!company) missingFields.push('company name');
  if (!description) missingFields.push('job description');

  if (missingFields.length > 0) {
    // Create a sanitized version of the HTML for debugging
    const debugHtml = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .substring(0, 1000) + '...';

    throw new Error(
      `Could not extract the following required fields: ${missingFields.join(', ')}.\n\n` +
      `Debug information:\n` +
      `1. URL: ${url}\n` +
      `2. Page contains valid HTML: ${html.toLowerCase().includes('<!doctype html') || html.toLowerCase().includes('<html')}\n` +
      `3. Content preview:\n${debugHtml}\n\n` +
      `This might be because:\n` +
      `1. The page requires JavaScript to load its content\n` +
      `2. The page requires authentication\n` +
      `3. The content structure is non-standard\n\n` +
      `Please try:\n` +
      `1. Using a direct link to the job posting\n` +
      `2. Ensuring the URL is publicly accessible\n` +
      `3. Manually entering the job details`
    );
  }

  return { 
    title: title.trim(),
    company: company.trim(),
    description: description.trim()
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      throw new Error('Invalid URL format. Please provide a valid job posting URL.');
    }

    // Check for Indeed URLs first and return a helpful message
    if (url.includes('indeed.com')) {
      return new Response(
        JSON.stringify({
          error: 'Indeed URLs are not supported',
          message: 'Due to Indeed\'s security measures, we cannot automatically fetch job details from Indeed. Please try one of these alternatives:\n\n1. Use the LinkedIn job posting URL\n2. Use the company\'s direct careers page URL\n3. Enter the job details manually',
          type: 'UNSUPPORTED_PLATFORM'
        }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let jobData;
    let scraperUsed = 'generic';
    
    try {
      // Determine which scraper to use based on the URL
      if (url.includes('linkedin.com')) {
        jobData = await scrapeLinkedIn(url);
        scraperUsed = 'linkedin';
      } else if (url.includes('greenhouse.io')) {
        jobData = await scrapeGreenhouse(url);
        scraperUsed = 'greenhouse';
      } else if (url.includes('workday.com')) {
        jobData = await scrapeWorkday(url);
        scraperUsed = 'workday';
      } else if (url.includes('busey.com')) {
        jobData = await scrapeBusey(url);
        scraperUsed = 'busey';
      } else {
        jobData = await scrapeGeneric(url);
      }
    } catch (error) {
      // If specific scraper fails, try generic as fallback
      if (scraperUsed !== 'generic') {
        try {
          console.log(`${scraperUsed} scraper failed, trying generic scraper`);
          jobData = await scrapeGeneric(url);
        } catch (genericError) {
          throw new Error(`${error.message}\n\nGeneric scraper also failed: ${genericError.message}`);
        }
      } else {
        throw error;
      }
    }

    // Clean up the data
    jobData.title = jobData.title.replace(/\s+/g, ' ').trim();
    jobData.company = jobData.company.replace(/\s+/g, ' ').trim();
    jobData.description = jobData.description.replace(/\s+/g, ' ').trim();

    return new Response(
      JSON.stringify(jobData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Scraping failed:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to scrape job details',
        details: error.message,
        suggestion: 'Please ensure the URL is accessible and points to a public job posting page. If the issue persists, try entering the job details manually.'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});