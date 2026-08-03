import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

interface DialogState extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<DialogState | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setDialog({ ...options, resolve });
    });
  }, []);

  const handleClose = (result: boolean) => {
    dialog?.resolve(result);
    setDialog(null);
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}

      {dialog && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 animate-fade-in"
            onClick={() => handleClose(false)}
          />
          <div className="relative bg-white dark:bg-surface-800 rounded-2xl shadow-float border border-gray-200 dark:border-surface-700 w-full max-w-sm p-6 animate-scale-in">
            <div
              className={`inline-flex items-center justify-center w-12 h-12 rounded-full mb-4 ${
                dialog.danger
                  ? "bg-red-100 dark:bg-red-900/30"
                  : "bg-brand-100 dark:bg-brand-900/30"
              }`}
            >
              {dialog.danger ? (
                <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-brand-600 dark:text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                </svg>
              )}
            </div>

            {dialog.title && (
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                {dialog.title}
              </h3>
            )}
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-6">
              {dialog.message}
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => handleClose(false)}
                className="flex-1 btn-ghost border border-gray-200 dark:border-surface-700"
              >
                {dialog.cancelLabel || "Annuler"}
              </button>
              <button
                onClick={() => handleClose(true)}
                autoFocus
                className={`flex-1 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 active:scale-[0.98] text-white ${
                  dialog.danger
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-brand-600 hover:bg-brand-700"
                }`}
              >
                {dialog.confirmLabel || "Confirmer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error("useConfirm must be used within a ConfirmProvider");
  }
  return context;
}
