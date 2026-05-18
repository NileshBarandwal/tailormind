/**
 * Classifies raw API/network error strings into user-facing messages.
 * No automatic retry logic. Classification only.
 */

export interface ErrorInfo {
  message: string;       // Short, human-readable explanation
  hint: string;          // Actionable one-liner
  canRetry: boolean;     // Whether a retry button makes sense
  waitSeconds?: number;  // Parsed wait time if rate-limited
}

export function classifyError(raw: string): ErrorInfo {
  // Warning prefix from backend (non-fatal)
  if (raw.startsWith("⚠")) {
    return {
      message: raw.replace(/^⚠\s*/, ""),
      hint: "Generation will continue with available information.",
      canRetry: false,
    };
  }

  const s = raw.toLowerCase();

  // Rate limit — parse wait time if present
  if (
    s.includes("rate limit") ||
    s.includes("ratelimit") ||
    s.includes("429") ||
    s.includes("quota") ||
    s.includes("resource_exhausted") ||
    s.includes("too many requests")
  ) {
    const match =
      raw.match(/retrydelay["\s:]+(\d+)/i) ||
      raw.match(/retry in (\d+)/i) ||
      raw.match(/(\d+)\s*s[^a-z]/i);
    const secs = match ? parseInt(match[1], 10) : 30;
    return {
      message: "The AI service is temporarily busy.",
      hint: `Wait about ${secs} seconds then try again.`,
      canRetry: true,
      waitSeconds: secs,
    };
  }

  // Network / fetch failure
  if (
    s.includes("failed to fetch") ||
    s.includes("networkerror") ||
    s.includes("network error") ||
    s.includes("econnrefused") ||
    s.includes("enotfound") ||
    s.includes("load failed")
  ) {
    return {
      message: "Could not reach the server.",
      hint: "Check your connection and try again.",
      canRetry: true,
    };
  }

  // Timeout
  if (s.includes("timeout") || s.includes("timed out")) {
    return {
      message: "The request took too long.",
      hint: "Try again — this usually resolves on its own.",
      canRetry: true,
    };
  }

  // JD / input parsing
  if (
    s.includes("jd parsing") ||
    s.includes("jd parse") ||
    s.includes("parsing failed")
  ) {
    return {
      message: "Could not read the job description.",
      hint: "Make sure the job text is complete and try again.",
      canRetry: true,
    };
  }

  // Profile matching
  if (s.includes("matching failed") || s.includes("match failed")) {
    return {
      message: "Profile matching failed.",
      hint: "Try again. If this repeats, check your profile data.",
      canRetry: true,
    };
  }

  // Resume generation
  if (
    s.includes("resume generation failed") ||
    s.includes("generation failed")
  ) {
    return {
      message: "Resume generation did not complete.",
      hint: "Try again. The AI service may be temporarily overloaded.",
      canRetry: true,
    };
  }

  // HTTP 5xx
  if (
    s.includes("http 5") ||
    s.includes("500") ||
    s.includes("502") ||
    s.includes("503") ||
    s.includes("504")
  ) {
    return {
      message: "The server returned an error.",
      hint: "Try again in a moment.",
      canRetry: true,
    };
  }

  // HTTP 4xx (non-429)
  if (
    s.includes("http 4") ||
    s.includes("400") ||
    s.includes("401") ||
    s.includes("403")
  ) {
    return {
      message: "The request was rejected by the server.",
      hint: "Check your input and try again.",
      canRetry: false,
    };
  }

  // Fallback
  return {
    message: "Something went wrong during generation.",
    hint: "Try again. If the problem persists, check the browser console.",
    canRetry: true,
  };
}
