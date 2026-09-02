interface CompanySchemaMessages {
  nameRequired: string
  legalNameRequired: string
  taxRegimeRequired: string
  addressRequired: string
  phoneRequired: string
  contactNameRequired: string
  contactPhoneRequired: string
  contactEmailRequired: string
  contactEmailInvalid: string
}

export function createCompanySchema(messages: CompanySchemaMessages) {
  const requiredText = (message: string) =>
    z.string({ error: message }).trim().min(1, message)

  return z.object({
    name: requiredText(messages.nameRequired),
    razon_social: requiredText(messages.legalNameRequired),
    regimen_fiscal: requiredText(messages.taxRegimeRequired),
    direccion: requiredText(messages.addressRequired),
    telefono: requiredText(messages.phoneRequired),
    contacts: z.array(z.object({
      name: requiredText(messages.contactNameRequired),
      phone: requiredText(messages.contactPhoneRequired),
      email: requiredText(messages.contactEmailRequired)
        .email(messages.contactEmailInvalid),
    })),
  })
}

export type CompanySchema = z.output<ReturnType<typeof createCompanySchema>>
