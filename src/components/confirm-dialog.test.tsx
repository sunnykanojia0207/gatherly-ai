import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ConfirmDialog } from "./confirm-dialog";

function attribute(tag: string, name: string): string | null {
  const match = tag.match(new RegExp(`\\s${name}="([^"]+)"`));
  return match?.[1] ?? null;
}

describe("ConfirmDialog", () => {
  it("gives each mounted dialog unique title and description IDs", () => {
    const markup = renderToStaticMarkup(
      <>
        <ConfirmDialog
          open
          title="Delete event"
          description="The event will be removed."
          onConfirm={() => {}}
          onCancel={() => {}}
        />
        <ConfirmDialog
          open={false}
          title="Reset demo"
          description="The demo data will be replaced."
          onConfirm={() => {}}
          onCancel={() => {}}
        />
      </>,
    );

    const dialogs = Array.from(markup.matchAll(/<dialog\b([^>]*)>([\s\S]*?)<\/dialog>/g));
    expect(dialogs).toHaveLength(2);

    const relationships = dialogs.map(([, attributes, body]) => ({
      labelledBy: attribute(attributes, "aria-labelledby"),
      describedBy: attribute(attributes, "aria-describedby"),
      titleId: body.match(/<h2 id="([^"]+)"/)?.[1] ?? null,
      descriptionId: body.match(/<p id="([^"]+)"/)?.[1] ?? null,
    }));

    for (const relationship of relationships) {
      expect(relationship.labelledBy).not.toBeNull();
      expect(relationship.describedBy).not.toBeNull();
      expect(relationship.labelledBy).toBe(relationship.titleId);
      expect(relationship.describedBy).toBe(relationship.descriptionId);
    }

    const ids = relationships.flatMap((relationship) => [
      relationship.labelledBy,
      relationship.describedBy,
    ]);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
