const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const errorText = await response.text();
    try {
      const errorJson = JSON.parse(errorText);
      throw new Error(errorJson.message || 'An unknown error occurred');
    } catch (e) {
      throw new Error(errorText || 'An unknown error occurred');
    }
  }
  return response.json();
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
    const response = await fetch(path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
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
  
  async delete<T>(path: string): Promise<T> {
    const response = await fetch(path, {
      method: 'DELETE',
    });
    return handleResponse(response);
  }
};

export default api;
