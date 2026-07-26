import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AgentTemplateHint from "@/components/agent-template-hint";
import { AGENT_TEMPLATE } from "@/lib/agent-template";

beforeEach(() => {
  Object.assign(navigator, {
    clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
  });
});

describe("AgentTemplateHint", () => {
  it("is collapsed by default", () => {
    render(<AgentTemplateHint />);
    expect(screen.queryByText(AGENT_TEMPLATE, { exact: false })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /voir le template/i })).toBeInTheDocument();
  });

  it("expands to show the template on click", () => {
    render(<AgentTemplateHint />);
    fireEvent.click(screen.getByRole("button", { name: /voir le template/i }));
    expect(screen.getByText(/Convention de nommage Git/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /masquer/i })).toBeInTheDocument();
  });

  it("copies the template to the clipboard and shows confirmation", async () => {
    render(<AgentTemplateHint />);
    fireEvent.click(screen.getByRole("button", { name: /voir le template/i }));
    fireEvent.click(screen.getByRole("button", { name: "Copier" }));

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(AGENT_TEMPLATE);
    expect(await screen.findByRole("button", { name: /copié/i })).toBeInTheDocument();
  });
});
