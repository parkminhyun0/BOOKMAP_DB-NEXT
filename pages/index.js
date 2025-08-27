import { useEffect } from "react";

export default function Home() {
  useEffect(() => {
    window.location.replace("/index.html"); // public/index.html로 이동
  }, []);
  return null;
}
