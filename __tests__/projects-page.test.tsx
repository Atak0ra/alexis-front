import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ProjectsPage from "@/app/onboarding/projects/page";

describe("ProjectsPage", () => {
  it("lists the seeded demo projects", async () => {
    render(<ProjectsPage />);

    expect(await screen.findByText("kara")).toBeInTheDocument();
    expect(screen.getByText("shopfront")).toBeInTheDocument();
    expect(screen.getByText("git@github.com:acme/kara.git")).toBeInTheDocument();
  });
});
