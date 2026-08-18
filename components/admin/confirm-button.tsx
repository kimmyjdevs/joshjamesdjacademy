"use client";

export function ConfirmButton({
  children,
  confirmMessage,
  className,
  formAction,
}: {
  children: React.ReactNode;
  confirmMessage: string;
  className?: string;
  formAction?: (formData: FormData) => void;
}) {
  return (
    <button
      type="submit"
      formAction={formAction}
      className={className}
      onClick={(e) => {
        if (!confirm(confirmMessage)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
