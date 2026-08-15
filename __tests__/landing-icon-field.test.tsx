import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import LandingIconField, { SPOTS } from "@/components/landing-icon-field";

describe("LandingIconField", () => {
  it("defines exactly 6 decorative spots", () => {
    expect(SPOTS).toHaveLength(6);
  });

  it("renders a decorative, aria-hidden container identified by variant", () => {
    render(<LandingIconField variant="light" />);
    const field = screen.getByTestId("icon-field-light");
    expect(field).toHaveAttribute("aria-hidden", "true");
    expect(field).toHaveClass("pointer-events-none");
  });

  it("is hidden below the lg breakpoint", () => {
    render(<LandingIconField variant="light" />);
    expect(screen.getByTestId("icon-field-light")).toHaveClass("hidden", "lg:block");
  });

  it("applies the brand-tinted color class for variant=light", () => {
    render(<LandingIconField variant="light" />);
    const icon = screen.getByTestId("icon-field-light").querySelector("svg");
    expect(icon).toHaveClass("text-brand/15");
  });

  it("applies the white-tinted color class for variant=dark", () => {
    render(<LandingIconField variant="dark" />);
    const icon = screen.getByTestId("icon-field-dark").querySelector("svg");
    expect(icon).toHaveClass("text-white/10");
  });

  it("renders one icon per spot, each with the fade animation and its own timing", () => {
    render(<LandingIconField variant="light" />);
    const icons = screen.getByTestId("icon-field-light").querySelectorAll("svg");
    expect(icons).toHaveLength(SPOTS.length);
    icons.forEach((icon, i) => {
      expect(icon).toHaveClass("animate-watermark-fade");
      expect(icon.style.animationDelay).toBe(`${SPOTS[i].delay}s`);
      expect(icon.style.animationDuration).toBe(`${SPOTS[i].duration}s`);
    });
  });
});
