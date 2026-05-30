import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

/**
 * Handles deeplinks from ZNS notifications and OA messages.
 * Format: zalo://app/<MINI_APP_ID>?path=/parent-portal/lessons/123
 */
export function DeeplinkHandler() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const path = searchParams.get("path");
    if (path) {
      navigate(path, { replace: true });
    }
  }, [searchParams, navigate]);

  return null;
}
