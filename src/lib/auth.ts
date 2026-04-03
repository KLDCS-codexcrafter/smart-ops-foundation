// [JWT] Mock auth — replace with real API calls

export interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "manager" | "operator" | "partner" | "customer";
  company: string;
  avatar?: string;
}

const MOCK_USER: User = {
  id: "usr_01HXYZ",
  name: "Arjun Mehta",
  email: "arjun@smartops.in",
  role: "admin",
  company: "SmartOps Industries Pvt Ltd",
};

// [JWT] Replace with real login API
export async function mockLogin(email: string, _password: string): Promise<{ user: User; token: string }> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (email) {
        resolve({ user: MOCK_USER, token: "mock-jwt-token-xyz" });
      } else {
        reject(new Error("Invalid credentials"));
      }
    }, 1200);
  });
}

// [JWT] Replace with real token validation
export async function mockGetCurrentUser(): Promise<User | null> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const token = localStorage.getItem("4ds_token");
      resolve(token ? MOCK_USER : null);
    }, 500);
  });
}

// [JWT] Replace with real logout
export async function mockLogout(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => {
      localStorage.removeItem("4ds_token");
      resolve();
    }, 300);
  });
}

export function formatCurrency(paise: number): string {
  const rupees = paise / 100;
  return `₹${rupees.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

export function formatTimestamp(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
    hour12: true,
  });
}
