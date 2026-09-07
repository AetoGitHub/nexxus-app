interface BulkUserSchemaMessages {
  companyRequired: string
  userRequired: string
  firstNameRequired: string
  lastNameRequired: string
  emailRequired: string
  emailInvalid: string
  whatsappRequired: string
  usersMin: string
}

export function createBulkUserSchema(messages: BulkUserSchemaMessages) {
  return z.object({
    company: z.number({ error: messages.companyRequired })
      .int()
      .positive(messages.companyRequired),
    users: z.array(z.object({
      username: z.string({ error: messages.userRequired })
        .trim()
        .min(1, messages.userRequired)
        .transform(value => value.toLocaleUpperCase()),
      first_name: z.string({ error: messages.firstNameRequired })
        .trim()
        .min(1, messages.firstNameRequired),
      last_name: z.string({ error: messages.lastNameRequired })
        .trim()
        .min(1, messages.lastNameRequired),
      email: z.string({ error: messages.emailRequired })
        .trim()
        .min(1, messages.emailRequired)
        .email(messages.emailInvalid),
      whatsapp: z.string({ error: messages.whatsappRequired })
        .trim()
        .min(1, messages.whatsappRequired),
    })).min(1, messages.usersMin),
  })
}

export type BulkUserSchema = z.output<ReturnType<typeof createBulkUserSchema>>
