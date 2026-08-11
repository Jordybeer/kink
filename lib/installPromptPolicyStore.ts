import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  DEFAULT_INSTALL_PROMPT_POLICY,
  disableAutomaticInstallPrompt,
  snoozeInstallPrompt,
  type InstallPromptPolicy,
} from "@/lib/installPrompt";

interface InstallPromptPolicyState extends InstallPromptPolicy {
  snoozeAutomaticPrompt: (now?: number) => void;
  disableAutomaticPrompt: () => void;
}

function policyFromState(state: InstallPromptPolicyState): InstallPromptPolicy {
  return {
    dismissals: state.dismissals,
    snoozedUntil: state.snoozedUntil,
    neverAsk: state.neverAsk,
  };
}

export const useInstallPromptPolicyStore = create<InstallPromptPolicyState>()(
  persist(
    (set) => ({
      ...DEFAULT_INSTALL_PROMPT_POLICY,
      snoozeAutomaticPrompt(now) {
        set((state) => snoozeInstallPrompt(policyFromState(state), now));
      },
      disableAutomaticPrompt() {
        set((state) => disableAutomaticInstallPrompt(policyFromState(state)));
      },
    }),
    {
      name: "kinksync-install-prompt-policy",
    },
  ),
);
