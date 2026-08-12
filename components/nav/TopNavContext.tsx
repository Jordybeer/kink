"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type TopNavActionPlacement = "primary" | "secondary" | "overflow";

export interface TopNavAction {
  id: string;
  label: string;
  icon: ReactNode;
  onClick: () => void;
  placement?: TopNavActionPlacement;
  danger?: boolean;
  disabled?: boolean;
}

interface TopNavContextValue {
  actions: TopNavAction[];
  setActions: (actions: TopNavAction[]) => void;
  clearActions: () => void;
}

const TopNavContext = createContext<TopNavContextValue | null>(null);

export function TopNavProvider({ children }: { children: ReactNode }) {
  const [actions, setActionsState] = useState<TopNavAction[]>([]);
  const setActions = useCallback((next: TopNavAction[]) => setActionsState(next), []);
  const clearActions = useCallback(() => setActionsState([]), []);
  const value = useMemo(() => ({ actions, setActions, clearActions }), [actions, setActions, clearActions]);

  return <TopNavContext.Provider value={value}>{children}</TopNavContext.Provider>;
}

export function useTopNav() {
  const context = useContext(TopNavContext);
  if (!context) throw new Error("useTopNav must be used within TopNavProvider");
  return context;
}

/**
 * Register screen-specific TopNav actions. Keep the actions array memoized so
 * callbacks do not cause needless command-bar updates.
 */
export function useTopNavActions(actions: TopNavAction[]) {
  const { setActions, clearActions } = useTopNav();

  useLayoutEffect(() => {
    setActions(actions);
    return clearActions;
  }, [actions, clearActions, setActions]);
}
