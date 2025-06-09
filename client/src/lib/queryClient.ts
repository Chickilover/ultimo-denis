import { QueryClient, QueryFunction, type QueryKey } from "@tanstack/react-query"; // Added QueryKey type

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorText = res.statusText;
    try {
      // Attempt to parse error response as JSON for more detailed messages
      const errorData = await res.json();
      if (errorData && errorData.message) {
        errorText = errorData.message;
      } else if (errorData && errorData.error) {
        // Handle cases where error might be a string or an object with an error field
        if (typeof errorData.error === 'string') {
          errorText = errorData.error;
        } else if (errorData.error.message && typeof errorData.error.message === 'string') {
          errorText = errorData.error.message;
        }
      }
    } catch (e) {
      // If JSON parsing fails, fallback to text or statusText
      try {
        errorText = (await res.text()) || res.statusText;
      } catch (textError) {
        // If reading text also fails, just use statusText
        // This can happen if the response is already consumed or is a network error object
      }
    }
    throw new Error(`${res.status}: ${errorText}`);
  }
}

export async function apiRequest<T = void>( // Made generic with default T = void
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<T> { // Return type is now Promise<T>
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);

  // Handle different response types based on T and actual response
  if (res.status === 204 || res.headers.get("Content-Length") === "0") {
    // If T is void (or can be undefined), and response is empty, return undefined.
    // This cast is necessary because T could be something other than void.
    // It's up to the caller to ensure T matches the expected API response.
    return undefined as T;
  }

  try {
    // Attempt to parse JSON, assuming T is the type of the JSON body.
    return (await res.json()) as T;
  } catch (e) {
    // If res.json() fails (e.g., if content was not valid JSON but not truly empty)
    // this indicates a mismatch between expected and actual response.
    console.error("Failed to parse JSON response from API:", url, e);
    // Rethrow a more specific error or handle based on T if T could be non-JSON.
    // For now, we assume if not 204/empty, JSON is expected.
    throw new Error(`Failed to parse JSON response from API: ${url}`);
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";

// getQueryFn needs to be compatible with QueryFunction<T, QueryKey>
// QueryFunction<T = unknown, TQueryKey extends QueryKey = QueryKey, TPageParam = never> = (context: QueryFunctionContext<TQueryKey, TPageParam>) => T | Promise<T>;
// So, getQueryFn should return a function that matches this.
export const getQueryFn: <TData = unknown, TQueryKey extends QueryKey = QueryKey>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<TData | null, TQueryKey> = // Return TData | null
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => { // queryKey is part of QueryFunctionContext
    // Construct the URL from queryKey. Assuming queryKey[0] is the base URL
    // and queryKey[1] (if it exists and is an object) contains query parameters.
    let url = queryKey[0] as string;
    if (queryKey.length > 1 && typeof queryKey[1] === 'object' && queryKey[1] !== null) {
      const params = new URLSearchParams(queryKey[1] as Record<string, string>).toString();
      if (params) {
        url += `?${params}`;
      }
    }

    const res = await fetch(url, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null; // Return null as TData | null
    }

    await throwIfResNotOk(res);

    if (res.status === 204 || res.headers.get("Content-Length") === "0") {
      // If TData can be null or undefined, this is fine.
      // If TData is expected to be something, this might lead to issues if not handled by caller.
      // Given on401 can return null, allowing null here for empty successful responses seems consistent.
      return null; // Or undefined as TData, but null is more explicit for "no data"
    }

    try {
      return await res.json() as TData;
    } catch (e) {
      console.error("Failed to parse JSON in getQueryFn:", url, e);
      throw new Error(`Failed to parse JSON response in getQueryFn from API: ${url}`);
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // The default queryFn must be compatible.
      // We cast getQueryFn to any here to satisfy the defaultOptions structure,
      // as the generic T isn't known at this point of default assignment.
      // Individual useQuery calls should specify their expected T.
      queryFn: getQueryFn({ on401: "throw" }) as any,
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity, // Consider changing this for more dynamic data
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
