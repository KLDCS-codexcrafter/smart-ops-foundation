import { Check, X } from "lucide-react";

interface Props {
  password: string;
  confirmPassword: string;
}

export function PasswordMatchIndicator({ password, confirmPassword }: Props) {
  if (!confirmPassword) return null;

  const match = password === confirmPassword;

  return (
    <div className={`flex items-center gap-1.5 mt-1.5 text-xs ${match ? "text-success" : "text-destructive"}`}>
      {match ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
      <span>{match ? "Passwords match" : "Passwords do not match"}</span>
    </div>
  );
}
