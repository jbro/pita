export function CommandPalettePlaceholder(): JSX.Element {
  return (
    <aside
      className="panel palette-placeholder"
      data-testid="command-palette-placeholder"
      aria-label="Command palette placeholder"
    >
      <h2>Command Palette</h2>
      <p>Coming in Phase 2 · Press Cmd/Ctrl+K</p>
    </aside>
  );
}
