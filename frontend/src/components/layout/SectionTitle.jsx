export function SectionTitle({ description, eyebrow, id, title }) {
  return (
    <div className="section-title">
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <h1 id={id}>{title}</h1>
      {description ? <p>{description}</p> : null}
    </div>
  )
}
