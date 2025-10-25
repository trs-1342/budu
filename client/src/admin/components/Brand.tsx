type Props = { title?: string; subtitle?: string };

export default function Brand({ title = "BUDU", subtitle = "Admin Panel" }: Props) {
  return (
    <div className="brand" aria-label={`${title} ${subtitle}`}>
      <div className="brand__logo" aria-hidden>BD</div>
      <div>
        <div className="brand__name">{title}</div>
        <small className="brand__sub">{subtitle}</small>
      </div>
    </div>
  );
}
