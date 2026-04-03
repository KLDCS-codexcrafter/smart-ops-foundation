import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Index() {
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("4ds_token");
    navigate(token ? "/tower" : "/login", { replace: true });
  }, [navigate]);

  return null;
}
