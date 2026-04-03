interface Props {
  password: string;
}

export function PasswordStrengthIndicator({ password }: Props) {
  const getStrength = () => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  };

  if (!password) return null;

  const score = getStrength();
  const levels = [
    { label: "Weak", color: "bg-destructive", bars: 1 },
    { label: "Weak", color: "bg-destructive", bars: 1 },
    { label: "Fair", color: "bg-warning", bars: 2 },
    { label: "Good", color: "bg-warning", bars: 3 },
    { label: "Strong", color: "bg-success", bars: 4 },
    { label: "Strong", color: "bg-success", bars: 4 },
  ];

  const { label, color, bars } = levels[score];

  return (
    <div className="mt-2 space-y-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              i <= bars ? color : "bg-muted"
            }`}
          />
        ))}
      </div>
      <p className={`text-xs ${score <= 1 ? "text-destructive" : score <= 2 ? "text-warning" : "text-success"}`}>
        {label}
      </p>
    </div>
  );
}
