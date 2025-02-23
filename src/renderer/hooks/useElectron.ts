import { useEffect, useState, useCallback, useRef } from "react";
import { ElectronAPI, ApiResponse } from "@/shared/types/electronAPI";

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

  // Store the API function in a ref to maintain reference stability
  const apiFnRef = useRef(apiFn);
  apiFnRef.current = apiFn;

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await apiFnRef.current(window.electron);

      if (!response.success) {
        throw new Error(response.error || "Unknown error");
      }

      setData(response.data || null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, []); // No dependencies needed since we use ref

  // Initial fetch
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
