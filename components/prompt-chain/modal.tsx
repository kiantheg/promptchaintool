"use client";

import { useEffect, useState, type ReactNode } from "react";

type ModalSize = "sm" | "md" | "lg";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  size?: ModalSize;
  children: ReactNode;
  hideHeader?: boolean;
};

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  size = "md",
  children,
  hideHeader = false,
}: ModalProps) {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (open) {
      setVisible(true);
      setExiting(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open && visible) {
      handleClose();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") handleClose();
    };
    if (visible) {
      document.addEventListener("keydown", handleKey);
      return () => document.removeEventListener("keydown", handleKey);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const handleClose = () => {
    setExiting(true);
    setTimeout(() => {
      setVisible(false);
      setExiting(false);
      onClose();
    }, 180);
  };

  if (!visible) return null;

  const sizeClass =
    size === "sm" ? "modalBoxSm" : size === "lg" ? "modalBoxLg" : "";

  return (
    <div
      className={exiting ? "modalBackdrop modalBackdropExiting" : "modalBackdrop"}
      onClick={(event) => {
        if (event.target === event.currentTarget) handleClose();
      }}
    >
      <div className={sizeClass ? `modalBox ${sizeClass}` : "modalBox"}>
        {!hideHeader && (
          <div className="modalHeader">
            <div style={{ minWidth: 0 }}>
              {title && <h2>{title}</h2>}
              {subtitle && <p className="muted sectionNote">{subtitle}</p>}
            </div>
            <button
              type="button"
              className="modalCloseButton"
              onClick={handleClose}
              aria-label="Close"
            >
              ×
            </button>
          </div>
        )}
        <div className="modalBody">{children}</div>
      </div>
    </div>
  );
}

type ConfirmModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
};

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  loading = false,
}: ConfirmModalProps) {
  return (
    <Modal open={open} onClose={onClose} size="sm" hideHeader>
      <div className="confirmDialog">
        <div className="confirmDialogIcon">⚠️</div>
        <p className="confirmDialogTitle">{title}</p>
        <p className="confirmDialogText">{message}</p>
        <div style={{ display: "flex", gap: "0.65rem", justifyContent: "center", width: "100%" }}>
          <button type="button" className="ghostButton" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className="dangerButton"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Deleting..." : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
