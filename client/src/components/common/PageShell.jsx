/** Simple centered page scaffold for placeholder / lightweight pages. */
export default function PageShell({ title, description, children }) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">{title}</h1>
      {description && <p className="mt-3 max-w-2xl text-base leading-7 text-gray-600">{description}</p>}
      {children && <div className="mt-8">{children}</div>}
    </section>
  );
}
