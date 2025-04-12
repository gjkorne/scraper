/** @jsxImportSource react */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { JobForm } from '../../components/JobForm';
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the env variables
vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
  },
}));

describe('JobForm', () => {
  const mockOnSubmit = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock fetch
    global.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes('/scrape-job')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            title: 'Test Job Title',
            company: 'Test Company',
            description: 'This is a test job description'
          })
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });
  });
  
  it('renders correctly', () => {
    render(<JobForm onSubmit={mockOnSubmit} />);
    
    expect(screen.getByPlaceholderText('Paste job posting URL')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /import job/i })).toBeInTheDocument();
  });
  
  it('handles URL input', () => {
    render(<JobForm onSubmit={mockOnSubmit} />);
    
    const input = screen.getByPlaceholderText('Paste job posting URL');
    fireEvent.change(input, { target: { value: 'https://example.com/job/123' } });
    
    expect(input).toHaveValue('https://example.com/job/123');
  });
  
  it('submits the form and calls onSubmit with scraped data', async () => {
    render(<JobForm onSubmit={mockOnSubmit} />);
    
    const input = screen.getByPlaceholderText('Paste job posting URL');
    const submitButton = screen.getByRole('button', { name: /import job/i });
    
    fireEvent.change(input, { target: { value: 'https://example.com/job/123' } });
    fireEvent.click(submitButton);
    
    // Button should show loading state
    expect(screen.getByText(/scanning/i)).toBeInTheDocument();
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        'https://example.com/job/123',
        {
          title: 'Test Job Title',
          company: 'Test Company',
          description: 'This is a test job description'
        }
      );
    });
  });
  
  it('displays an error message when the API call fails', async () => {
    // Override the fetch mock to simulate an error
    global.fetch = vi.fn().mockImplementation(() => {
      return Promise.resolve({
        ok: false,
        status: 500
      });
    });
    
    render(<JobForm onSubmit={mockOnSubmit} />);
    
    const input = screen.getByPlaceholderText('Paste job posting URL');
    const submitButton = screen.getByRole('button', { name: /import job/i });
    
    fireEvent.change(input, { target: { value: 'https://example.com/job/123' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/failed to fetch job details/i)).toBeInTheDocument();
    });
    
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });
});
