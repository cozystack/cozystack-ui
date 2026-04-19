import logoUrl from "../assets/logo.svg"

interface LogoProps {
  className?: string
  title?: string
}

export function Logo({ className, title = "Cozystack" }: LogoProps) {
  return <img src={logoUrl} alt={title} className={className} />
}
