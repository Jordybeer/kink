"use client";
import { useState, useCallback } from "react";

export function useSheet(initial = false) {
  const [open, setOpen] = useState(initial);
  const onOpen = useCallback(() => setOpen(true), []);
  const onClose = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((v) => !v), []);
  return { open, onOpen, onClose, toggle };
}
