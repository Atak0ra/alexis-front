import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button, buttonVariants } from "@/components/ui/button";

describe("Button", () => {
  it("applies the primary (solid) style by default", () => {
    render(<Button>Click</Button>);
    const btn = screen.getByRole("button", { name: "Click" });
    expect(btn.className).toContain("bg-gray-900");
  });

  it("applies the secondary (outline) style when variant='secondary'", () => {
    render(<Button variant="secondary">Click</Button>);
    const btn = screen.getByRole("button", { name: "Click" });
    expect(btn.className).toContain("border-gray-300");
    expect(btn.className).not.toContain("bg-gray-900");
  });
});

describe("buttonVariants", () => {
  it("returns primary classes by default", () => {
    expect(buttonVariants()).toContain("bg-gray-900");
  });

  it("returns secondary classes when requested", () => {
    expect(buttonVariants("secondary")).toContain("border-gray-300");
  });
});
