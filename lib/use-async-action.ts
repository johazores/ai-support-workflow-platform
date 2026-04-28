"use client";

import { useState, useCallback } from "react";

type ActionState = {
  isLoading: boolean;
  message: string;
  messageType: "success" | "error" | null;
};

export function useAsyncAction() {
  const [state, setState] = useState<ActionState>({
    isLoading: false,
    message: "",
    messageType: null,
  });

  const execute = useCallback(
    async (fn: () => Promise<string | void>, errorMessage?: string) => {
      setState({ isLoading: true, message: "", messageType: null });

      try {
        const successMessage = await fn();

        setState({
          isLoading: false,
          message: successMessage ?? "",
          messageType: successMessage ? "success" : null,
        });

        return true;
      } catch (error) {
        console.error(error);

        setState({
          isLoading: false,
          message:
            errorMessage ??
            (error instanceof Error ? error.message : "An error occurred"),
          messageType: "error",
        });

        return false;
      }
    },
    [],
  );

  const clearMessage = useCallback(() => {
    setState((prev) => ({ ...prev, message: "", messageType: null }));
  }, []);

  return { ...state, execute, clearMessage };
}
