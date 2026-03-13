import { useState } from "react";
import { T } from "../tokens";

export default function Card({ children, style = {}, hover = true, onClick, className, ...rest }) {
  const [hov, setHov] = useState(false);
  return (
    <div onClick={onClick} className={className} {...rest}
      onMouseEnter={() => hover && setHov(true)}
      onMouseLeave={() => hover && setHov(false)}
      style={{
        background: T.white, borderRadius: T.rLg,
        boxShadow: hov
          ? "0 8px 32px rgba(0,0,0,.10), 0 0 0 1px rgba(0,0,0,.05)"
          : "0 2px 12px rgba(0,0,0,.06), 0 0 0 1px rgba(0,0,0,.04)",
        transform: hov ? "translateY(-2px)" : "translateY(0)",
        transition: "box-shadow .22s ease, transform .22s ease",
        cursor: onClick ? "pointer" : "default",
        ...style,
      }}>{children}</div>
  );
}
