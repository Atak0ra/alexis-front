import { describe, it, expect } from "vitest";
import { compileAdvancedBrief } from "@/lib/context-advanced-options";

const EMPTY = {
  stackMonolith: "", stackFrontend: "", stackBackend: "", stackBff: "",
  architectureLabel: "", databaseLabel: "",
};

describe("compileAdvancedBrief", () => {
  it("returns an empty string when nothing is filled", () => {
    expect(compileAdvancedBrief(EMPTY)).toBe("");
  });

  it("compiles a monolith stack + architecture + database", () => {
    const result = compileAdvancedBrief({
      ...EMPTY,
      stackMonolith: "Python + Django",
      architectureLabel: "Monolithe",
      databaseLabel: "PostgreSQL",
    });
    expect(result).toBe(
      "Stack: Python + Django\nArchitecture: Monolithe\nBase de données: PostgreSQL"
    );
  });

  it("compiles frontend + backend stacks with layer suffixes", () => {
    const result = compileAdvancedBrief({
      ...EMPTY,
      stackFrontend: "React",
      stackBackend: "Python + Django",
      architectureLabel: "Front + Back",
    });
    expect(result).toBe(
      "Stack: Python + Django (backend), React (frontend)\nArchitecture: Front + Back"
    );
  });

  it("compiles frontend + backend + BFF stacks", () => {
    const result = compileAdvancedBrief({
      ...EMPTY,
      stackFrontend: "React",
      stackBackend: "Python + Django",
      stackBff: "Node.js + NestJS",
      architectureLabel: "Front + Back + BFF",
    });
    expect(result).toBe(
      "Stack: Python + Django (backend), React (frontend), Node.js + NestJS (BFF)\n" +
      "Architecture: Front + Back + BFF"
    );
  });

  it("omits the database line when 'Aucune' is selected", () => {
    const result = compileAdvancedBrief({ ...EMPTY, databaseLabel: "Aucune" });
    expect(result).toBe("");
  });

  it("omits empty fields entirely rather than producing blank lines", () => {
    const result = compileAdvancedBrief({ ...EMPTY, architectureLabel: "Monolithe" });
    expect(result).toBe("Architecture: Monolithe");
  });
});
