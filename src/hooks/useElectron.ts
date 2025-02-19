import { useEffect, useState, useCallback } from "react";
import { ApiResponse } from "../shared/types/api";
import { ElectronAPI } from "@/shared/types/electronAPI";

type ElectronApiFunction<T> = (api: ElectronAPI) => Promise<ApiResponse<T>>;

/**
 * A hook to interact with Electron APIs with proper loading states
 * @param apiFn A function that uses the Electron API
 * @returns The API response with loading and error states
 */
export function useElectron<T>(apiFn: ElectronApiFunction<T>) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      // Access electron from window with type assertion if needed
      const response = await apiFn(window.electron);

      if (!response.success) {
        throw new Error(response.error || "Unknown error");
      }

      setData(response.data || null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [apiFn]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
  };
}
