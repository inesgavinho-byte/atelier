import type { ReactNode } from "react";

/** A translucent card surface — the base building block of the redesign. */
export default function Panel({
  children,
  className,
  ...rest
}: {
  children: ReactNode;
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`shell-panel${className ? ` ${className}` : ""}`} {...rest}>
      {children}
    </div>
  );
}
