/** Cameroon's country code, and the length of a national number without it. */
const CAMEROON_PREFIX = "237"
const CAMEROON_NATIONAL_LENGTH = 9

/**
 * The digits `wa.me` needs — international form, no `+`, no spaces.
 *
 * Customers type their number the way they say it: `690 11 90 47`,
 * `+237 690119047`, `00237 690…`. A bare 9-digit number is a Cameroonian
 * national number, and `wa.me` would read it as some other country's code
 * without the prefix. Anything shorter cannot be dialled internationally, so
 * it yields `null` rather than a link that opens the wrong chat.
 */
export function whatsappNumber(phone: string | null | undefined): string | null {
  const digits = (phone ?? "").replace(/\D/g, "").replace(/^00/, "")
  if (digits.length === CAMEROON_NATIONAL_LENGTH) return `${CAMEROON_PREFIX}${digits}`
  return digits.length > CAMEROON_NATIONAL_LENGTH ? digits : null
}

/** A `wa.me` link to the customer, with the message pre-filled when there is one. */
export function whatsappLink(phone: string | null | undefined, text: string): string | null {
  const number = whatsappNumber(phone)
  if (!number) return null
  const message = text.trim()
  return message ? `https://wa.me/${number}?text=${encodeURIComponent(message)}` : `https://wa.me/${number}`
}

export type CameroonPhoneKind = "any" | "mobile"

/**
 * The `+237 XXX XX XX XX` form the backend stores, or `null` when the input is not a
 * Cameroonian number of the wanted kind.
 *
 * Same grammar as `normaliserTelephone` / `normaliserTelephoneDestinataire`
 * (`src/commun/telephone.ts` in nowtech-backend), which rewrite the number before storing it:
 * the panel validates against the value that will actually be saved, so the operator sees the
 * refusal — and the saved form — before the round trip. `mobile` exists because a counter may
 * publish a landline (2XX) to call, but WhatsApp only opens on a mobile (6XX).
 *
 * Not built on `whatsappNumber`, which is lenient on purpose — it drops any `00` and prefixes
 * any nine digits — so a chat opens with whatever a customer typed. Here that leniency read
 * "00695549058" and "237123456" as valid, and the panel would have published an interpretation
 * the backend refuses when typed as is. Only `00237` and `237` are removed, as the backend does.
 */
export function cameroonPhone(raw: string, kind: CameroonPhoneKind): string | null {
  const digits = raw.replace(/\D/g, "")
  const internationalPrefix = `00${CAMEROON_PREFIX}`
  let national = digits
  if (digits.startsWith(internationalPrefix)) national = digits.slice(internationalPrefix.length)
  else if (digits.startsWith(CAMEROON_PREFIX)) national = digits.slice(CAMEROON_PREFIX.length)
  const pattern = kind === "mobile" ? /^6\d{8}$/ : /^[26]\d{8}$/
  if (!pattern.test(national)) return null
  return `+${CAMEROON_PREFIX} ${national.slice(0, 3)} ${national.slice(3, 5)} ${national.slice(5, 7)} ${national.slice(7)}`
}
