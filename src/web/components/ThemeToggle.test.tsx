import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vite-plus/test";

import { saveTheme, ThemeToggle } from "./ThemeToggle.tsx";

afterEach(() => {
  cleanup();
  localStorage.clear();
  document.documentElement.classList.remove("dark");
});

describe("ThemeToggle", () => {
  it("switches to dark and back, and remembers the choice", () => {
    saveTheme("light");
    render(<ThemeToggle />);

    fireEvent.click(screen.getByRole("button", { name: "Use the dark theme" }));
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorage.getItem("theme")).toBe("dark");

    fireEvent.click(screen.getByRole("button", { name: "Use the light theme" }));
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(localStorage.getItem("theme")).toBe("light");
  });
});
