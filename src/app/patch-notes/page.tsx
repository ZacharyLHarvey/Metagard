import { getPatchNotes } from "@/lib/queries/spellbook";

export default async function PatchNotesPage() {
  const notes = await getPatchNotes();

  return (
    <main className="p-10 text-white space-y-4">
      <h1 className="text-2xl font-bold">Patch Notes</h1>
      {notes.length === 0 ? (
        <p className="text-neutral-400">No patch notes found in database.</p>
      ) : null}
      {notes.map((note) => (
        <section key={note.id} className="border border-neutral-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold">{note.version}</h2>
          <p className="text-neutral-300 mb-2">{note.title}</p>
          <ul className="list-disc ml-5 text-neutral-400">
            {(note.details ?? []).map((item: string, idx: number) => (
              <li key={`${note.id}-${idx}`}>{item}</li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
