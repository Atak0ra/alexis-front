import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ContextAdvancedOptions from "@/components/context-advanced-options";

describe("ContextAdvancedOptions", () => {
  it("is collapsed by default and reports an empty compiled brief", () => {
    const onChange = vi.fn();
    render(<ContextAdvancedOptions onChange={onChange} />);

    expect(screen.queryByLabelText("Architecture")).not.toBeInTheDocument();
    expect(onChange).toHaveBeenCalledWith("");
  });

  it("reveals Architecture and Database when checked", () => {
    const onChange = vi.fn();
    render(<ContextAdvancedOptions onChange={onChange} />);

    fireEvent.click(screen.getByRole("checkbox", { name: "Option avancée" }));

    expect(screen.getByLabelText("Architecture")).toBeInTheDocument();
    expect(screen.getByLabelText("Base de données")).toBeInTheDocument();
    expect(screen.queryByLabelText("Stack")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Stack Frontend")).not.toBeInTheDocument();
  });

  it("shows a single Stack select for Monolithe", () => {
    const onChange = vi.fn();
    render(<ContextAdvancedOptions onChange={onChange} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Option avancée" }));

    fireEvent.change(screen.getByLabelText("Architecture"), { target: { value: "monolith" } });

    expect(screen.getByLabelText("Stack")).toBeInTheDocument();
    expect(screen.queryByLabelText("Stack Frontend")).not.toBeInTheDocument();
  });

  it("shows Stack Frontend and Stack Backend for Front + Back", () => {
    const onChange = vi.fn();
    render(<ContextAdvancedOptions onChange={onChange} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Option avancée" }));

    fireEvent.change(screen.getByLabelText("Architecture"), { target: { value: "front_back" } });

    expect(screen.getByLabelText("Stack Frontend")).toBeInTheDocument();
    expect(screen.getByLabelText("Stack Backend")).toBeInTheDocument();
    expect(screen.queryByLabelText("Stack BFF")).not.toBeInTheDocument();
  });

  it("also shows Stack BFF for Front + Back + BFF", () => {
    const onChange = vi.fn();
    render(<ContextAdvancedOptions onChange={onChange} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Option avancée" }));

    fireEvent.change(screen.getByLabelText("Architecture"), { target: { value: "front_back_bff" } });

    expect(screen.getByLabelText("Stack Frontend")).toBeInTheDocument();
    expect(screen.getByLabelText("Stack Backend")).toBeInTheDocument();
    expect(screen.getByLabelText("Stack BFF")).toBeInTheDocument();
  });

  it("reveals a free-text input when 'Autre' is chosen, and its value ends up in the compiled brief", () => {
    const onChange = vi.fn();
    render(<ContextAdvancedOptions onChange={onChange} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Option avancée" }));
    fireEvent.change(screen.getByLabelText("Architecture"), { target: { value: "monolith" } });

    fireEvent.change(screen.getByLabelText("Stack"), { target: { value: "other" } });
    expect(screen.getByPlaceholderText("Précise ta stack")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Précise ta stack"), {
      target: { value: "Elixir + Phoenix" },
    });

    expect(onChange).toHaveBeenLastCalledWith("Stack: Elixir + Phoenix\nArchitecture: Monolithe");
  });

  it("compiles the full brief for a Front + Back + BFF selection with a database", () => {
    const onChange = vi.fn();
    render(<ContextAdvancedOptions onChange={onChange} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Option avancée" }));
    fireEvent.change(screen.getByLabelText("Architecture"), { target: { value: "front_back_bff" } });
    fireEvent.change(screen.getByLabelText("Stack Frontend"), { target: { value: "react" } });
    fireEvent.change(screen.getByLabelText("Stack Backend"), { target: { value: "python_django" } });
    fireEvent.change(screen.getByLabelText("Stack BFF"), { target: { value: "node_nestjs" } });
    fireEvent.change(screen.getByLabelText("Base de données"), { target: { value: "postgresql" } });

    expect(onChange).toHaveBeenLastCalledWith(
      "Stack: Python + Django (backend), React (frontend), Node.js + NestJS (BFF)\n" +
      "Architecture: Front + Back + BFF\n" +
      "Base de données: PostgreSQL"
    );
  });

  it("reports an empty compiled brief again after unchecking, even with fields previously filled", () => {
    const onChange = vi.fn();
    render(<ContextAdvancedOptions onChange={onChange} />);
    const checkbox = screen.getByRole("checkbox", { name: "Option avancée" });
    fireEvent.click(checkbox);
    fireEvent.change(screen.getByLabelText("Architecture"), { target: { value: "monolith" } });
    fireEvent.change(screen.getByLabelText("Stack"), { target: { value: "python_django" } });

    fireEvent.click(checkbox);

    expect(onChange).toHaveBeenLastCalledWith("");
  });
});
