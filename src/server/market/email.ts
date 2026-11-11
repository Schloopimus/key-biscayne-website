// No email provider is connected yet. Messages are written to the server log so the links can be
// followed during development; `delivered: false` lets the sign-up screen offer the link directly.
export function sendMarketEmail(message: { to: string; subject: string; link: string }) {
  console.info(`[market email — not sent] to ${message.to}: ${message.subject}\n  ${message.link}`)
  return { delivered: false }
}
