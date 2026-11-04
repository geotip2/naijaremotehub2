"use client";
import { useFormStatus } from "react-dom";

export default function SubmitButton({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return <button disabled={pending} className={`btn-primary disabled:cursor-not-allowed disabled:opacity-60 ${className}`}>
    {pending ? "Please wait…" : children}
  </button>;
}
