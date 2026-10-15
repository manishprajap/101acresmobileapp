// src/api.ts

import { handleSessionExpired } from "./utils/session";
import { Capacitor, CapacitorHttp } from '@capacitor/core';


const BASE_URL = 'https://101acres.com/api';

// ✅ NEW: shared helper — if the server says the token is invalid/expired,
// clear the session and fire the global redirect-to-login event.
// Every apiXxx function below calls this before throwing.
const handleUnauthorized = (): void => {
  handleSessionExpired();
};

const parseNativeResponse = (response: { status: number; data: unknown }) => {
  let body: any = response.data;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = { message: body };
    }
  }

  if (response.status < 200 || response.status >= 300) {
    if (response.status === 401) handleUnauthorized();
    throw body && typeof body === 'object'
      ? body
      : { message: `Request failed (${response.status})` };
  }

  return body;
};

const nativeRequest = async (
  url: string,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  data?: unknown,
) => {
  const token = localStorage.getItem('token');
  const response = await CapacitorHttp.request({
    url,
    method,
    headers: {
      Accept: 'application/json',
      ...(data !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(data !== undefined ? { data: JSON.stringify(data) } : {}),
    connectTimeout: 20000,
    readTimeout: 30000,
  });

  return parseNativeResponse(response);
};

export const apiPost = async (endpoint: string, data: unknown) => {
  if (Capacitor.isNativePlatform()) {
    return nativeRequest(`${BASE_URL}${endpoint}`, 'POST', data);
  }

  const token = localStorage.getItem('token');

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(data),
  });

  const json = await response.json();

  if (!response.ok) {
    // ✅ FIXED: session expired / invalid token → redirect to login
    if (response.status === 401) {
      handleUnauthorized();
    }
    throw json;
  }

  return json;
};

export const apiPatch = async (endpoint: string, data: unknown) => {
  if (Capacitor.isNativePlatform()) {
    return nativeRequest(`${BASE_URL}${endpoint}`, 'PATCH', data);
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 30_000);
  const token = localStorage.getItem('token');
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(data),
    signal: controller.signal,
  }).catch((error: unknown) => {
    window.clearTimeout(timeout);
    if (controller.signal.aborted) {
      throw new Error('Property update timed out. Please try again.');
    }
    throw error;
  });
  const responseText = await response.text().finally(() => window.clearTimeout(timeout));
  let json: unknown;
  try {
    json = responseText ? JSON.parse(responseText) : null;
  } catch {
    json = { message: responseText };
  }

  if (!response.ok) {
    if (response.status === 401) handleUnauthorized();
    throw json;
  }

  return json;
};

export const apiDelete = async (endpoint: string) => {
  if (Capacitor.isNativePlatform()) {
    return nativeRequest(`${BASE_URL}${endpoint}`, 'DELETE');
  }

  const token = localStorage.getItem('token');
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'DELETE',
    headers: {
      'Accept': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
  });
  const responseText = await response.text();
  let json: unknown;
  try {
    json = responseText ? JSON.parse(responseText) : null;
  } catch {
    json = { message: responseText };
  }

  if (!response.ok) {
    if (response.status === 401) handleUnauthorized();
    throw json;
  }

  return json;
};

export const apiPostFormData = async (endpoint: string, formData: FormData) => {
  const token = localStorage.getItem('token');

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      // Content-Type yahan mat daalo
    },
    body: formData,
  });

  const json = await response.json();

  if (!response.ok) {
    // ✅ FIXED: session expired / invalid token → redirect to login
    if (response.status === 401) {
      handleUnauthorized();
    }
    throw json;
  }

  return json;
};

export const apiGet = async (endpoint: string) => {
  if (Capacitor.isNativePlatform()) {
    return nativeRequest(`${BASE_URL}${endpoint}`, 'GET');
  }

  const token = localStorage.getItem('token');

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
  });

  const json = await response.json();

  if (!response.ok) {
    // ✅ FIXED: session expired / invalid token → redirect to login
    if (response.status === 401) {
      handleUnauthorized();
    }
    throw json;
  }

  return json;
};