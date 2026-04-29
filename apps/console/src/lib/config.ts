export interface AppConfig {
  titleText?: string
  footerText?: string
  logoText?: string
  logoSvg?: string
  iconSvg?: string
}

export async function loadConfig(): Promise<AppConfig> {
  try {
    const resp = await fetch("/config.json")
    if (resp.ok) return resp.json() as Promise<AppConfig>
  } catch {
    // config.json is optional; fall back to defaults
  }
  return {}
}
