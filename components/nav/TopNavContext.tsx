"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
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
  selected?: boolean;
}

type ActionOwner = symbol;

interface TopNavContextValue {
  actions: TopNavAction[];
  title?: string;
  setActions: (owner: ActionOwner, actions: TopNavAction[], title?: string) => void;
  clearActions: (owner: ActionOwner) => void;
}

const TopNavContext = createContext<TopNavContextValue | null>(null);

export function TopNavProvider({ children }: { children: ReactNode }) {
  const [registration, setRegistration] = useState<{
    owner: ActionOwner;
    actions: TopNavAction[];
    title?: string;
  } | null>(null);
  const setActions = useCallback((owner: ActionOwner, actions: TopNavAction[], title?: string) => {
    setRegistration({ owner, actions, title });
  }, []);
  const clearActions = useCallback((owner: ActionOwner) => {
    setRegistration((current) => current?.owner === owner ? null : current);
  }, []);
  const value = useMemo(
    () => ({
      actions: registration?.actions ?? [],
      title: registration?.actions.length ? registration.title : undefined,
      setActions,
      clearActions,
    }),
    [registration, setActions, clearActions],
  );

  return <TopNavContext.Provider value={value}>{children}</TopNavContext.Provider>;
}

export function useTopNav() {
  const context = useContext(TopNavContext);
  if (!context) throw new Error("useTopNav must be used within TopNavProvider");
  return context;
}

/**
 * Register screen-specific TopNav actions and, when useful, a contextual title.
 * Keep the actions array memoized so callbacks do not cause needless command-bar updates.
 */
export function useTopNavActions(actions: TopNavAction[], title?: string) {
  const { setActions, clearActions } = useTopNav();
  const ownerRef = useRef<ActionOwner>(Symbol("top-nav-actions"));

  useLayoutEffect(() => {
    const owner = ownerRef.current;
    setActions(owner, actions, title);
    return () => clearActions(owner);
  }, [actions, clearActions, setActions, title]);
}
