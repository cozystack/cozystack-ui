import logoUrl from "../assets/logo.svg"

interface LogoProps {
  className?: string
  title?: string
  /** Height in rem. Width scales proportionally from the SVG's 395×150 viewBox. */
  heightRem?: number
}

export function Logo({ className, title = "Cozystack", heightRem = 1.5 }: LogoProps) {
  return (
    <img
      src={logoUrl}
      alt={title}
      className={className}
      style={{ height: `${heightRem}rem`, width: "auto" }}
    />
  )
}
