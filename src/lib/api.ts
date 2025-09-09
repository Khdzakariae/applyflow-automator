const API_BASE_URL = 'http://localhost:3000';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const token = localStorage.getItem('authToken');

    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      defaultHeaders.Authorization = `Bearer ${token}`;
    }

    const config: RequestInit = {
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
      ...options,
    };

    const response = await fetch(url, config);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `Request failed: ${response.status}`);
    }

    return response.json();
  }

  // Job endpoints
  async getJobs(params?: {
    status?: string;
    page?: number;
    limit?: number;
    search?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }
    
    const endpoint = `/api/jobs${searchParams.toString() ? `?${searchParams}` : ''}`;
    return this.request(endpoint);
  }

  async getAvailableJobs(params?: {
    page?: number;
    limit?: number;
    search?: string;
    location?: string;
    jobType?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }
    
    const endpoint = `/api/jobs/available${searchParams.toString() ? `?${searchParams}` : ''}`;
    return this.request(endpoint);
  }

  async getJob(jobId: string) {
    return this.request(`/api/jobs/${jobId}`);
  }

  async applyToJob(jobId: string, notes?: string) {
    return this.request(`/api/jobs/${jobId}/apply`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
  }

  async updateApplication(applicationId: string, data: {
    status?: string;
    notes?: string;
    responseDate?: string;
  }) {
    return this.request(`/api/applications/${applicationId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteApplication(applicationId: string) {
    return this.request(`/api/applications/${applicationId}`, {
      method: 'DELETE',
    });
  }

  // Scraping
  async scrapeJobs(data: {
    searchTerm: string;
    location?: string;
    numPages?: number;
  }) {
    return this.request('/api/scrape', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Letter generation
  async generateLetters(cvFile: File) {
    const formData = new FormData();
    formData.append('cv', cvFile);

    const token = localStorage.getItem('authToken');
    return fetch(`${this.baseUrl}/api/generate-letters`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    }).then(response => {
      if (!response.ok) {
        return response.json().then(err => {
          throw new Error(err.error || 'Generation failed');
        });
      }
      return response.json();
    });
  }

  // Email sending
  async sendEmail(data: {
    jobId: string;
    customMessage?: string;
  }) {
    return this.request('/api/send-email', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Stats
  async getStats() {
    return this.request('/api/stats');
  }

  // CV upload
  async uploadCV(cvFile: File) {
    const formData = new FormData();
    formData.append('cv', cvFile);

    const token = localStorage.getItem('authToken');
    return fetch(`${this.baseUrl}/api/upload-cv`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    }).then(response => {
      if (!response.ok) {
        return response.json().then(err => {
          throw new Error(err.error || 'Upload failed');
        });
      }
      return response.json();
    });
  }

  // Download motivation letter
  async downloadLetter(applicationId: string) {
    const token = localStorage.getItem('authToken');
    const response = await fetch(`${this.baseUrl}/api/applications/${applicationId}/letter`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Download failed' }));
      throw new Error(errorData.error);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `motivation-letter-${applicationId}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
  }
}

export const api = new ApiClient();