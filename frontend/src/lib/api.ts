/**
 * Axios instance pre-configured for the Platform API.
 * Automatically attaches the Keycloak Bearer token to every request.
 */

import axios from "axios";
import { getAccessToken } from "./auth";

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30_000,
});

// Request interceptor — inject auth token
apiClient.interceptors.request.use(async (config) => {
  if (typeof window !== "undefined") {
    const token = await getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response interceptor — surface error messages
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.detail ?? error.message ?? "An unexpected error occurred";
    return Promise.reject(new Error(message));
  }
);
