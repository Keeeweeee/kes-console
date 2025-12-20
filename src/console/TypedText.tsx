import { useEffect, useState } from "react";

type TypedTextProps = {
  text: string;
  speed?: number; // ms per character
};

export function TypedText({ text, speed = 28 }: TypedTextProps) {
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    setDisplayed(""); // reset when text changes
    let i = 0;

    const interval = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(interval);
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed]);

  return (
    <span className="typed-text">
      {displayed}
      <span className="cursor">▮</span>
    </span>
  );
}
