class HttpError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = 'An unknown error occurred';
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.detail || errorJson.message || 'An unknown error occurred';
    } catch (e) {
      errorMessage = errorText || 'An unknown error occurred';
    }
    throw new HttpError(errorMessage, response.status);
  }
  // Handle cases where the response is successful but has no content
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.indexOf("application/json") !== -1) {
    return response.json();
  }
  return response.text();
};

const api = {
  async get<T>(path: string, params?: Record<string, any>): Promise<T> {
    const url = new URL(path, window.location.origin);
    if (params) {
      Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
    }
    const response = await fetch(url.toString());
    return handleResponse(response);
  },

  async post<T>(path: string, data?: any): Promise<T> {
    const isFormData = data instanceof FormData;

    const headers: HeadersInit = {};
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(path, {
      method: 'POST',
      headers: headers,
      body: isFormData ? data : JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async put<T>(path: string, data?: any): Promise<T> {
    const response = await fetch(path, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },
  
  async delete<T>(path: string, params?: Record<string, any>): Promise<T> {
    const url = new URL(path, window.location.origin);
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          url.searchParams.append(key, params[key]);
        }
      });
    }
    const response = await fetch(url.toString(), {
      method: 'DELETE',
    });
    return handleResponse(response);
  },

  async reparseWorkflow(content: string): Promise<any> {
    return this.post('/api/workflow/reparse', { content });
  },

  async createOrUpdateDsWorkflow(payload: Record<string, any>): Promise<any> {
    return this.post('/api/workflow/ds', payload);
  }
};

export default api;
