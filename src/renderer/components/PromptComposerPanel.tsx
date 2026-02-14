export function PromptComposerPanel(): JSX.Element {
  return (
    <section
      className="panel composer-panel"
      data-testid="prompt-composer-panel"
      aria-label="Prompt composer panel"
    >
      <h2>Prompt Composer</h2>
      <textarea placeholder="Ask Pi to continue…" readOnly value="" />
      <div className="composer-actions">
        <button type="button">Send</button>
        <button type="button">Steer</button>
        <button type="button">Queue</button>
        <button type="button">Abort</button>
      </div>
    </section>
  );
}
