import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AssetUploadGrid from "@/components/asset-upload-grid";

const ASSETS = [
  { id: "a1", filename: "mockup.png", content_type: "image/png", size_bytes: 1024, created_at: "2026-01-01T00:00:00Z" },
  { id: "a2", filename: "notes.pdf", content_type: "application/pdf", size_bytes: 2048, created_at: "2026-01-01T00:00:00Z" },
];

describe("AssetUploadGrid", () => {
  it("renders an image thumbnail for image assets and a filename chip for non-images", () => {
    render(
      <AssetUploadGrid
        assets={ASSETS}
        onUpload={vi.fn()}
        contentUrl={(id) => `https://example.com/${id}`}
        uploading={false}
      />
    );
    const img = screen.getByRole("img", { name: /mockup\.png/i });
    expect(img).toHaveAttribute("src", "https://example.com/a1");
    expect(screen.getByText("notes.pdf")).toBeInTheDocument();
  });

  it("calls onUpload with each selected file", () => {
    const onUpload = vi.fn();
    render(<AssetUploadGrid assets={[]} onUpload={onUpload} contentUrl={() => ""} uploading={false} />);

    const file1 = new File(["a"], "one.png", { type: "image/png" });
    const file2 = new File(["b"], "two.png", { type: "image/png" });
    const input = screen.getByLabelText(/ajouter un fichier/i);
    fireEvent.change(input, { target: { files: [file1, file2] } });

    expect(onUpload).toHaveBeenCalledWith(file1);
    expect(onUpload).toHaveBeenCalledWith(file2);
    expect(onUpload).toHaveBeenCalledTimes(2);
  });

  it("disables the upload input while uploading", () => {
    render(<AssetUploadGrid assets={[]} onUpload={vi.fn()} contentUrl={() => ""} uploading={true} />);
    expect(screen.getByLabelText(/ajouter un fichier/i)).toBeDisabled();
  });

  it("renders nothing in the grid when there are no assets, but keeps the upload control", () => {
    render(<AssetUploadGrid assets={[]} onUpload={vi.fn()} contentUrl={() => ""} uploading={false} />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByLabelText(/ajouter un fichier/i)).toBeInTheDocument();
  });
});
