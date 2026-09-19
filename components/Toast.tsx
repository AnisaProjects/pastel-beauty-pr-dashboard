"use client";

export default function Toast({ message }: { message: string | null }) {
  return (
    <div className={"toast" + (message ? " show" : "")} id="toast">
      {message || ""}
    </div>
  );
}
